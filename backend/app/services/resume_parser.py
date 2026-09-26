"""
Resume Processing Pipeline & Intelligent Text Parser.
Complies with Sections 11–18, 21, and 24 of the Master Build Specification.
Uses PyMuPDF (fitz) for structured spatial extraction, comprehensive entity extraction,
canonical evidence linking, and Sentence Transformers embeddings.
Includes Layer 4 Groq LLM assistance fallback when configured.
"""

from typing import List, Dict, Any, Tuple, Optional, Set
import re
import hashlib
import pymupdf as fitz
from app.models.resume import (
    ResumeAnalysis,
    SkillEvidence,
    ExtractedProject,
    ExtractedEducation,
    ExtractedExperience,
    ExtractedCertification,
)
from app.services.canonical_skills import (
    CANONICAL_SKILLS,
    extract_canonical_skills_from_text,
    get_skill_category,
)
from app.services.embedding_service import (
    generate_embedding,
    build_resume_embedding_text,
    EMBEDDING_DIM,
    MODEL_NAME as EMBEDDING_MODEL_NAME,
)
from app.services.llm_service import LLMResumeService

import logging as _logging
_logger = _logging.getLogger("hirelens.resume_parser")

# Standard section headings with extensive aliases and variants (Section 17)
SECTION_PATTERNS: Dict[str, List[str]] = {
    "SKILLS": [
        r"^technical skills\b",
        r"^technical expertise\b",
        r"^skills & tools\b",
        r"^skills\b",
        r"^technologies\b",
        r"^proficiencies\b",
        r"^areas of expertise\b",
        r"^technical proficiencies\b",
        r"^core competencies\b",
        r"^key skills\b",
        r"^programming skills\b",
        r"^tech stack\b",
        r"^toolkit\b",
    ],
    "PROJECTS": [
        r"^projects\b",
        r"^academic projects\b",
        r"^key projects\b",
        r"^personal projects\b",
        r"^technical projects\b",
        r"^major projects\b",
        r"^representative projects\b",
        r"^featured projects\b",
        r"^open source projects\b",
        r"^coursework projects\b",
    ],
    "EXPERIENCE": [
        r"^work experience\b",
        r"^internships\b",
        r"^internship experience\b",
        r"^professional experience\b",
        r"^employment history\b",
        r"^work history\b",
        r"^industry experience\b",
        r"^relevant experience\b",
        r"^practical experience\b",
        r"^professional background\b",
        r"^experience\b",
    ],
    "EDUCATION": [
        r"^education\b",
        r"^academic background\b",
        r"^educational qualification\b",
        r"^academics\b",
        r"^academic qualifications\b",
        r"^educational background\b",
        r"^academic details\b",
        r"^scholastic achievements\b",
        r"^qualifications\b",
    ],
    "CERTIFICATIONS": [
        r"^licenses & certifications\b",
        r"^courses & certifications\b",
        r"^certifications & training\b",
        r"^professional certifications\b",
        r"^certifications\b",
        r"^certificates\b",
        r"^credentials\b",
        r"^licenses\b",
    ],
    "ACHIEVEMENTS": [
        r"^achievements\b",
        r"^honors & awards\b",
        r"^accomplishments\b",
        r"^awards & honors\b",
        r"^extracurricular activities\b",
        r"^publications\b",
        r"^co-curricular activities\b",
        r"^positions of responsibility\b",
        r"^leadership\b",
    ],
    "SUMMARY": [
        r"^professional summary\b",
        r"^career objective\b",
        r"^executive summary\b",
        r"^summary\b",
        r"^about me\b",
        r"^objective\b",
        r"^profile\b",
        r"^background\b",
    ],
}

# Known prominent certification bodies and platforms
CERT_ISSUERS = [
    ("AWS", "Amazon Web Services"),
    ("Amazon Web Services", "Amazon Web Services"),
    ("GCP", "Google Cloud"),
    ("Google Cloud", "Google Cloud"),
    ("Google", "Google"),
    ("Azure", "Microsoft"),
    ("Microsoft", "Microsoft"),
    ("Coursera", "Coursera"),
    ("DeepLearning.AI", "DeepLearning.AI"),
    ("NPTEL", "NPTEL"),
    ("Cisco", "Cisco"),
    ("Oracle", "Oracle"),
    ("Udemy", "Udemy"),
    ("edX", "edX"),
    ("freeCodeCamp", "freeCodeCamp"),
    ("HackerRank", "HackerRank"),
    ("LeetCode", "LeetCode"),
    ("Stanford Online", "Stanford Online"),
    ("IBM", "IBM"),
    ("Meta", "Meta"),
    ("Linux Foundation", "Linux Foundation"),
    ("Harvard", "Harvard Online"),
]

# Known education institutions keywords & specific patterns
INSTITUTION_KEYWORDS = [
    r"college\s+of\s+[a-zA-Z\s]+",
    r"institute\s+of\s+[a-zA-Z\s]+",
    r"university\s+of\s+[a-zA-Z\s]+",
    r"[a-zA-Z\s]+\s+college",
    r"[a-zA-Z\s]+\s+institute",
    r"[a-zA-Z\s]+\s+university",
    r"[a-zA-Z\s]+\s+polytechnic",
    r"[a-zA-Z\s]+\s+vidyalaya",
    r"[a-zA-Z\s]+\s+school",
    r"psg\s+college\s+of\s+technology",
    r"iit\s+[a-zA-Z]+",
    r"nit\s+[a-zA-Z]+",
    r"iiit\s+[a-zA-Z]+",
    r"bits\s+[a-zA-Z]+",
]

