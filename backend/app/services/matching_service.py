"""
Deterministic + Semantic Hybrid Match Engine.
Complies with Sections 23–26, 30–35, and 100–101 of the Master Build Specification:
- Isolated scoring module (Section 100)
- Deterministic weighted required & preferred skill coverage (Section 23)
- Semantic cosine similarity via 384-d Sentence Transformers (Section 24)
- Evidence credibility & section weighting (Section 25)
- Score versioning (Section 101, v1.0)
- Fully explainable breakdowns (no raw black-box LLM decisions)
"""

import logging
from typing import List, Optional, Dict, Set, Tuple
from datetime import datetime, timezone

from app.models.drive import Drive, RequirementType, DriveSkill
from app.models.resume import ResumeAnalysis, SkillEvidence
from app.models.profile import StudentProfile
from app.models.matching import (
    SkillMatchDetail,
    MatchComponentScores,
    MatchEvaluationResult,
)
from app.services.canonical_skills import resolve_skill_alias, CANONICAL_SKILLS
from app.services.embedding_service import (
    generate_embedding,
    compute_similarity,
)

logger = logging.getLogger("hirelens.matching")

SCORE_VERSION = "v1.0"

# Default Weights (Section 100: configurable weights)
DEFAULT_WEIGHTS = {
    "required": 0.40,
    "semantic": 0.25,
    "evidence": 0.20,
    "preferred": 0.15,
}

ASSESSMENT_WEIGHTS = {
    "required": 0.30,
    "assessment": 0.25,
    "semantic": 0.20,
    "evidence": 0.15,
    "preferred": 0.10,
}


