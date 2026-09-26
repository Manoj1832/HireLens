"""
Deterministic Eligibility Engine for Recruitment Drives.
Complies with Section 28 of the Master Build Specification:
"Eligibility must be deterministic. Do not use an LLM to determine eligibility.
If ineligible, show a clear reason where appropriate."
"""

import logging
from typing import Tuple, List, Dict
from app.models.drive import Drive, DriveEligibility
from app.models.profile import StudentProfile

logger = logging.getLogger("hirelens.eligibility")

DEPARTMENT_ALIASES: Dict[str, List[str]] = {
    "cse": ["computer science", "computer science & engineering", "cse", "cs"],
    "it": ["information technology", "it"],
    "ai_ds": ["artificial intelligence", "data science", "ai & ds", "ai", "ds", "aids"],
    "ece": ["electronics & communication", "electronics and communication", "ece"],
    "eee": ["electrical & electronics", "electrical and electronics", "eee"],
    "mech": ["mechanical", "mechanical engineering", "mech"],
    "civil": ["civil", "civil engineering"],
    "prod": ["production", "production engineering"],
    "biotech": ["biotechnology", "bio technology"],
}

class EligibilityEngine:
    @classmethod
    def evaluate(
        cls,
        drive: Drive,
        profile: StudentProfile,
    ) -> Tuple[bool, List[str], Dict[str, bool]]:
        """
        Deterministically evaluates if a student meets all configured drive eligibility criteria.
        Returns:
            - is_eligible (bool): True if student satisfies all criteria.
            - reasons (List[str]): Explanations for any unmet criteria.
            - breakdown (Dict[str, bool]): Individual pass/fail status per criterion.
        """
        eligibility: DriveEligibility = drive.eligibility
        reasons: List[str] = []
        breakdown: Dict[str, bool] = {
            "placement_opt_in": True,
            "department": True,
            "cgpa": True,
            "graduation_year": True,
            "backlogs": True,
        }

        # 0. Placement Participation Opt-In Check
        placement_opt_in = getattr(profile, "placement_opt_in", True)
        if placement_opt_in is False:
            breakdown["placement_opt_in"] = False
            opt_out_reason = getattr(profile, "opt_out_reason", None) or "Student opted out"
            reasons.append(
                f"Placement Participation Inactive: You have currently opted out of institutional campus placements (Reason: {opt_out_reason}). Update your consent status to Opt-In via your profile to apply."
            )

        # 1. Department Evaluation
        if eligibility.allowed_departments:
            student_dept = (getattr(profile, "department", "") or "").strip().lower()
            dept_passed = False
            for allowed in eligibility.allowed_departments:
                allowed_clean = allowed.strip().lower()
                # Direct or substring match
                if allowed_clean in student_dept or student_dept in allowed_clean:
                    dept_passed = True
                    break
                # Alias matching
                for group_key, aliases in DEPARTMENT_ALIASES.items():
                    if any(a in allowed_clean for a in aliases) and any(a in student_dept for a in aliases):
                        dept_passed = True
                        break
                if dept_passed:
                    break

            if not dept_passed:
                breakdown["department"] = False
                allowed_str = ", ".join(eligibility.allowed_departments)
                reasons.append(
                    f"Department mismatch: Eligible departments are [{allowed_str}], but your verified department is '{getattr(profile, 'department', '')}'."
                )

        # 2. CGPA Evaluation
        student_cgpa = float(getattr(profile, "verified_cgpa", 0.0) or 0.0)
        if eligibility.min_cgpa > 0.0:
            if student_cgpa < eligibility.min_cgpa:
                breakdown["cgpa"] = False
                reasons.append(
                    f"CGPA threshold not met: Drive requires a minimum CGPA of {eligibility.min_cgpa:.2f}, but your verified CGPA is {student_cgpa:.2f}."
                )

        # 3. Graduation Year / Batch Evaluation
        if eligibility.eligible_graduation_years:
            student_grad_year = profile.graduation_year or 0
            if student_grad_year not in eligibility.eligible_graduation_years:
                breakdown["graduation_year"] = False
                years_str = ", ".join(str(y) for y in eligibility.eligible_graduation_years)
                reasons.append(
                    f"Batch graduation year mismatch: Eligible batches are [{years_str}], but your registered graduation year is {student_grad_year}."
                )

        # 4. Backlog Criteria
        student_backlogs = profile.active_backlogs or 0
        if student_backlogs > eligibility.max_active_backlogs:
            breakdown["backlogs"] = False
            reasons.append(
                f"Active backlogs limit exceeded: Drive permits a maximum of {eligibility.max_active_backlogs} active backlog(s), but you currently have {student_backlogs}."
            )

        is_eligible = all(breakdown.values())
        return is_eligible, reasons, breakdown