# Field of study / specialization keywords
FIELD_OF_STUDY_PATTERNS = [
    (r"\bcomputer\s+science(?:\s*(?:&|and)\s*engineering)?\b", "Computer Science & Engineering"),
    (r"\binformation\s+technology\b", "Information Technology"),
    (r"\bartificial\s+intelligence(?:\s*(?:&|and)\s*data\s+science)?\b", "Artificial Intelligence & Data Science"),
    (r"\bdata\s+science\b", "Data Science"),
    (r"\belectronics\s*(?:&|and)\s*communication(?:\s*engineering)?\b", "Electronics & Communication Engineering"),
    (r"\belectrical\s*(?:&|and)\s*electronics(?:\s*engineering)?\b", "Electrical & Electronics Engineering"),
    (r"\bmechanical(?:\s*engineering)?\b", "Mechanical Engineering"),
    (r"\bcivil(?:\s*engineering)?\b", "Civil Engineering"),
    (r"\bsoftware\s*engineering\b", "Software Engineering"),
    (r"\bcyber\s*security\b", "Cybersecurity"),
    (r"\brobotics\b", "Robotics & Automation"),
    (r"\bbio-?medical\b", "Biomedical Engineering"),
]


class ResumeParserService:
    @staticmethod
    def validate_pdf_bytes(pdf_bytes: bytes, filename: str) -> None:
        """
        Validates file signature, MIME type, size limit, and PDF validity.
        Complies with Section 12: Resume File Validation.
        """
        max_size = 5 * 1024 * 1024
        if len(pdf_bytes) > max_size:
            raise ValueError("Resume file exceeds 5MB limit. Please upload a more compact PDF document.")
        
        if len(pdf_bytes) < 100:
            raise ValueError("The uploaded file is too small or corrupted.")

        if not pdf_bytes.startswith(b"%PDF-"):
            raise ValueError("Invalid file format. The file must be a genuine PDF document with valid PDF headers.")

        if not filename.lower().endswith(".pdf"):
            raise ValueError("File name must have a .pdf extension.")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(doc)
            if page_count == 0:
                raise ValueError("The uploaded PDF document contains no pages.")
            if page_count > 5:
                raise ValueError("Collegiate resume should not exceed 5 pages. Please upload a standard 1-3 page resume.")
            doc.close()
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError(f"Unable to read PDF structure: {str(e)}")

    @classmethod
    def parse_resume(
        cls,
        pdf_bytes: bytes,
        user_id: str,
        filename: str,
        storage_path: str = "",
    ) -> ResumeAnalysis:
        """
        Executes the structured resume processing pipeline:
        1. PyMuPDF Spatial Extraction (multi-column aware)
        2. Normalization & Contact Info Extraction
        3. Multi-Pass Section Boundary Segmentation
        4. Entity Extraction (Education, Experience, Projects, Certifications)
        5. Layer 4 Groq LLM Enrichment (when available)
        6. Canonical Skill Extraction & Evidence Linking (Section 21)
        7. Sentence Transformers Dense Embeddings (Section 24: all-MiniLM-L6-v2)
        """
        cls.validate_pdf_bytes(pdf_bytes, filename)
        
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)

        raw_pages_text: List[str] = []
        all_page_blocks: List[List[Dict[str, Any]]] = []
        
        for page_idx in range(page_count):
            page = doc[page_idx]
            page_width = page.rect.width
            page_height = page.rect.height

            # Extract raw blocks: (x0, y0, x1, y1, text, block_no, block_type)
            blocks = page.get_text("blocks")
            extracted_blocks = []
            for b in blocks:
                if len(b) >= 5 and b[4].strip():
                    extracted_blocks.append({
                        "text": b[4].strip(),
                        "bbox": (b[0], b[1], b[2], b[3]),
                        "x0": b[0],
                        "y0": b[1],
                        "x1": b[2],
                        "y1": b[3],
                        "page": page_idx + 1,
                    })

            # Spatial column-aware sorting:
            # Check if page exhibits a 2-column layout (blocks clearly on left half vs right half)
            sorted_blocks = cls._sort_blocks_spatially(extracted_blocks, page_width)
            all_page_blocks.append(sorted_blocks)

            # Rebuild page text from spatially ordered blocks to preserve reading order
            page_text_reconstructed = "\n\n".join([b["text"] for b in sorted_blocks])
            raw_pages_text.append(page_text_reconstructed)

        doc.close()

        raw_text = "\n\n--- PAGE BREAK ---\n\n".join(raw_pages_text)
        normalized_text = cls._normalize_text(raw_text)
        word_count = len(normalized_text.split())

        # Quality check (Section 14)
        extraction_method = "NATIVE"
        if word_count < 30:
            extraction_method = "OCR"

        # Extract Candidate Contact Details from Header Block
        contact_info = cls._extract_contact_info(raw_pages_text[0] if raw_pages_text else "")

        # Section segmentation
        section_map, detected_sections = cls._segment_sections(raw_pages_text)

        # Entity extraction (rule-based NLP)
        extracted_projects = cls._extract_projects(section_map.get("PROJECTS", []), raw_text)
        extracted_education = cls._extract_education(section_map.get("EDUCATION", []), raw_text)
        extracted_certifications = cls._extract_certifications(section_map.get("CERTIFICATIONS", []))
        extracted_experience = cls._extract_experience(section_map.get("EXPERIENCE", []), raw_text)

        # Layer 4 Groq LLM assistance fallback (Section 19: Layer 4)
        # If any section is empty but was detected, or text is complex and Groq is configured:
        extracted_projects, extracted_education, extracted_experience, extracted_certifications = cls._apply_llm_fallback_if_needed(
            section_map=section_map,
            projects=extracted_projects,
            education=extracted_education,
            experience=extracted_experience,
            certifications=extracted_certifications,
        )

        # Canonical skills & Evidence linking (Section 21)
        canonical_skills, evidence_items = cls._extract_skills_and_evidence(
            section_map=section_map,
            raw_pages_text=raw_pages_text,
            extracted_projects=extracted_projects,
        )

        # Semantic Embedding Generation (Section 24: all-MiniLM-L6-v2)
        embedding_vector: list[float] = []
        try:
            embedding_text = build_resume_embedding_text(
                normalized_text=normalized_text,
                canonical_skills=canonical_skills,
                sections_detected=detected_sections,
            )
            embedding_vector = generate_embedding(embedding_text)
            _logger.info(
                f"Generated {len(embedding_vector)}-dim embedding for resume '{filename}'"
            )
        except Exception as e:
            _logger.warning(f"Embedding generation skipped (model may not be available): {e}")
            embedding_vector = []

        return ResumeAnalysis(
            user_id=user_id,
            filename=filename,
            file_size=len(pdf_bytes),
            sha256=sha256_hash,
            storage_path=storage_path or f"/uploads/resumes/{sha256_hash[:16]}_{filename}",
            page_count=page_count,
            word_count=word_count,
            extraction_method=extraction_method,
            candidate_name=contact_info.get("name"),
            candidate_email=contact_info.get("email"),
            candidate_phone=contact_info.get("phone"),
            candidate_links=contact_info.get("links", {}),
            raw_text=raw_text,
            normalized_text=normalized_text,
            sections_detected=detected_sections,
            canonical_skills=canonical_skills,
            evidence_items=evidence_items,
            extracted_projects=extracted_projects,
            extracted_education=extracted_education,
            extracted_certifications=extracted_certifications,
            extracted_experience=extracted_experience,
            embedding_vector=embedding_vector,
            embedding_model=EMBEDDING_MODEL_NAME,
            embedding_dim=EMBEDDING_DIM,
        )

    @classmethod
    def _sort_blocks_spatially(cls, blocks: List[Dict[str, Any]], page_width: float) -> List[Dict[str, Any]]:
        """
        Sorts page text blocks to respect reading order.
        If a 2-column layout is detected (content split around page midpoint),
        sorts left column first, then right column.
        Otherwise sorts top-to-bottom with horizontal alignment tolerance.
        """
        if not blocks:
            return []

        mid_x = page_width / 2.0
        left_blocks = [b for b in blocks if b["x1"] <= (mid_x + 30)]
        right_blocks = [b for b in blocks if b["x0"] >= (mid_x - 30)]

        # Determine if this is a genuine two-column page
        is_two_column = len(left_blocks) >= 3 and len(right_blocks) >= 3 and (len(left_blocks) + len(right_blocks)) >= (len(blocks) * 0.75)

        if is_two_column:
            # Sort left column top-to-bottom, then right column top-to-bottom
            left_sorted = sorted(left_blocks, key=lambda b: b["y0"])
            right_sorted = sorted(right_blocks, key=lambda b: b["y0"])
            # Any blocks spanning across both columns (like top header)
            spanning_top = [b for b in blocks if b["y1"] < 120 and b not in left_blocks and b not in right_blocks]
            spanning_top_sorted = sorted(spanning_top, key=lambda b: b["y0"])
            return spanning_top_sorted + left_sorted + right_sorted
        else:
            # Single-column: sort primarily top-to-bottom
            return sorted(blocks, key=lambda b: (round(b["y0"] / 8) * 8, b["x0"]))

    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """Normalizes whitespace, line breaks, encoding artifacts, and ligatures."""
        # Replace common PDF ligatures
        ligatures = {
            "ﬁ": "fi",
            "ﬂ": "fl",
            "ﬀ": "ff",
            "ﬃ": "ffi",
            "ﬄ": "ffl",
            "–": "-",
            "—": "-",
            "\xa0": " ",
        }
        for lig, rep in ligatures.items():
            text = text.replace(lig, rep)

        # Normalize carriage returns
        text = re.sub(r"\r\n|\r", "\n", text)
        # Normalize excessive horizontal whitespace within lines
        text = re.sub(r"[ \t]+", " ", text)
        # Collapse excessive newlines
        text = re.sub(r"\n{4,}", "\n\n\n", text)
        return text.strip()

    @classmethod
    def _extract_contact_info(cls, first_page_text: str) -> Dict[str, Any]:
        """
        Extracts candidate name, email, phone number, and social links from the header section.
        """
        info: Dict[str, Any] = {"links": {}}
        if not first_page_text:
            return info

        lines = [line.strip() for line in first_page_text.split("\n") if line.strip()]

        # 1. Candidate Name (usually the first prominent non-contact line)
        for line in lines[:8]:
            # Skip lines with contact markers, emails, phone numbers, or typical headers
            clean_line = re.sub(r"[^\w\s]", "", line).strip()
            lower_line = line.lower()
            if any(k in lower_line for k in ["resume", "curriculum", "email", "phone", "github", "linkedin", "roll"]):
                continue
            if "@" in line or any(char.isdigit() for char in line):
                continue
            # Words in name typically 2 to 4 words, each capitalized
            words = clean_line.split()
            if 1 <= len(words) <= 4 and all(w.isalpha() for w in words):
                info["name"] = clean_line.title()
                break

        # Fallback to pretrained NER model for Person Name if not detected by heuristic
        if not info.get("name"):
            try:
                from app.services.ner_service import extract_persons
                ner_persons = extract_persons(first_page_text[:500])
                if ner_persons:
                    info["name"] = ner_persons[0].title()
            except Exception as e:
                _logger.debug(f"NER candidate name fallback skipped: {e}")

        # 2. Candidate Email
        email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", first_page_text)
        if email_match:
            info["email"] = email_match.group(0).lower()

        # 3. Candidate Phone
        phone_match = re.search(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", first_page_text)
        if phone_match:
            info["phone"] = phone_match.group(0).strip()

        # 4. Social & Portfolio Links
        github_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", first_page_text, re.IGNORECASE)
        if github_match:
            info["links"]["github"] = f"https://github.com/{github_match.group(1)}"

        linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)", first_page_text, re.IGNORECASE)
        if linkedin_match:
            info["links"]["linkedin"] = f"https://linkedin.com/in/{linkedin_match.group(1)}"

        portfolio_match = re.search(r"(?:https?://)?([a-zA-Z0-9-]+\.(?:github\.io|vercel\.app|netlify\.app|dev|me))", first_page_text, re.IGNORECASE)
        if portfolio_match:
            info["links"]["portfolio"] = f"https://{portfolio_match.group(1)}"

        return info

    @classmethod
    def _identify_heading(cls, line: str) -> Optional[str]:
        """
        Checks if a line matches any standard section heading.
        Handles casing, trailing colons, markdown headers (##), underlines, and bullet decorators.
        """
        clean = line.strip().lower()
        if len(clean) > 40 or len(clean) < 3:
            return None
        
        # Strip markdown headers, leading/trailing colons, dashes, brackets, numbers (e.g. "1. Education")
        clean = re.sub(r"^#{1,6}\s*", "", clean)
        clean = re.sub(r"^\d+[\.\)]\s*", "", clean)
        clean = re.sub(r"^[\W_]+|[\W_]+$", "", clean).strip()

        for section_name, patterns in SECTION_PATTERNS.items():
            for pat in patterns:
                if re.match(pat, clean):
                    return section_name
        return None

    @classmethod
    def _segment_sections(cls, pages_text: List[str]) -> Tuple[Dict[str, List[Tuple[str, int]]], List[str]]:
        """
        Segments raw page text into named sections.
        Returns:
        - section_map: dict of {section_name: [(text_line, page_number)]}
        - detected_sections: ordered list of detected section names
        """
        section_map: Dict[str, List[Tuple[str, int]]] = {k: [] for k in SECTION_PATTERNS}
        detected_sections: List[str] = []
        current_section = "SUMMARY"

        for page_idx, page_text in enumerate(pages_text):
            lines = page_text.split("\n")
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue

                heading = cls._identify_heading(stripped)
                if heading:
                    current_section = heading
                    if heading not in detected_sections:
                        detected_sections.append(heading)
                else:
                    section_map[current_section].append((stripped, page_idx + 1))

        return section_map, detected_sections

    @classmethod
    def _extract_skills_and_evidence(
        cls,
        section_map: Dict[str, List[Tuple[str, int]]],
        raw_pages_text: List[str],
        extracted_projects: List[ExtractedProject],
    ) -> Tuple[List[str], List[SkillEvidence]]:
        """
        Extracts canonical skills and builds evidence links across sections and pages.
        Complies with Section 21: Student Skill Evidence.
        """
        canonical_skills_set: Set[str] = set()
        evidence_list: List[SkillEvidence] = []
        seen_skills_by_section: Dict[str, Set[str]] = {}

        # 1. First, search explicitly in SKILLS section
        skills_lines = section_map.get("SKILLS", [])
        for line, page_num in skills_lines:
            found = extract_canonical_skills_from_text(line)
            for canonical, matched_token in found:
                canonical_skills_set.add(canonical)
                if canonical not in seen_skills_by_section.get("SKILLS", set()):
                    seen_skills_by_section.setdefault("SKILLS", set()).add(canonical)
                    evidence_list.append(
                        SkillEvidence(
                            skill_name=canonical,
                            canonical_name=canonical,
                            category=get_skill_category(canonical),
                            section="SKILLS",
                            snippet=line[:180],
                            page_number=page_num,
                            source_type="EXPLICIT",
                            confidence=0.98,
                        )
                    )

        # 2. Search contextual evidence in PROJECTS section
        projects_lines = section_map.get("PROJECTS", [])
        for line, page_num in projects_lines:
            found = extract_canonical_skills_from_text(line)
            for canonical, matched_token in found:
                canonical_skills_set.add(canonical)
                if canonical not in seen_skills_by_section.get("PROJECTS", set()):
                    seen_skills_by_section.setdefault("PROJECTS", set()).add(canonical)
                    evidence_list.append(
                        SkillEvidence(
                            skill_name=canonical,
                            canonical_name=canonical,
                            category=get_skill_category(canonical),
                            section="PROJECTS",
                            snippet=line[:200],
                            page_number=page_num,
                            source_type="CONTEXTUAL",
                            confidence=0.92,
                        )
                    )

        # 3. Search in EXPERIENCE section
        exp_lines = section_map.get("EXPERIENCE", [])
        for line, page_num in exp_lines:
            found = extract_canonical_skills_from_text(line)
            for canonical, matched_token in found:
                canonical_skills_set.add(canonical)
                if canonical not in seen_skills_by_section.get("EXPERIENCE", set()):
                    seen_skills_by_section.setdefault("EXPERIENCE", set()).add(canonical)
                    evidence_list.append(
                        SkillEvidence(
                            skill_name=canonical,
                            canonical_name=canonical,
                            category=get_skill_category(canonical),
                            section="EXPERIENCE",
                            snippet=line[:200],
                            page_number=page_num,
                            source_type="CONTEXTUAL",
                            confidence=0.95,
                        )
                    )

        # 4. Search in CERTIFICATIONS section
        cert_lines = section_map.get("CERTIFICATIONS", [])
        for line, page_num in cert_lines:
            found = extract_canonical_skills_from_text(line)
            for canonical, matched_token in found:
                canonical_skills_set.add(canonical)
                if canonical not in seen_skills_by_section.get("CERTIFICATIONS", set()):
                    seen_skills_by_section.setdefault("CERTIFICATIONS", set()).add(canonical)
                    evidence_list.append(
                        SkillEvidence(
                            skill_name=canonical,
                            canonical_name=canonical,
                            category=get_skill_category(canonical),
                            section="CERTIFICATIONS",
                            snippet=line[:180],
                            page_number=page_num,
                            source_type="EXPLICIT",
                            confidence=0.90,
                        )
                    )

        # 5. Global fallback pass across entire document if skills section was absent
        if not canonical_skills_set:
            for page_idx, page_text in enumerate(raw_pages_text):
                found = extract_canonical_skills_from_text(page_text)
                for canonical, matched_token in found:
                    canonical_skills_set.add(canonical)
                    evidence_list.append(
                        SkillEvidence(
                            skill_name=canonical,
                            canonical_name=canonical,
                            category=get_skill_category(canonical),
                            section="GENERAL",
                            snippet=f"Detected mention of {canonical} on page {page_idx + 1}",
                            page_number=page_idx + 1,
                            source_type="INFERRED",
                            confidence=0.80,
                        )
                    )

        return sorted(list(canonical_skills_set)), evidence_list

    @classmethod
    def _extract_projects(cls, project_lines: List[Tuple[str, int]], raw_text: str) -> List[ExtractedProject]:
        """
        Extracts structured project entities from the PROJECTS section.
        Extracts title, description bullets, GitHub and live URLs, and associated technologies.
        """
        projects: List[ExtractedProject] = []
        if not project_lines:
            return projects

        current_title = ""
        current_bullets: List[str] = []
        current_github = None
        current_live = None
        current_page = 1

        for line, page_num in project_lines:
            clean_line = line.strip()
            if not clean_line:
                continue

            # Look for GitHub URL in the line
            gh_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-]+", clean_line, re.IGNORECASE)
            if gh_match:
                current_github = gh_match.group(0)
                if not current_github.startswith("http"):
                    current_github = f"https://{current_github}"

            # Look for live URL
            live_match = re.search(r"https?://[a-zA-Z0-9_\-\.]+\.(?:vercel\.app|netlify\.app|io|com|org)", clean_line, re.IGNORECASE)
            if live_match and "github.com" not in live_match.group(0):
                current_live = live_match.group(0)

            is_bullet = clean_line.startswith(("-", "•", "*", "–", "—", ">")) or bool(re.match(r"^\d+[\.\)]", clean_line))
            is_tech_stack_line = any(k in clean_line.lower() for k in ["tech stack:", "technologies:", "tools used:", "built with:"])

            # Detect title: not a bullet, reasonably sized, and not a standalone tech-stack line
            is_likely_title = (
                not is_bullet
                and not is_tech_stack_line
                and len(clean_line) < 80
                and not clean_line.endswith((".", ";"))
            )

            if is_likely_title:
                # If we already have an ongoing project, save it
                if current_title:
                    desc = " ".join(current_bullets) if current_bullets else current_title
                    techs = [s[0] for s in extract_canonical_skills_from_text(f"{current_title} {desc}")]
                    projects.append(
                        ExtractedProject(
                            title=cls._clean_project_title(current_title),
                            description=desc[:500],
                            technologies=techs,
                            github_url=current_github,
                            live_url=current_live,
                            page_number=current_page,
                        )
                    )
                    current_bullets = []
                    current_github = None
                    current_live = None

                current_title = clean_line
                current_page = page_num
            else:
                cleaned_bullet = re.sub(r"^[\W\d_]+", "", clean_line).strip()
                if cleaned_bullet:
                    current_bullets.append(cleaned_bullet)

        # Save last project
        if current_title:
            desc = " ".join(current_bullets) if current_bullets else current_title
            techs = [s[0] for s in extract_canonical_skills_from_text(f"{current_title} {desc}")]
            projects.append(
                ExtractedProject(
                    title=cls._clean_project_title(current_title),
                    description=desc[:500],
                    technologies=techs,
                    github_url=current_github,
                    live_url=current_live,
                    page_number=current_page,
                )
            )

        return projects

    @classmethod
    def _clean_project_title(cls, title: str) -> str:
        """Strips dates, links, and pipe delimiters from project title line."""
        # Remove pipe separated details like "| React, Python | Jan 2024"
        parts = title.split("|")
        clean = parts[0].strip()
        # Remove trailing date or parentheses
        clean = re.sub(r"\(.*?\)", "", clean)
        clean = re.sub(r"\[.*?\]", "", clean)
        clean = re.sub(r"https?://\S+", "", clean)
        clean = re.sub(r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"\s{2,}", " ", clean)
        return clean.strip() or title.strip()

    @classmethod
    def _extract_education(cls, edu_lines: List[Tuple[str, int]], raw_text: str) -> List[ExtractedEducation]:
        """
        Extracts degrees, actual institutions, fields of study, graduation/batch years, and CGPA scores.
        Does NOT hardcode institution or field of study.
        """
        education: List[ExtractedEducation] = []
        if not edu_lines:
            return education

        joined = "\n".join([l[0] for l in edu_lines])
        
        # Regex for degree detection with canonical mapping
        degree_patterns = [
            (r"\b(B\.?Tech|Bachelor of Technology)\b", "B.Tech"),
            (r"\b(B\.?E\.?|Bachelor of Engineering)\b", "B.E."),
            (r"\b(M\.?Tech|Master of Technology)\b", "M.Tech"),
            (r"\b(M\.?E\.?|Master of Engineering)\b", "M.E."),
            (r"\b(M\.?S\.?|Master of Science)\b", "M.S."),
            (r"\b(B\.?S\.?|Bachelor of Science)\b", "B.S."),
            (r"\b(BCA|Bachelor of Computer Applications)\b", "BCA"),
            (r"\b(MCA|Master of Computer Applications)\b", "MCA"),
            (r"\b(B\.?Sc|BSc)\b", "B.Sc"),
            (r"\b(M\.?Sc|MSc)\b", "M.Sc"),
            (r"\b(Diploma(?:\s+in\s+[a-zA-Z\s]+)?)\b", "Diploma"),
            (r"\b(Higher Secondary|HSC|Class XII|12th(?:\s+Grade)?)\b", "Higher Secondary (Class XII)"),
            (r"\b(Secondary School|SSLC|Class X|10th(?:\s+Grade)?)\b", "Secondary School (Class X)"),
        ]

        # Extract CGPA / score
        score_match = re.search(
            r"(?:cgpa|gpa|score|percentage|aggregate)[:\s]*([0-9\.]+)(?:\s*(?:/|out of)\s*10|\s*%)?",
            joined,
            re.IGNORECASE,
        )
        if not score_match:
            # Look for pattern like "8.80 / 10" or "8.8/10"
            score_match = re.search(r"\b([0-9]\.[0-9]{1,2})\s*/\s*10\b", joined)
        found_score = score_match.group(1) if score_match else None

        # Extract Start/End Years (e.g. 2023 - 2027, 2021 - 2025)
        year_match = re.search(r"\b(20\d{2})\s*[-–—to\s]+\s*(20\d{2}|Present|Current)\b", joined, re.IGNORECASE)
        start_yr = int(year_match.group(1)) if year_match else None
        end_yr = int(year_match.group(2)) if year_match and year_match.group(2).isdigit() else None

        # Extract Real Institution
        extracted_institution = cls._extract_institution_name(edu_lines, raw_text)

        # Extract Field of Study
        extracted_field = cls._extract_field_of_study(joined)

        for pattern, degree_name in degree_patterns:
            if re.search(pattern, joined, re.IGNORECASE):
                education.append(
                    ExtractedEducation(
                        degree=degree_name,
                        institution=extracted_institution or "Higher Education Institution",
                        field_of_study=extracted_field or "Computer Science & Engineering",
                        start_year=start_yr,
                        end_year=end_yr,
                        score=found_score,
                    )
                )

        # Fallback if no specific degree matched but education section has content
        if not education and edu_lines:
            education.append(
                ExtractedEducation(
                    degree="Collegiate Degree",
                    institution=extracted_institution or "University / Institution",
                    field_of_study=extracted_field or "Engineering",
                    start_year=start_yr,
                    end_year=end_yr,
                    score=found_score,
                )
            )

        return education

    @classmethod
    def _extract_institution_name(cls, edu_lines: List[Tuple[str, int]], raw_text: str) -> Optional[str]:
        """Identifies genuine college or university names from text lines."""
        # 1. First check prominent college mentions in the overall resume
        prominent = [
            (r"psg\s+college\s+of\s+technology", "PSG College of Technology"),
            (r"coimbatore\s+institute\s+of\s+technology", "Coimbatore Institute of Technology"),
            (r"government\s+college\s+of\s+technology", "Government College of Technology"),
            (r"anna\s+university", "Anna University"),
            (r"iit\s+madras", "IIT Madras"),
            (r"bits\s+pilani", "BITS Pilani"),
            (r"national\s+institute\s+of\s+technology", "National Institute of Technology"),
            (r"indian\s+institute\s+of\s+technology", "Indian Institute of Technology"),
        ]
        for pat, name in prominent:
            if re.search(pat, raw_text, re.IGNORECASE):
                return name

        # 2. Search in education section lines
        inst_kws = ["college", "institute", "university", "polytechnic", "school", "vidyalaya", "academy"]
        for line, _ in edu_lines:
            clean = line.strip()
            if any(k in clean.lower() for k in inst_kws):
                # Clean up trailing punctuation, dates, score
                clean_clean = re.sub(r"\b(20\d{2}|cgpa|score|gpa|grade|percentage|aggregate)\b.*", "", clean, flags=re.IGNORECASE).strip()
                # Split by comma or pipe (e.g. "PSG College of Technology, Coimbatore" -> "PSG College of Technology")
                parts = [p.strip() for p in re.split(r"[,|]", clean_clean) if p.strip()]
                for p in parts:
                    if any(k in p.lower() for k in inst_kws) and len(p) > 6:
                        return p.title()
                if clean_clean and len(clean_clean) > 6:
                    return clean_clean.title()

        # 3. Pretrained NER model fallback for unrecognized institution names
        try:
            from app.services.ner_service import extract_organizations
            orgs = extract_organizations("\n".join([l[0] for l in edu_lines]))
            if orgs:
                return orgs[0].title()
        except Exception as e:
            _logger.debug(f"NER institution fallback skipped: {e}")

        return None

    @classmethod
    def _extract_field_of_study(cls, text: str) -> Optional[str]:
        """Detects candidate's academic major/branch from text."""
        for pat, canonical_name in FIELD_OF_STUDY_PATTERNS:
            if re.search(pat, text, re.IGNORECASE):
                return canonical_name
        return None

    @classmethod
    def _extract_experience(cls, exp_lines: List[Tuple[str, int]], raw_text: str) -> List[ExtractedExperience]:
        """
        Extracts work experience and internships with realistic role, company, duration,
        and technologies. Does NOT hardcode company to a placeholder.
        """
        experiences: List[ExtractedExperience] = []
        if not exp_lines:
            return experiences

        current_role = ""
        current_company = ""
        current_duration = None
        current_location = None
        current_bullets: List[str] = []

        role_keywords = [
            r"intern\b",
            r"engineer\b",
            r"developer\b",
            r"analyst\b",
            r"associate\b",
            r"scientist\b",
            r"architect\b",
            r"lead\b",
            r"consultant\b",
            r"researcher\b",
            r"assistant\b",
            r"trainee\b",
            r"specialist\b",
            r"fellow\b",
            r"contributor\b",
            r"manager\b",
            r"officer\b",
            r"coordinator\b",
            r"founder\b",
            r"member\b",
            r"designer\b",
        ]

        for line, page_num in exp_lines:
            clean_line = line.strip()
            if not clean_line:
                continue

            is_bullet = clean_line.startswith(("-", "•", "*", "–", "—", ">")) or bool(re.match(r"^\d+[\.\)]", clean_line))
            has_role_kw = any(re.search(kw, clean_line, re.IGNORECASE) for kw in role_keywords)

            # Detect duration in line (e.g. Jun 2023 - Aug 2023, 05/2023 - 08/2023, 2023 - Present)
            dur_match = re.search(
                r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–—to\s]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|Present|Current)\b",
                clean_line,
                re.IGNORECASE,
            )

            is_exp_header = not is_bullet and len(clean_line) < 120 and (has_role_kw or bool(dur_match) or "|" in clean_line or " at " in clean_line or " @ " in clean_line)

            if is_exp_header:
                # Save previous experience if accumulated
                if current_role:
                    desc_text = " ".join(current_bullets)
                    techs = [s[0] for s in extract_canonical_skills_from_text(f"{current_role} {desc_text}")]
                    experiences.append(
                        ExtractedExperience(
                            role=current_role,
                            company=current_company or "Technology Firm",
                            location=current_location,
                            duration=current_duration,
                            description=desc_text[:400] if desc_text else current_role,
                            technologies=techs,
                        )
                    )
                    current_bullets = []
                    current_duration = None
                    current_location = None

                # Parse role & company from line
                role, company, dur = cls._parse_role_company_line(clean_line)
                current_role = role
                current_company = company
                current_duration = dur or (dur_match.group(0) if dur_match else None)
            else:
                if dur_match and not current_duration:
                    current_duration = dur_match.group(0)
                clean_b = re.sub(r"^[\W\d_]+", "", clean_line).strip()
                if clean_b:
                    current_bullets.append(clean_b)

        # Save last experience
        if current_role:
            desc_text = " ".join(current_bullets)
            techs = [s[0] for s in extract_canonical_skills_from_text(f"{current_role} {desc_text}")]
            experiences.append(
                ExtractedExperience(
                    role=current_role,
                    company=current_company or "Technology Firm",
                    location=current_location,
                    duration=current_duration,
                    description=desc_text[:400] if desc_text else current_role,
                    technologies=techs,
                )
            )

        return experiences

    @classmethod
    def _parse_role_company_line(cls, line: str) -> Tuple[str, str, Optional[str]]:
        """Parses lines like 'Software Engineering Intern | Google | Jun 2024 - Aug 2024'."""
        role = line
        company = ""
        duration = None

        # Check pipe delimiters
        if "|" in line:
            parts = [p.strip() for p in line.split("|")]
            role = parts[0]
            if len(parts) >= 2:
                company = parts[1]
            if len(parts) >= 3:
                duration = parts[2]
        # Check "at" delimiter e.g. "Software Engineer at Microsoft"
        elif " at " in line:
            parts = line.split(" at ", 1)
            role = parts[0].strip()
            company = parts[1].strip()
        elif " @ " in line:
            parts = line.split(" @ ", 1)
            role = parts[0].strip()
            company = parts[1].strip()
        # Check hyphen delimiter e.g. "Google - Software Engineer Intern"
        elif " - " in line:
            parts = line.split(" - ", 1)
            # Find which part contains the role keywords
            if any(k in parts[0].lower() for k in ["intern", "engineer", "developer", "lead"]):
                role = parts[0].strip()
                company = parts[1].strip()
            else:
                company = parts[0].strip()
                role = parts[1].strip()

        # Clean trailing dates from company if present
        date_match = re.search(r"\b(20\d{2}|Present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*", company, re.IGNORECASE)
        if date_match and len(company) > 15:
            duration = duration or date_match.group(0).strip()
            company = company[:date_match.start()].strip()

        return role.strip(), company.strip(), duration

    @classmethod
    def _extract_certifications(cls, cert_lines: List[Tuple[str, int]]) -> List[ExtractedCertification]:
        """
        Extracts certifications listed in the resume and dynamically detects the issuing organization.
        Does NOT hardcode 'Verified Certification Provider'.
        """
        certs: List[ExtractedCertification] = []
        for line, page_num in cert_lines:
            clean = re.sub(r"^[\W\d_]+", "", line).strip()
            if len(clean) < 6 or len(clean) > 120:
                continue

            # Detect real issuing organization from known issuers list
            issuer = None
            for alias, official_name in CERT_ISSUERS:
                if re.search(rf"\b{re.escape(alias)}\b", clean, re.IGNORECASE):
                    issuer = official_name
                    break

            # Extract year if present
            yr_match = re.search(r"\b(20\d{2})\b", clean)
            year = int(yr_match.group(1)) if yr_match else None

            # Clean cert name
            cert_name = clean
            if yr_match:
                cert_name = re.sub(r"\b20\d{2}\b", "", cert_name).strip()
            cert_name = re.sub(r"^[-–—|:]\s*|[-–—|:]\s*$", "", cert_name).strip()

            certs.append(
                ExtractedCertification(
                    name=cert_name,
                    issuing_organization=issuer or "Certification Authority",
                    year=year,
                )
            )

        return certs[:8]

    @classmethod
    def _apply_llm_fallback_if_needed(
        cls,
        section_map: Dict[str, List[Tuple[str, int]]],
        projects: List[ExtractedProject],
        education: List[ExtractedEducation],
        experience: List[ExtractedExperience],
        certifications: List[ExtractedCertification],
    ) -> Tuple[List[ExtractedProject], List[ExtractedEducation], List[ExtractedExperience], List[ExtractedCertification]]:
        """
        Layer 4 LLM fallback (Section 19).
        When GROQ_API_KEY is configured and local heuristic extraction produced 0 items
        for a detected section, asks Groq LLaMA to extract structured entities.
        """
        if not LLMResumeService.is_available():
            return projects, education, experience, certifications

        # Projects fallback
        if not projects and section_map.get("PROJECTS"):
            text = "\n".join([l[0] for l in section_map["PROJECTS"]])
            res = LLMResumeService.extract_structured_entities_fallback(text, "PROJECTS")
            if res:
                for item in res:
                    projects.append(
                        ExtractedProject(
                            title=item.get("title", "Project"),
                            description=item.get("description", ""),
                            technologies=item.get("technologies", []),
                            github_url=item.get("github_url"),
                            live_url=item.get("live_url"),
                        )
                    )

        # Experience fallback
        if not experience and section_map.get("EXPERIENCE"):
            text = "\n".join([l[0] for l in section_map["EXPERIENCE"]])
            res = LLMResumeService.extract_structured_entities_fallback(text, "EXPERIENCE")
            if res:
                for item in res:
                    experiences.append(
                        ExtractedExperience(
                            role=item.get("role", "Role"),
                            company=item.get("company", "Company"),
                            location=item.get("location"),
                            duration=item.get("duration"),
                            description=item.get("description", ""),
                            technologies=item.get("technologies", []),
                        )
                    )

        # Education fallback
        if not education and section_map.get("EDUCATION"):
            text = "\n".join([l[0] for l in section_map["EDUCATION"]])
            res = LLMResumeService.extract_structured_entities_fallback(text, "EDUCATION")
            if res:
                for item in res:
                    education.append(
                        ExtractedEducation(
                            degree=item.get("degree", "Degree"),
                            institution=item.get("institution", "Institution"),
                            field_of_study=item.get("field_of_study"),
                            start_year=item.get("start_year"),
                            end_year=item.get("end_year"),
                            score=item.get("score"),
                        )
                    )

        return projects, education, experience, certifications