class MatchingEngine:
    """
    Isolated candidate matching engine implementing multi-factor
    deterministic, semantic, and evidence-weighted evaluations.
    """

    @classmethod
    def build_drive_text_representation(cls, drive: Drive) -> str:
        """
        Constructs a structured text representation of the job drive
        for semantic embedding generation and cosine comparison.
        """
        required_skills = [
            s.name for s in drive.skills if s.requirement_type == RequirementType.REQUIRED
        ]
        preferred_skills = [
            s.name for s in drive.skills if s.requirement_type == RequirementType.PREFERRED
        ]

        parts = [
            f"Job Title: {drive.job_title}",
            f"Company: {drive.company_name}",
            f"Location: {drive.location} ({drive.employment_type})",
            f"Required Skills: {', '.join(required_skills) if required_skills else 'None specified'}",
            f"Preferred Skills: {', '.join(preferred_skills) if preferred_skills else 'None specified'}",
            f"Job Description: {drive.description}",
        ]
        return "\n".join(parts)

    @classmethod
    def _normalize_skill_token(cls, term: str) -> str:
        """Normalizes a raw skill name or canonical skill to lower stripped token."""
        alias = resolve_skill_alias(term)
        if alias:
            return alias.lower()
        return term.strip().lower()

    @classmethod
    def compute_skill_matches(
        cls,
        drive_skills: List[DriveSkill],
        resume_canonical_skills: List[str],
        evidence_items: List[SkillEvidence],
        profile: Optional[StudentProfile] = None,
    ) -> Tuple[
        List[SkillMatchDetail],
        List[SkillMatchDetail],
        List[SkillMatchDetail],
        List[SkillMatchDetail],
    ]:
        """
        Compares recruiter requirements against student skills & evidence.
        Returns:
            (matched_required, missing_required, matched_preferred, missing_preferred)
        """
        # Build normalized candidate skill set
        candidate_skills_norm: Dict[str, str] = {}
        for s in resume_canonical_skills:
            norm = cls._normalize_skill_token(s)
            candidate_skills_norm[norm] = s

        # Also incorporate verified skills from profile if available
        if profile and profile.skills:
            for p_skill in profile.skills:
                norm = cls._normalize_skill_token(p_skill.name)
                if norm not in candidate_skills_norm:
                    candidate_skills_norm[norm] = p_skill.name

        # Index evidence by normalized skill
        evidence_by_skill: Dict[str, List[SkillEvidence]] = {}
        for ev in evidence_items:
            norm_c = cls._normalize_skill_token(ev.canonical_name)
            evidence_by_skill.setdefault(norm_c, []).append(ev)
            norm_s = cls._normalize_skill_token(ev.skill_name)
            if norm_s != norm_c:
                evidence_by_skill.setdefault(norm_s, []).append(ev)

        matched_required: List[SkillMatchDetail] = []
        missing_required: List[SkillMatchDetail] = []
        matched_preferred: List[SkillMatchDetail] = []
        missing_preferred: List[SkillMatchDetail] = []

        for ds in drive_skills:
            norm_req = cls._normalize_skill_token(ds.canonical_name or ds.name)
            is_matched = norm_req in candidate_skills_norm

            # Search evidence
            ev_list = evidence_by_skill.get(norm_req, [])
            best_ev = None
            if ev_list:
                # Prioritize evidence from projects or experience over simple skills list
                def ev_priority(e: SkillEvidence) -> Tuple[int, float]:
                    sec = (e.section or "").lower()
                    if "project" in sec or "experience" in sec or "intern" in sec:
                        priority = 3
                    elif "education" in sec or "cert" in sec:
                        priority = 2
                    else:
                        priority = 1
                    return (priority, e.confidence)

                sorted_ev = sorted(ev_list, key=ev_priority, reverse=True)
                best_ev = sorted_ev[0]

            detail = SkillMatchDetail(
                skill_name=ds.name,
                canonical_name=ds.canonical_name or ds.name,
                requirement_type=ds.requirement_type,
                weight=ds.weight,
                is_matched=is_matched,
                evidence_found=best_ev is not None,
                evidence_snippet=best_ev.snippet if best_ev else None,
                evidence_section=best_ev.section if best_ev else None,
                confidence=round(best_ev.confidence, 2) if best_ev else (0.75 if is_matched else 0.0),
            )

            if ds.requirement_type == RequirementType.REQUIRED:
                if is_matched:
                    matched_required.append(detail)
                else:
                    missing_required.append(detail)
            else:
                if is_matched:
                    matched_preferred.append(detail)
                else:
                    missing_preferred.append(detail)

        return matched_required, missing_required, matched_preferred, missing_preferred

    @classmethod
    def compute_weighted_skill_score(
        cls,
        matched: List[SkillMatchDetail],
        missing: List[SkillMatchDetail],
    ) -> float:
        """
        Calculates weighted match coverage percentage:
        Sum(weight of matched) / Sum(weight of all) * 100
        """
        total_weight = sum(item.weight for item in matched) + sum(item.weight for item in missing)
        if total_weight == 0:
            return 100.0  # If no skills defined in category, grant full marks
        matched_weight = sum(item.weight for item in matched)
        score = (matched_weight / total_weight) * 100.0
        return round(score, 2)

    @classmethod
    def compute_semantic_score(
        cls,
        drive: Drive,
        resume: ResumeAnalysis,
    ) -> float:
        """
        Computes cosine similarity between job requirements embedding
        and candidate resume 384-dimensional embedding.
        Scales cosine similarity to a 0.0 - 100.0 score.
        """
        emb = getattr(resume, "embedding_vector", None) or getattr(resume, "embedding", None)
        if not emb or len(emb) == 0:
            logger.info("Resume has no embedding vector; fallback to baseline 50.0")
            return 50.0

        try:
            drive_text = cls.build_drive_text_representation(drive)
            drive_embedding = generate_embedding(drive_text)
            similarity = compute_similarity(drive_embedding, emb)

            # Cosine similarity for normalized vectors ranges from -1.0 to 1.0.
            # For technical resumes vs jobs, meaningful similarity is typically between 0.15 and 0.85.
            # We scale positive similarity linearly to 0 - 100:
            raw_score = max(0.0, min(1.0, similarity)) * 100.0
            return round(raw_score, 2)
        except Exception as e:
            logger.warning(f"Error computing semantic embedding similarity: {e}")
            return 50.0

    @classmethod
    def compute_evidence_score(
        cls,
        matched_skills: List[SkillMatchDetail],
    ) -> float:
        """
        Evaluates the credibility of candidate's matched skills based on
        evidence source sections (Projects/Experience vs plain lists).
        """
        if not matched_skills:
            return 0.0

        scores: List[float] = []
        for s in matched_skills:
            if not s.evidence_found:
                # Matched via profile or list without explicit PDF snippet citation
                scores.append(50.0)
                continue

            sec = (s.evidence_section or "").lower()
            if any(k in sec for k in ["project", "experience", "internship", "work"]):
                sec_multiplier = 1.0
            elif any(k in sec for k in ["cert", "course", "education", "degree"]):
                sec_multiplier = 0.85
            else:
                sec_multiplier = 0.65

            conf = s.confidence if s.confidence > 0 else 0.80
            item_score = min(100.0, conf * sec_multiplier * 100.0)
            scores.append(item_score)

        return round(sum(scores) / len(scores), 2)

    @classmethod
    def evaluate_match(
        cls,
        drive: Drive,
        resume: ResumeAnalysis,
        student_profile: Optional[StudentProfile] = None,
        application_id: Optional[str] = None,
        assessment_score: Optional[float] = None,
    ) -> MatchEvaluationResult:
        """
        Executes the multi-factor hybrid candidate evaluation pipeline.
        Produces deterministic, explainable, versioned results.
        """
        # 1. Skill Matches
        matched_req, missing_req, matched_pref, missing_pref = cls.compute_skill_matches(
            drive_skills=drive.skills,
            resume_canonical_skills=resume.canonical_skills,
            evidence_items=resume.evidence_items,
            profile=student_profile,
        )

        # 2. Category Scores
        req_score = cls.compute_weighted_skill_score(matched_req, missing_req)
        pref_score = cls.compute_weighted_skill_score(matched_pref, missing_pref)
        sem_score = cls.compute_semantic_score(drive, resume)
        ev_score = cls.compute_evidence_score(matched_req + matched_pref)

        # 3. Overall Composite Score
        if assessment_score is not None:
            weights = ASSESSMENT_WEIGHTS
            overall = (
                (req_score * weights["required"])
                + (assessment_score * weights["assessment"])
                + (sem_score * weights["semantic"])
                + (ev_score * weights["evidence"])
                + (pref_score * weights["preferred"])
            )
        else:
            weights = DEFAULT_WEIGHTS
            overall = (
                (req_score * weights["required"])
                + (sem_score * weights["semantic"])
                + (ev_score * weights["evidence"])
                + (pref_score * weights["preferred"])
            )

        overall = round(max(0.0, min(100.0, overall)), 2)

        # 4. Recommendation Classification
        if overall >= 80.0:
            recommendation = "STRONG_FIT"
        elif overall >= 65.0:
            recommendation = "GOOD_FIT"
        elif overall >= 50.0:
            recommendation = "PARTIAL_FIT"
        else:
            recommendation = "LOW_FIT"

        # 5. Explainability Summaries
        matched_req_names = [m.skill_name for m in matched_req]
        missing_req_names = [m.skill_name for m in missing_req]

        if len(missing_req) == 0 and len(drive.skills) > 0:
            semantic_summary = (
                f"Candidate covers 100% of required skills ({', '.join(matched_req_names)}) "
                f"with {sem_score}% semantic domain relevance to {drive.job_title}."
            )
        elif len(missing_req) > 0:
            semantic_summary = (
                f"Candidate demonstrates {sem_score}% semantic relevance. Missing {len(missing_req)} required "
                f"skill(s): {', '.join(missing_req_names)}."
            )
        else:
            semantic_summary = f"Candidate aligns with {sem_score}% semantic relevance to role specifications."

        # Evidence Summary
        verified_in_projects = sum(
            1
            for m in (matched_req + matched_pref)
            if m.evidence_found
            and any(k in (m.evidence_section or "").lower() for k in ["project", "experience", "intern"])
        )
        total_matched = len(matched_req) + len(matched_pref)
        evidence_summary = (
            f"{verified_in_projects} of {total_matched} matched skill(s) are actively backed by practical "
            f"project or experience citations (Evidence Quality: {ev_score}%)."
        )

        component_scores = MatchComponentScores(
            required_skill_score=req_score,
            preferred_skill_score=pref_score,
            semantic_score=sem_score,
            evidence_score=ev_score,
            assessment_score=assessment_score,
            overall_score=overall,
        )

        return MatchEvaluationResult(
            application_id=application_id,
            drive_id=drive.id,
            student_id=resume.user_id,
            scores=component_scores,
            score_version=SCORE_VERSION,
            weights_used=weights,
            matched_required_skills=matched_req,
            missing_required_skills=missing_req,
            matched_preferred_skills=matched_pref,
            missing_preferred_skills=missing_pref,
            semantic_summary=semantic_summary,
            evidence_summary=evidence_summary,
            recommendation=recommendation,
            evaluated_at=datetime.now(timezone.utc),
        )
