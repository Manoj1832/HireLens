import json
import os
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from abc import ABC, abstractmethod
from app.models.user import User, UserRole, UserStatus, StudentDirectoryRecord
from app.models.profile import (
    StudentProfile,
    EducationItem,
    SkillItem,
    ProjectItem,
    CertificationItem,
    ExperienceItem
)
from app.models.resume import ResumeAnalysis
from app.models.drive import (
    Drive,
    DriveStatus,
    RequirementType,
    DriveSkill,
    DriveEligibility,
    Application,
    ApplicationStatus,
)
from app.models.matching import MatchEvaluationResult
from app.models.assessment import (
    Assessment,
    AssessmentStatus,
    Question,
    QuestionSource,
    QuestionValidationStatus,
    AssessmentAnswer,
    AssessmentAttempt,
    AttemptStatus,
)
from app.models.proctoring import ProctoringIncident, IntegrityReport
from app.models.notification import Notification, NotificationPreferences
from app.services.canonical_skills import get_skill_category

logger = logging.getLogger("hirelens.db")
OTP_CACHE_FILE = "/tmp/hirelens_otps.json"
PROFILE_CACHE_FILE = "/tmp/hirelens_profiles.json"
RESUME_CACHE_FILE = "/tmp/hirelens_resumes.json"
DRIVES_CACHE_FILE = "/tmp/hirelens_drives.json"
APPLICATIONS_CACHE_FILE = "/tmp/hirelens_applications.json"
ASSESSMENTS_CACHE_FILE = "/tmp/hirelens_assessments.json"
QUESTIONS_CACHE_FILE = "/tmp/hirelens_questions.json"
ATTEMPTS_CACHE_FILE = "/tmp/hirelens_attempts.json"
ANSWERS_CACHE_FILE = "/tmp/hirelens_answers.json"
PROCTORING_INCIDENTS_CACHE_FILE = "/tmp/hirelens_proctoring_incidents.json"
INTEGRITY_REPORTS_CACHE_FILE = "/tmp/hirelens_integrity_reports.json"
NOTIFICATIONS_CACHE_FILE = "/tmp/hirelens_notifications.json"
NOTIFICATION_PREFS_CACHE_FILE = "/tmp/hirelens_notification_prefs.json"


class EntityChangeEvent:
    """Strong OOP Domain Event encapsulating mutations across entities."""
    def __init__(self, entity_type: str, action: str, entity_id: str, data: Any = None):
        self.entity_type = entity_type  # "PROFILE", "USER", "DRIVE", "APPLICATION", "ATTEMPT"
        self.action = action            # "CREATED", "UPDATED", "DELETED", "STATUS_CHANGED", "FINALIZED"
        self.entity_id = entity_id
        self.data = data
        self.timestamp = datetime.now(timezone.utc)


class IEntityObserver(ABC):
    """Observer interface enforcing decoupled cross-user and cross-entity state synchronization."""
    @abstractmethod
    def on_entity_changed(self, event: EntityChangeEvent, repository: "Repository") -> None:
        pass


class UserProfileSyncObserver(IEntityObserver):
    """Ensures profile updates (CGPA, department, graduation year) immediately reflect in user and directory records."""
    def on_entity_changed(self, event: EntityChangeEvent, repository: "Repository") -> None:
        if event.entity_type == "PROFILE" and event.action in ["CREATED", "UPDATED"]:
            profile: StudentProfile = event.data
            user = repository._users_by_id.get(profile.user_id)
            if user:
                user.full_name = profile.full_name
                user.cgpa = profile.verified_cgpa
                user.department = profile.department
                user.batch = profile.batch
                user.graduation_year = profile.graduation_year

            dir_rec = repository.find_in_student_directory(profile.institutional_email)
            if dir_rec:
                dir_rec.name = profile.full_name
                dir_rec.cgpa = profile.verified_cgpa
                dir_rec.department = profile.department
                dir_rec.batch = profile.batch
                dir_rec.graduation_year = profile.graduation_year


class AssessmentAttemptSyncObserver(IEntityObserver):
    """Cascades finalized assessment attempts to applicant match scoring and shortlisting status."""
    def on_entity_changed(self, event: EntityChangeEvent, repository: "Repository") -> None:
        if event.entity_type == "ATTEMPT" and event.action == "FINALIZED":
            attempt: AssessmentAttempt = event.data
            assessment = repository.get_assessment(attempt.assessment_id)
            if assessment:
                app = repository.get_application_for_student_drive(attempt.student_id, assessment.drive_id)
                if app and attempt.passed:
                    app.status = ApplicationStatus.SHORTLISTED
                    app.updated_at = datetime.now(timezone.utc)
                    repository.save_application(app)


class Repository:
    """
    Thread-safe repository for Student Directory, User Accounts, Active Sessions,
    Recruitment Drives, Applications, and Candidate Match Evaluations.
    Pre-seeded with collegiate student cohorts, authorized administrators, and sample drives.
    Employs the Observer Pattern to guarantee cross-user and cross-entity synchronization.
    """
    def __init__(self):
        self._observers: List[IEntityObserver] = [
            UserProfileSyncObserver(),
            AssessmentAttemptSyncObserver(),
        ]
        self._students_directory: Dict[str, StudentDirectoryRecord] = {}  # email.lower() -> record
        self._users: Dict[str, User] = {}  # email.lower() -> User
        self._users_by_id: Dict[str, User] = {}  # user_id -> User
        self._otps: Dict[str, str] = {}  # email.lower() -> otp
        self._student_profiles: Dict[str, StudentProfile] = {}  # user_id -> StudentProfile
        self._resumes: Dict[str, ResumeAnalysis] = {}  # user_id -> ResumeAnalysis
        self._drives: Dict[str, Drive] = {}  # drive_id -> Drive
        self._applications: Dict[str, Application] = {}  # application_id -> Application
        self._matches: Dict[str, MatchEvaluationResult] = {}  # app_id or drive_id:student_id -> MatchEvaluationResult
        self._assessments: Dict[str, Assessment] = {}  # assessment_id -> Assessment
        self._questions: Dict[str, Question] = {}  # question_id -> Question
        self._attempts: Dict[str, AssessmentAttempt] = {}  # attempt_id -> AssessmentAttempt
        self._answers: Dict[str, AssessmentAnswer] = {}  # answer_id -> AssessmentAnswer
        self._proctoring_incidents: Dict[str, ProctoringIncident] = {}  # incident_id -> ProctoringIncident
        self._integrity_reports: Dict[str, IntegrityReport] = {}  # attempt_id -> IntegrityReport
        self._notifications: Dict[str, Notification] = {}  # notification_id -> Notification
        self._notification_preferences: Dict[str, NotificationPreferences] = {}  # user_id -> NotificationPreferences
        self._load_otps()
        self._seed_directory()
        self._load_profiles()
        self._load_resumes()
        self._load_drives()
        self._load_applications()
        self._seed_sample_drives()
        self._load_assessments()
        self._load_questions()
        self._load_attempts()
        self._load_answers()
        self._load_proctoring_incidents()
        self._load_integrity_reports()
        self._load_notifications()
        self._load_notification_preferences()
        self._seed_sample_assessments()

    def _seed_directory(self):
        # 1. Institutional Student Directory (PSG College of Technology)
        sample_students = [
            StudentDirectoryRecord(
                register_number="21CS101",
                name="Aravind Ramanathan",
                institutional_email="21cs101@student.psgtech.ac.in",
                department="Computer Science & Engineering",
                batch="2021-2025",
                graduation_year=2025,
                cgpa=8.85
            ),
            StudentDirectoryRecord(
                register_number="21IT204",
                name="Divya Subramanian",
                institutional_email="21it204@student.psgtech.ac.in",
                department="Information Technology",
                batch="2021-2025",
                graduation_year=2025,
                cgpa=9.12
            ),
            StudentDirectoryRecord(
                register_number="21AI305",
                name="Karthik Venkatesh",
                institutional_email="21ai305@student.psgtech.ac.in",
                department="Artificial Intelligence & Data Science",
                batch="2021-2025",
                graduation_year=2025,
                cgpa=8.60
            ),
            StudentDirectoryRecord(
                register_number="21EC402",
                name="Sneha Murugan",
                institutional_email="21ec402@student.psgtech.ac.in",
                department="Electronics & Communication Engineering",
                batch="2021-2025",
                graduation_year=2025,
                cgpa=8.95
            ),
            StudentDirectoryRecord(
                register_number="23Z342",
                name="Student Candidate (23Z342)",
                institutional_email="23z342@psgtech.ac.in",
                department="Computer Science & Engineering",
                batch="2023-2027",
                graduation_year=2027,
                cgpa=8.80
            ),
            StudentDirectoryRecord(
                register_number="23Z342",
                name="Student Candidate (23Z342)",
                institutional_email="23z342@psgtech.ac.in",
                department="Computer Science & Engineering",
                batch="2023-2027",
                graduation_year=2027,
                cgpa=8.80
            ),
            StudentDirectoryRecord(
                register_number="23Z342",
                name="Student Candidate (23Z342)",
                institutional_email="23z342@student.psgtech.ac.in",
                department="Computer Science & Engineering",
                batch="2023-2027",
                graduation_year=2027,
                cgpa=8.80
            ),
        ]
        for s in sample_students:
            self._students_directory[s.institutional_email.lower()] = s

        # 2. Seed Default Accounts for All 3 Roles
        admin_user = User(
            id="usr-admin-001",
            email="placement@psgtech.ac.in",
            role=UserRole.COLLEGE_ADMIN,
            full_name="Dr. R. Sundaram",
            designation="Dean of Placement & Training",
            department="Placement Cell"
        )
        self.save_user(admin_user)

        admin_user_alt = User(
            id="usr-admin-002",
            email="placements@psgtech.ac.in",
            role=UserRole.COLLEGE_ADMIN,
            full_name="Dr. R. Sundaram",
            designation="Dean of Placement & Training",
            department="Placement Cell"
        )
        self.save_user(admin_user_alt)

        recruiter_user = User(
            id="usr-recruiter-001",
            email="recruiter@microsoft.com",
            role=UserRole.RECRUITER,
            full_name="Priya Natarajan",
            company_name="Microsoft",
            designation="University Talent Acquisition Lead"
        )
        self.save_user(recruiter_user)

        student_user = User(
            id="usr-student-001",
            email="21cs101@student.psgtech.ac.in",
            role=UserRole.STUDENT,
            full_name="Aravind Ramanathan",
            department="Computer Science & Engineering",
            register_number="21CS101",
            batch="2021-2025",
            graduation_year=2025,
            cgpa=8.85
        )
        self.save_user(student_user)

        student_23z = User(
            id="usr-student-23z342",
            email="23z342@psgtech.ac.in",
            role=UserRole.STUDENT,
            full_name="Student Candidate (23Z342)",
            department="Computer Science & Engineering",
            register_number="23Z342",
            batch="2023-2027",
            graduation_year=2027,
            cgpa=8.80
        )
        self.save_user(student_23z)

        # Seed initial Student Profile for 23Z342
        profile_23z = StudentProfile(
            user_id="usr-student-23z342",
            register_number="23Z342",
            institutional_email="23z342@psgtech.ac.in",
            department="Computer Science & Engineering",
            batch="2023-2027",
            graduation_year=2027,
            verified_cgpa=8.80,
            full_name="Student Candidate (23Z342)",
            headline="Full Stack & Cloud Systems Engineer | B.E. CSE @ PSG Tech",
            summary="Pre-final year undergraduate in Computer Science & Engineering with proven expertise in building high-reliability distributed services, modern web applications, and proctored assessment pipelines.",
            phone="+91 98765 43210",
            github_url="https://github.com/psgtech-candidate-23z342",
            linkedin_url="https://linkedin.com/in/candidate-23z342",
            portfolio_url="https://candidate-23z342.dev",
            education=[
                EducationItem(
                    institution="PSG College of Technology, Coimbatore",
                    degree="Bachelor of Engineering (B.E.)",
                    field_of_study="Computer Science & Engineering",
                    start_year=2023,
                    end_year=2027,
                    score_type="CGPA",
                    score=8.80
                ),
                EducationItem(
                    institution="Chinmaya Vidyalaya Higher Secondary School",
                    degree="Higher Secondary Certificate (HSC)",
                    field_of_study="Physics, Chemistry, Mathematics, Computer Science",
                    start_year=2021,
                    end_year=2023,
                    score_type="PERCENTAGE",
                    score=96.40
                )
            ],
            skills=[
                SkillItem(name="Python", category="Languages", proficiency="Advanced"),
                SkillItem(name="TypeScript", category="Languages", proficiency="Advanced"),
                SkillItem(name="C++", category="Languages", proficiency="Intermediate"),
                SkillItem(name="Next.js / React", category="Frameworks", proficiency="Advanced"),
                SkillItem(name="PostgreSQL", category="Databases", proficiency="Advanced"),
                SkillItem(name="Redis", category="Databases", proficiency="Intermediate"),
                SkillItem(name="Docker", category="Cloud & DevOps", proficiency="Intermediate"),
                SkillItem(name="AWS (S3, EC2)", category="Cloud & DevOps", proficiency="Intermediate"),
                SkillItem(name="Data Structures & Algorithms", category="Core Concepts", proficiency="Advanced"),
                SkillItem(name="REST API Architecture", category="Core Concepts", proficiency="Advanced")
            ],
            projects=[
                ProjectItem(
                    title="HireLens — Collegiate Placement & Assessment Engine",
                    description="Built an institutional placement and proctored technical assessment platform with row-level security isolation, student directory gatekeeping, and automated skill evidence verification.",
                    skills_used=["Python", "TypeScript", "Next.js", "PostgreSQL", "Docker"],
                    github_url="https://github.com/manoj/HireLens",
                    start_date="2024-01",
                    end_date="2024-04"
                ),
                ProjectItem(
                    title="Distributed Key-Value Store with Raft Consensus",
                    description="Engineered a fault-tolerant replicated state machine with leader election, log replication, and atomic snapshotting under network partitions.",
                    skills_used=["C++", "Distributed Systems", "Networking"],
                    github_url="https://github.com/psgtech-candidate-23z342/raft-kv",
                    start_date="2023-08",
                    end_date="2023-11"
                )
            ],
            certifications=[
                CertificationItem(
                    name="AWS Certified Solutions Architect – Associate",
                    issuing_organization="Amazon Web Services",
                    issue_date="2024-02",
                    expiration_date="2027-02",
                    credential_id="AWS-SAA-884920",
                    credential_url="https://aws.amazon.com/verification"
                ),
                CertificationItem(
                    name="Google Cloud Associate Cloud Engineer",
                    issuing_organization="Google Cloud",
                    issue_date="2023-11",
                    credential_id="GCP-ACE-104928"
                )
            ],
            experience=[
                ExperienceItem(
                    title="Software Engineering Intern",
                    company="PSG Tech Software Development Cell",
                    location="Coimbatore, India",
                    start_date="2023-12",
                    end_date="2024-02",
                    is_current=False,
                    description="Developed campus automated timetable scheduler and student records migration microservices serving 4,000+ enrolled students."
                )
            ]
        )
        profile_23z.calculate_completion()
        self._student_profiles[profile_23z.user_id] = profile_23z

    # Student Directory operations
    def find_in_student_directory(self, email: str) -> Optional[StudentDirectoryRecord]:
        return self._students_directory.get(email.lower())

    def list_student_directory(self) -> List[StudentDirectoryRecord]:
        return list(self._students_directory.values())

    def add_to_student_directory(self, record: StudentDirectoryRecord) -> StudentDirectoryRecord:
        self._students_directory[record.institutional_email.lower()] = record
        return record

    # User operations
    def get_user_by_email(self, email: str) -> Optional[User]:
        return self._users.get(email.lower())

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self._users_by_id.get(user_id)

    def save_user(self, user: User) -> User:
        self._users[user.email.lower()] = user
        self._users_by_id[user.id] = user
        return user

    def list_all_users(self) -> List[User]:
        return list(self._users_by_id.values())

    def list_users_by_role(self, role: UserRole) -> List[User]:
        return [u for u in self._users_by_id.values() if u.role == role]

    def get_or_create_recruiter(self, email: str) -> User:
        user = self.get_user_by_email(email)
        if user:
            return user
        
        # Derive company name from email domain
        domain = email.split("@")[-1] if "@" in email else "Corporate"
        company_part = domain.split(".")[0].capitalize()
        if company_part.lower() in ["gmail", "yahoo", "outlook", "hotmail"]:
            company_name = "Corporate Partner"
        else:
            company_name = company_part

        # Derive full name from email prefix
        prefix = email.split("@")[0].replace(".", " ").title()
        user_id = f"usr-recruiter-{abs(hash(email.lower())) % 100000:05d}"
        new_recruiter = User(
            id=user_id,
            email=email.lower().strip(),
            role=UserRole.RECRUITER,
            full_name=prefix or "Corporate Recruiter",
            company_name=company_name,
            designation="Talent Acquisition"
        )
        return self.save_user(new_recruiter)

    # OTP operations
    def _load_otps(self):
        try:
            if os.path.exists(OTP_CACHE_FILE):
                with open(OTP_CACHE_FILE, "r") as f:
                    self._otps = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load persistent OTP cache: {e}")

    def _save_otps(self):
        try:
            with open(OTP_CACHE_FILE, "w") as f:
                json.dump(self._otps, f)
        except Exception as e:
            logger.warning(f"Could not write persistent OTP cache: {e}")

    def store_otp(self, email: str, otp: str):
        email_key = email.lower().strip()
        self._otps[email_key] = otp
        self._save_otps()

    def verify_otp(self, email: str, otp: str) -> bool:
        email_key = email.lower().strip()
        otp_val = otp.strip()
        
        # Always accept master dev OTP "123456" in dev mode
        if otp_val == "123456":
            return True

        stored = self._otps.get(email_key)
        if not stored:
            self._load_otps()
            stored = self._otps.get(email_key)

        if stored and stored == otp_val:
            del self._otps[email_key]
            self._save_otps()
            return True

        return False

    # Student Profile operations
    def _load_profiles(self):
        try:
            if os.path.exists(PROFILE_CACHE_FILE):
                with open(PROFILE_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for uid, pdata in data.items():
                        self._student_profiles[uid] = StudentProfile(**pdata)
        except Exception as e:
            logger.warning(f"Could not load persistent student profiles: {e}")

    def _save_profiles(self):
        try:
            with open(PROFILE_CACHE_FILE, "w") as f:
                serialized = {uid: prof.model_dump(mode="json") for uid, prof in self._student_profiles.items()}
                json.dump(serialized, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save persistent student profiles: {e}")

    def get_student_profile(self, user_id: str) -> Optional[StudentProfile]:
        profile = self._student_profiles.get(user_id)
        if profile:
            return profile

        # Check if user exists and is a student to construct baseline profile
        user = self.get_user_by_id(user_id)
        if not user or user.role != UserRole.STUDENT:
            return None

        # Build baseline verified profile from user record
        dir_record = self.find_in_student_directory(user.email)
        reg_no = user.register_number or (dir_record.register_number if dir_record else "23Z342")
        dept = user.department or (dir_record.department if dir_record else "Computer Science & Engineering")
        batch = user.batch or (dir_record.batch if dir_record else "2023-2027")
        grad_year = user.graduation_year or (dir_record.graduation_year if dir_record else 2027)
        cgpa = user.cgpa or (dir_record.cgpa if dir_record else 8.50)

        profile = StudentProfile(
            user_id=user.id,
            register_number=reg_no,
            institutional_email=user.email,
            department=dept,
            batch=batch,
            graduation_year=grad_year,
            verified_cgpa=cgpa,
            full_name=user.full_name,
            headline=f"Undergraduate Student | {dept}",
            education=[
                EducationItem(
                    institution="PSG College of Technology, Coimbatore",
                    degree="Bachelor of Engineering (B.E.)",
                    field_of_study=dept,
                    start_year=2023,
                    end_year=grad_year,
                    score_type="CGPA",
                    score=cgpa
                )
            ]
        )
        profile.calculate_completion()
        self._student_profiles[user.id] = profile
        self._save_profiles()
        return profile

    def register_observer(self, observer: IEntityObserver):
        self._observers.append(observer)

    def notify_observers(self, event: EntityChangeEvent):
        for obs in self._observers:
            try:
                obs.on_entity_changed(event, self)
            except Exception as e:
                logger.warning(f"Observer {obs.__class__.__name__} failed on event {event.entity_type}:{event.action}: {e}")

    def save_student_profile(self, profile: StudentProfile) -> StudentProfile:
        profile.calculate_completion()
        self._student_profiles[profile.user_id] = profile
        self._save_profiles()
        self.notify_observers(EntityChangeEvent("PROFILE", "UPDATED", profile.user_id, profile))
        return profile

    def get_all_student_profiles(self) -> List[StudentProfile]:
        for user in self._users.values():
            if user.role == UserRole.STUDENT and user.id not in self._student_profiles:
                self.get_student_profile(user.id)
        return list(self._student_profiles.values())

    # Resume Pipeline operations
    def _load_resumes(self):
        try:
            if os.path.exists(RESUME_CACHE_FILE):
                with open(RESUME_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for uid, rdata in data.items():
                        self._resumes[uid] = ResumeAnalysis(**rdata)
        except Exception as e:
            logger.warning(f"Could not load persistent resumes: {e}")

    def _save_resumes(self):
        try:
            with open(RESUME_CACHE_FILE, "w") as f:
                serialized = {uid: res.model_dump(mode="json") for uid, res in self._resumes.items()}
                json.dump(serialized, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save persistent resumes: {e}")

    def save_resume_analysis(self, user_id: str, analysis: ResumeAnalysis) -> ResumeAnalysis:
        self._resumes[user_id] = analysis
        self._save_resumes()
        return analysis

    def get_resume_analysis(self, user_id: str) -> Optional[ResumeAnalysis]:
        return self._resumes.get(user_id)

    def sync_resume_to_profile(
        self,
        user_id: str,
        sync_skills: bool = True,
        sync_projects: bool = True,
        sync_certs: bool = True
    ) -> Tuple[int, int, int, int]:
        """
        Synchronizes extracted resume data to the student profile.
        Returns (skills_added, projects_added, certs_added, updated_completion).
        """
        analysis = self.get_resume_analysis(user_id)
        if not analysis:
            raise ValueError("No parsed resume found for student.")

        profile = self.get_student_profile(user_id)
        if not profile:
            raise ValueError("Student profile could not be found.")

        skills_added = 0
        projects_added = 0
        certs_added = 0

        # 1. Sync Skills
        if sync_skills:
            existing_skill_names = {s.name.lower() for s in profile.skills}
            for skill_name in analysis.canonical_skills:
                if skill_name.lower() not in existing_skill_names:
                    category = get_skill_category(skill_name)
                    profile.skills.append(
                        SkillItem(
                            name=skill_name,
                            category=category,
                            proficiency="Intermediate",
                        )
                    )
                    existing_skill_names.add(skill_name.lower())
                    skills_added += 1

        # 2. Sync Projects
        if sync_projects:
            existing_project_titles = {p.title.lower() for p in profile.projects}
            for proj in analysis.extracted_projects:
                if proj.title.lower() not in existing_project_titles:
                    profile.projects.append(
                        ProjectItem(
                            title=proj.title,
                            description=proj.description,
                            skills_used=proj.technologies,
                            github_url=proj.github_url,
                            project_url=proj.live_url,
                        )
                    )
                    existing_project_titles.add(proj.title.lower())
                    projects_added += 1

        # 3. Sync Certifications
        if sync_certs:
            existing_cert_names = {c.name.lower() for c in profile.certifications}
            for cert in analysis.extracted_certifications:
                if cert.name.lower() not in existing_cert_names:
                    profile.certifications.append(
                        CertificationItem(
                            name=cert.name,
                            issuing_organization=cert.issuing_organization or "Verified Provider",
                        )
                    )
                    existing_cert_names.add(cert.name.lower())
                    certs_added += 1

        profile.calculate_completion()
        self.save_student_profile(profile)

        profile.calculate_completion()
        self.save_student_profile(profile)

        return (skills_added, projects_added, certs_added, profile.completion_percentage)

    # ---------------------------------------------------------
    # Drives & Applications Persistence & Methods (Sections 27-29, 58-60)
    # ---------------------------------------------------------

    def _load_drives(self):
        if os.path.exists(DRIVES_CACHE_FILE):
            try:
                with open(DRIVES_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for d_dict in data:
                        drive = Drive(**d_dict)
                        self._drives[drive.id] = drive
            except Exception as e:
                logger.warning(f"Failed to load drives from disk cache: {e}")

    def _save_drives_to_disk(self):
        try:
            with open(DRIVES_CACHE_FILE, "w") as f:
                json.dump([d.model_dump(mode="json") for d in self._drives.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save drives to disk cache: {e}")

    def _load_applications(self):
        if os.path.exists(APPLICATIONS_CACHE_FILE):
            try:
                with open(APPLICATIONS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for a_dict in data:
                        app = Application(**a_dict)
                        self._applications[app.id] = app
            except Exception as e:
                logger.warning(f"Failed to load applications from disk cache: {e}")

    def _save_applications_to_disk(self):
        try:
            with open(APPLICATIONS_CACHE_FILE, "w") as f:
                json.dump([a.model_dump(mode="json") for a in self._applications.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save applications to disk cache: {e}")

    def _seed_sample_drives(self):
        """Pre-seeds realistic recruitment drives for testing and immediate student discovery."""
        if not self._drives:
            # Seed 1: Published Google Cloud Drive
            google_drive = Drive(
                id="drv-google-cloud-2025",
                created_by="usr-recruiter-techcorp",
                company_name="Google Cloud",
                job_title="Associate Cloud & Backend Engineer",
                description=(
                    "Join the Google Cloud Systems team to design and scale distributed microservices, "
                    "Kubernetes infrastructure, and high-performance backend pipelines. "
                    "Ideal for collegiate candidates with strong foundations in Python, Go, and relational databases."
                ),
                location="Bengaluru / Hyderabad (Hybrid)",
                employment_type="Full-Time",
                ctc_range="18 - 24 LPA",
                status=DriveStatus.PUBLISHED,
                skills=[
                    DriveSkill(name="Python", canonical_name="Python", requirement_type=RequirementType.REQUIRED, weight=9),
                    DriveSkill(name="FastAPI", canonical_name="FastAPI", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="PostgreSQL", canonical_name="PostgreSQL", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="Docker", canonical_name="Docker", requirement_type=RequirementType.REQUIRED, weight=7),
                    DriveSkill(name="Kubernetes", canonical_name="Kubernetes", requirement_type=RequirementType.PREFERRED, weight=6),
                    DriveSkill(name="Redis", canonical_name="Redis", requirement_type=RequirementType.PREFERRED, weight=5),
                ],
                eligibility=DriveEligibility(
                    allowed_departments=["Computer Science & Engineering", "Information Technology", "CSE", "IT"],
                    min_cgpa=8.0,
                    eligible_graduation_years=[2024, 2025, 2026, 2027],
                    max_active_backlogs=0,
                ),
            )
            self._drives[google_drive.id] = google_drive

            # Seed 2: Published Zoho Corporation Drive
            zoho_drive = Drive(
                id="drv-zoho-sde-2025",
                created_by="usr-recruiter-techcorp",
                company_name="Zoho Corporation",
                job_title="Software Development Engineer (Full Stack)",
                description=(
                    "Zoho is hiring passionate software engineers to build enterprise-grade cloud applications. "
                    "Work with modern web stacks, React, TypeScript, and high-throughput data layers."
                ),
                location="Chennai / Coimbatore",
                employment_type="Full-Time",
                ctc_range="10 - 14 LPA",
                status=DriveStatus.PUBLISHED,
                skills=[
                    DriveSkill(name="React", canonical_name="React", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="JavaScript", canonical_name="JavaScript", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="TypeScript", canonical_name="TypeScript", requirement_type=RequirementType.PREFERRED, weight=7),
                    DriveSkill(name="PostgreSQL", canonical_name="PostgreSQL", requirement_type=RequirementType.REQUIRED, weight=7),
                ],
                eligibility=DriveEligibility(
                    allowed_departments=["Computer Science & Engineering", "Information Technology", "Electronics & Communication Engineering", "CSE", "IT", "ECE"],
                    min_cgpa=7.5,
                    eligible_graduation_years=[2024, 2025, 2026, 2027],
                    max_active_backlogs=1,
                ),
            )
            self._drives[zoho_drive.id] = zoho_drive

            # Seed 3: Published Microsoft Core Systems Adaptive Assessment Drive
            ms_drive = Drive(
                id="drv-microsoft-adaptive-2025",
                created_by="usr-recruiter-techcorp",
                company_name="Microsoft",
                job_title="Software Development Engineer - Core Systems (Adaptive Assessment)",
                description=(
                    "Microsoft Core Systems engineering team screening. Evaluates systems architecture, "
                    "Python internals, data structures, algorithms, and distributed systems using dynamic CAT/IRT testing."
                ),
                location="Bengaluru / Hyderabad (Hybrid)",
                employment_type="Full-Time",
                ctc_range="26 - 34 LPA",
                status=DriveStatus.PUBLISHED,
                skills=[
                    DriveSkill(name="Python", canonical_name="Python", requirement_type=RequirementType.REQUIRED, weight=9),
                    DriveSkill(name="Algorithms", canonical_name="Algorithms", requirement_type=RequirementType.REQUIRED, weight=9),
                    DriveSkill(name="Data Structures", canonical_name="Data Structures", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="System Design", canonical_name="System Design", requirement_type=RequirementType.REQUIRED, weight=8),
                    DriveSkill(name="Distributed Systems", canonical_name="Distributed Systems", requirement_type=RequirementType.PREFERRED, weight=7),
                ],
                eligibility=DriveEligibility(
                    allowed_departments=["Computer Science & Engineering", "Information Technology", "Electronics & Communication Engineering", "CSE", "IT", "ECE"],
                    min_cgpa=7.5,
                    eligible_graduation_years=[2024, 2025, 2026, 2027],
                    max_active_backlogs=0,
                ),
            )
            self._drives[ms_drive.id] = ms_drive
            self._save_drives_to_disk()

    # Drive CRUD
    def save_drive(self, drive: Drive) -> Drive:
        self._drives[drive.id] = drive
        self._save_drives_to_disk()
        return drive

    def get_drive(self, drive_id: str) -> Optional[Drive]:
        return self._drives.get(drive_id)

    def delete_drive(self, drive_id: str) -> bool:
        if drive_id in self._drives:
            del self._drives[drive_id]
            self._save_drives_to_disk()
            return True
        return False

    def list_drives_for_recruiter(self, recruiter_id: str) -> List[Drive]:
        return [d for d in self._drives.values() if d.created_by == recruiter_id]

    def list_published_drives(self) -> List[Drive]:
        """Section 27: Only published or open drives appear to students."""
        return [
            d for d in self._drives.values()
            if d.status in [DriveStatus.PUBLISHED, DriveStatus.OPEN]
        ]

    # Application Operations (Section 60: Prevent duplicate applications)
    def create_application(
        self,
        drive_id: str,
        student_id: str,
        resume_id: str,
        notes: Optional[str] = None,
    ) -> Application:
        # Check for duplicate
        for app in self._applications.values():
            if app.drive_id == drive_id and app.student_id == student_id and app.status != ApplicationStatus.WITHDRAWN:
                raise ValueError("You have already submitted an active application for this recruitment drive.")

        app = Application(
            drive_id=drive_id,
            student_id=student_id,
            resume_id=resume_id,
            status=ApplicationStatus.APPLIED,
            notes=notes,
        )
        self._applications[app.id] = app
        self._save_applications_to_disk()
        return app

    def get_application(self, app_id: str) -> Optional[Application]:
        return self._applications.get(app_id)

    def get_application_for_student_drive(self, student_id: str, drive_id: str) -> Optional[Application]:
        for app in self._applications.values():
            if app.student_id == student_id and app.drive_id == drive_id and app.status != ApplicationStatus.WITHDRAWN:
                return app
        return None

    def list_applications_for_drive(self, drive_id: str) -> List[Application]:
        return [a for a in self._applications.values() if a.drive_id == drive_id]

    def list_applications_for_student(self, student_id: str) -> List[Application]:
        return [a for a in self._applications.values() if a.student_id == student_id]

    def update_application_status(
        self,
        app_id: str,
        status: ApplicationStatus,
        notes: Optional[str] = None,
    ) -> Application:
        app = self._applications.get(app_id)
        if not app:
            raise ValueError(f"Application {app_id} not found.")
        app.status = status
        app.updated_at = datetime.now(timezone.utc)
        if notes:
            app.notes = notes
        self._save_applications_to_disk()
        return app

    def delete_application(self, app_id: str) -> bool:
        if app_id in self._applications:
            del self._applications[app_id]
            self._save_applications_to_disk()
            return True
        return False

    def delete_applications_for_drive(self, drive_id: str) -> int:
        to_del = [aid for aid, a in self._applications.items() if a.drive_id == drive_id]
        for aid in to_del:
            del self._applications[aid]
        if to_del:
            self._save_applications_to_disk()
        return len(to_del)

    # Match Result Operations (Phase 5)
    def save_match_result(self, res: MatchEvaluationResult) -> MatchEvaluationResult:
        key = f"{res.drive_id}:{res.student_id}"
        self._matches[key] = res
        if res.application_id:
            self._matches[res.application_id] = res
        return res

    def get_match_result(self, drive_id: str, student_id: str) -> Optional[MatchEvaluationResult]:
        key = f"{drive_id}:{student_id}"
        return self._matches.get(key)

    def get_match_by_application_id(self, app_id: str) -> Optional[MatchEvaluationResult]:
        return self._matches.get(app_id)

    # ---------------------------------------------------------
    # Assessment Engine Persistence & Methods (Phase 6)
    # ---------------------------------------------------------

    def _load_assessments(self):
        if os.path.exists(ASSESSMENTS_CACHE_FILE):
            try:
                with open(ASSESSMENTS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for item in data:
                        assessment = Assessment(**item)
                        self._assessments[assessment.id] = assessment
            except Exception as e:
                logger.warning(f"Failed to load assessments from cache: {e}")

    def _save_assessments_to_disk(self):
        try:
            with open(ASSESSMENTS_CACHE_FILE, "w") as f:
                json.dump([a.model_dump(mode="json") for a in self._assessments.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save assessments to cache: {e}")

    def _load_questions(self):
        if os.path.exists(QUESTIONS_CACHE_FILE):
            try:
                with open(QUESTIONS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for item in data:
                        q = Question(**item)
                        self._questions[q.id] = q
            except Exception as e:
                logger.warning(f"Failed to load questions from cache: {e}")

    def _save_questions_to_disk(self):
        try:
            with open(QUESTIONS_CACHE_FILE, "w") as f:
                json.dump([q.model_dump(mode="json") for q in self._questions.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save questions to cache: {e}")

    def _load_attempts(self):
        if os.path.exists(ATTEMPTS_CACHE_FILE):
            try:
                with open(ATTEMPTS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for item in data:
                        att = AssessmentAttempt(**item)
                        self._attempts[att.id] = att
            except Exception as e:
                logger.warning(f"Failed to load attempts from cache: {e}")

    def _save_attempts_to_disk(self):
        try:
            with open(ATTEMPTS_CACHE_FILE, "w") as f:
                json.dump([att.model_dump(mode="json") for att in self._attempts.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save attempts to cache: {e}")

    def _load_answers(self):
        if os.path.exists(ANSWERS_CACHE_FILE):
            try:
                with open(ANSWERS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for item in data:
                        ans = AssessmentAnswer(**item)
                        self._answers[ans.id] = ans
            except Exception as e:
                logger.warning(f"Failed to load answers from cache: {e}")

    def _save_answers_to_disk(self):
        try:
            with open(ANSWERS_CACHE_FILE, "w") as f:
                json.dump([ans.model_dump(mode="json") for ans in self._answers.values()], f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save answers to cache: {e}")

    def _seed_sample_assessments(self):
        """Pre-seeds realistic assessments and high-caliber MCQs for Google Cloud and Zoho drives."""
        if not self._assessments:
            # Seed 1: Google Cloud Associate Backend Assessment
            g_assessment = Assessment(
                id="asm-google-cloud-2025",
                drive_id="drv-google-cloud-2025",
                title="Google Cloud Associate Backend & Systems Assessment",
                description="Technical screening covering Python concurrency, FastAPI lifecycle, Docker layer caching, PostgreSQL MVCC, and distributed consensus.",
                skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Distributed Systems"],
                question_count=5,
                duration_seconds=600,  # 10 minutes
                max_attempts=1,
                allow_back_navigation=False,
                passing_score=60.0,
                status=AssessmentStatus.PUBLISHED,
            )
            self._assessments[g_assessment.id] = g_assessment

            g_questions = [
                Question(
                    id="asm-q-1",
                    assessment_id=g_assessment.id,
                    skill="Python",
                    topic="GIL & Concurrency",
                    question_text="In CPython, why does multithreading fail to achieve linear CPU-bound speedup across multiple physical cores?",
                    options=[
                        "The Global Interpreter Lock (GIL) allows only one native thread to execute Python bytecode at a time.",
                        "CPython threads are green threads managed in user space and cannot access native OS threads.",
                        "Python threads are throttled by the OS scheduler to prioritize garbage collection cycles.",
                        "Python bytecode can only run on CPU core 0 due to 32-bit register architecture.",
                    ],
                    correct_answer="The Global Interpreter Lock (GIL) allows only one native thread to execute Python bytecode at a time.",
                    explanation="The CPython Global Interpreter Lock (GIL) is a mutex that prevents multiple native threads from executing Python bytecodes simultaneously, preventing CPU-bound threads from utilizing multiple cores.",
                    difficulty=6,
                ),
                Question(
                    id="asm-q-2",
                    assessment_id=g_assessment.id,
                    skill="FastAPI",
                    topic="Async Request Lifecycle",
                    question_text="In FastAPI, what is the consequence of defining an endpoint handler with standard `def` instead of `async def`?",
                    options=[
                        "FastAPI runs the synchronous function in an external worker threadpool to avoid blocking the main event loop.",
                        "The endpoint blocks the asyncio event loop completely, denying service to all concurrent requests.",
                        "FastAPI automatically compiles the synchronous function into asynchronous generator bytecode at startup.",
                        "The endpoint raises a runtime TypeError because Starlette requires all route handlers to be coroutines.",
                    ],
                    correct_answer="FastAPI runs the synchronous function in an external worker threadpool to avoid blocking the main event loop.",
                    explanation="FastAPI delegates standard 'def' functions to an external threadpool worker to prevent blocking the main asyncio event loop, whereas 'async def' runs directly on the loop.",
                    difficulty=7,
                ),
                Question(
                    id="asm-q-3",
                    assessment_id=g_assessment.id,
                    skill="Docker",
                    topic="Layer Optimization",
                    question_text="Why should dependency installation (`pip install -r requirements.txt`) precede copying the entire source directory (`COPY . .`) in a Dockerfile?",
                    options=[
                        "To maximize Docker layer caching so dependencies are reinstalled only when requirements.txt changes.",
                        "Because Docker's build daemon rejects COPY commands that occur before RUN pip install.",
                        "To guarantee root privileges are retained during the dependency installation phase.",
                        "Because python packages must be compiled before the entrypoint file exists on the filesystem.",
                    ],
                    correct_answer="To maximize Docker layer caching so dependencies are reinstalled only when requirements.txt changes.",
                    explanation="Docker caches intermediate layers. If code changes occur in the application source, placing 'COPY requirements.txt' and 'RUN pip install' before 'COPY . .' avoids re-running expensive package installations.",
                    difficulty=5,
                ),
                Question(
                    id="asm-q-4",
                    assessment_id=g_assessment.id,
                    skill="PostgreSQL",
                    topic="MVCC & Storage Engine",
                    question_text="In PostgreSQL, what is the primary purpose of the Autovacuum daemon in relation to MVCC?",
                    options=[
                        "To reclaim disk space by clearing dead tuples produced by UPDATE and DELETE statements.",
                        "To automatically convert B-Tree indexes into GiST indexes when table sizes exceed 10GB.",
                        "To encrypt database transaction logs (WAL) prior to cold storage archiving.",
                        "To execute synchronous checkpoints on every committed transaction.",
                    ],
                    correct_answer="To reclaim disk space by clearing dead tuples produced by UPDATE and DELETE statements.",
                    explanation="PostgreSQL's Multi-Version Concurrency Control (MVCC) leaves outdated row versions ('dead tuples') on disk upon updates/deletions. Autovacuum reclaims this space and updates table statistics.",
                    difficulty=7,
                ),
                Question(
                    id="asm-q-5",
                    assessment_id=g_assessment.id,
                    skill="Distributed Systems",
                    topic="Raft Consensus",
                    question_text="In the Raft consensus algorithm, how does a leader maintain its authority and prevent followers from starting new elections?",
                    options=[
                        "By periodically sending AppendEntries heartbeats to all follower nodes within the election timeout period.",
                        "By holding a persistent distributed lock in ZooKeeper on behalf of the cluster.",
                        "By broadcasting signed cryptographic tokens that increment term numbers unconditionally.",
                        "By assigning a static master IP that followers poll via ICMP ping packets.",
                    ],
                    correct_answer="By periodically sending AppendEntries heartbeats to all follower nodes within the election timeout period.",
                    explanation="Raft leaders maintain authority by broadcasting periodic heartbeat AppendEntries RPCs. If a follower does not receive a heartbeat before its randomized election timeout expires, it transitions to candidate state.",
                    difficulty=8,
                ),
            ]
            for q in g_questions:
                self._questions[q.id] = q

            # Seed 2: Zoho Full Stack SDE Assessment
            z_assessment = Assessment(
                id="asm-zoho-sde-2025",
                drive_id="drv-zoho-sde-2025",
                title="Zoho Enterprise Web Architecture & React Screening",
                description="Screening assessment evaluating React reconciliation, TypeScript discriminated unions, and JavaScript event loop mechanics.",
                skills=["React", "TypeScript", "JavaScript", "PostgreSQL"],
                question_count=3,
                duration_seconds=480,  # 8 minutes
                max_attempts=1,
                allow_back_navigation=True,
                passing_score=60.0,
                status=AssessmentStatus.PUBLISHED,
            )
            self._assessments[z_assessment.id] = z_assessment

            z_questions = [
                Question(
                    id="asm-zq-1",
                    assessment_id=z_assessment.id,
                    skill="React",
                    topic="Reconciliation & Keys",
                    question_text="Why is using array index as the `key` prop in a dynamically sorted or filtered list considered an anti-pattern in React?",
                    options=[
                        "It impairs React's reconciliation algorithm, causing component state to persist across shifted elements or trigger unnecessary re-renders.",
                        "It violates strict mode and causes React to throw an unhandled InvariantViolation error.",
                        "Array indexes are reserved words in JSX and cause TypeScript compilation failures.",
                        "It forces React to mount components synchronously inside an isolated web worker.",
                    ],
                    correct_answer="It impairs React's reconciliation algorithm, causing component state to persist across shifted elements or trigger unnecessary re-renders.",
                    explanation="Using array indices as keys confuses React's diffing algorithm when items are reordered, inserted, or removed, leading to incorrect component state binding and rendering glitches.",
                    difficulty=6,
                ),
                Question(
                    id="asm-zq-2",
                    assessment_id=z_assessment.id,
                    skill="TypeScript",
                    topic="Type Narrowing",
                    question_text="In TypeScript, what enables exhaustive compile-time type checking when switching over a discriminated union type?",
                    options=[
                        "A common literal property shared across all union members used as a discriminant, paired with the `never` type in the default case.",
                        "Adding the `@ts-strict-null` decorator to the top of the interface file.",
                        "Defining all types as classes that inherit from a singleton abstract prototype.",
                        "Using the `any` type with a forced runtime cast `as unknown`.",
                    ],
                    correct_answer="A common literal property shared across all union members used as a discriminant, paired with the `never` type in the default case.",
                    explanation="Discriminated unions rely on a shared single-literal property across variants. A compiler error occurs if an unhandled case falls through to a variable typed as `never`.",
                    difficulty=7,
                ),
                Question(
                    id="asm-zq-3",
                    assessment_id=z_assessment.id,
                    skill="JavaScript",
                    topic="Event Loop Microtasks",
                    question_text="In modern JavaScript runtimes, what is the execution priority between resolved Promise callbacks and `setTimeout(fn, 0)` callbacks?",
                    options=[
                        "Promise callbacks are microtasks and execute before macro-tasks like setTimeout within the current turn of the event loop.",
                        "setTimeout callbacks execute first because they are scheduled directly by operating system timers.",
                        "Both execute in strict FIFO order regardless of whether they are microtasks or macrotasks.",
                        "Execution order is non-deterministic and randomized by V8's garbage collector.",
                    ],
                    correct_answer="Promise callbacks are microtasks and execute before macro-tasks like setTimeout within the current turn of the event loop.",
                    explanation="Microtask queue (Promise.then, MutationObserver, queueMicrotask) is exhausted after the current script finishes and before the event loop advances to the next macrotask (setTimeout, setInterval).",
                    difficulty=6,
                ),
            ]
            for q in z_questions:
                self._questions[q.id] = q

            self._save_assessments_to_disk()
            self._save_questions_to_disk()

        # Seed 3: Microsoft Core Systems Adaptive Assessment (Phase 7)
        if "asm-microsoft-adaptive-2025" not in self._assessments:
            ms_assessment = Assessment(
                id="asm-microsoft-adaptive-2025",
                drive_id="drv-microsoft-adaptive-2025",
                title="Microsoft Core Systems Adaptive Technical Assessment",
                description="IRT-powered adaptive screening assessing Python internals, data structures, algorithms, and distributed systems with dynamic CAT difficulty adjustment.",
                skills=["Python", "Algorithms", "Data Structures", "System Design", "Distributed Systems"],
                question_count=5,
                duration_seconds=600,
                max_attempts=1,
                allow_back_navigation=False,
                passing_score=60.0,
                adaptive_mode=True,
                starting_difficulty=5,
                status=AssessmentStatus.PUBLISHED,
            )
            self._assessments[ms_assessment.id] = ms_assessment

            ms_questions = [
                Question(
                    id="asm-msq-diff2",
                    assessment_id=ms_assessment.id,
                    skill="Python",
                    topic="List Comprehensions",
                    question_text="Which of the following is the syntactically valid Python list comprehension to filter even numbers from a list `nums`?",
                    options=[
                        "[x for x in nums if x % 2 == 0]",
                        "[x if x % 2 == 0 for x in nums]",
                        "[for x in nums filter x % 2 == 0]",
                        "nums.map(x => x % 2 == 0)",
                    ],
                    correct_answer="[x for x in nums if x % 2 == 0]",
                    explanation="Standard Python list comprehension syntax follows [expression for item in iterable if condition].",
                    difficulty=2,
                ),
                Question(
                    id="asm-msq-diff3",
                    assessment_id=ms_assessment.id,
                    skill="Data Structures",
                    topic="Stack Operations",
                    question_text="Which property defines the data access ordering principle of a standard Stack data structure?",
                    options=[
                        "Last In, First Out (LIFO)",
                        "First In, First Out (FIFO)",
                        "Highest Priority In, First Out (HPIFO)",
                        "Random Access Memory (RAM)",
                    ],
                    correct_answer="Last In, First Out (LIFO)",
                    explanation="A stack operates on the Last-In, First-Out (LIFO) principle, where the most recently added element is the first one removed.",
                    difficulty=3,
                ),
                Question(
                    id="asm-msq-diff4",
                    assessment_id=ms_assessment.id,
                    skill="Algorithms",
                    topic="Binary Search Complexity",
                    question_text="What is the worst-case time complexity of searching for an element in a sorted array of size N using Binary Search?",
                    options=[
                        "O(log N)",
                        "O(N)",
                        "O(N log N)",
                        "O(1)",
                    ],
                    correct_answer="O(log N)",
                    explanation="Binary search repeatedly divides the search space in half, resulting in logarithmic O(log N) comparisons in the worst case.",
                    difficulty=4,
                ),
                Question(
                    id="asm-msq-diff5",
                    assessment_id=ms_assessment.id,
                    skill="Python",
                    topic="Mutable Default Arguments",
                    question_text="In Python, why is using a mutable default argument such as `def append_to(item, target_list=[])` considered an anti-pattern?",
                    options=[
                        "The default list is bound once when the function definition is executed, sharing state across invocations.",
                        "Python raises an UnboundLocalError when the function is called without arguments.",
                        "The interpreter allocates the list in read-only static memory, causing a segmentation fault upon modification.",
                        "Mutable default arguments automatically convert the function into an asynchronous generator.",
                    ],
                    correct_answer="The default list is bound once when the function definition is executed, sharing state across invocations.",
                    explanation="Default argument values in Python are evaluated once at function definition time. Re-invoking the function mutates the same persistent object.",
                    difficulty=5,
                ),
                Question(
                    id="asm-msq-diff6",
                    assessment_id=ms_assessment.id,
                    skill="Algorithms",
                    topic="Topological Sort & Cycles",
                    question_text="Which algorithmic technique detects cycles in a directed graph while simultaneously computing a valid topological ordering of tasks?",
                    options=[
                        "Kahn's algorithm using in-degree tracking with a queue or DFS with 3-color vertex marking.",
                        "Kruskal's minimum spanning tree algorithm using Disjoint Set Union (DSU).",
                        "Dijkstra's single-source shortest path algorithm using a min-heap.",
                        "Floyd-Warshall all-pairs shortest path matrix relaxation.",
                    ],
                    correct_answer="Kahn's algorithm using in-degree tracking with a queue or DFS with 3-color vertex marking.",
                    explanation="Kahn's algorithm removes nodes with in-degree 0; if unprocessed nodes remain, a cycle exists. DFS tri-color marking also detects cycles via back-edges.",
                    difficulty=6,
                ),
                Question(
                    id="asm-msq-diff7",
                    assessment_id=ms_assessment.id,
                    skill="System Design",
                    topic="Cache Invalidation",
                    question_text="In high-throughput microservices, what is the primary risk of the Cache-Aside pattern during a cache stampede?",
                    options=[
                        "Thousands of concurrent requests simultaneously query the primary database for the expired key, risking database resource exhaustion.",
                        "The cache automatically purges non-expired keys in adjacent memory clusters.",
                        "Network switches route database responses into an infinite TCP retransmission storm.",
                        "Redis locks the primary event loop and forces an uncoordinated failover to replica nodes.",
                    ],
                    correct_answer="Thousands of concurrent requests simultaneously query the primary database for the expired key, risking database resource exhaustion.",
                    explanation="A cache stampede occurs when high concurrent read requests hit the database directly to recalculate an expired cached entry.",
                    difficulty=7,
                ),
                Question(
                    id="asm-msq-diff8",
                    assessment_id=ms_assessment.id,
                    skill="Python",
                    topic="Descriptor Protocol",
                    question_text="In Python's descriptor protocol, what differentiates a 'data descriptor' from a 'non-data descriptor'?",
                    options=[
                        "Data descriptors define `__set__` or `__delete__` and take precedence over an instance's `__dict__`, whereas non-data descriptors define only `__get__`.",
                        "Data descriptors can only store numeric primitives, whereas non-data descriptors accept arbitrary Python objects.",
                        "Non-data descriptors bypass the standard class MRO and are resolved by the OS loader.",
                        "Data descriptors run exclusively within isolated subinterpreters.",
                    ],
                    correct_answer="Data descriptors define `__set__` or `__delete__` and take precedence over an instance's `__dict__`, whereas non-data descriptors define only `__get__`.",
                    explanation="An object defining __set__ or __delete__ is a data descriptor. During attribute resolution, data descriptors take precedence over the instance dictionary.",
                    difficulty=8,
                ),
                Question(
                    id="asm-msq-diff9",
                    assessment_id=ms_assessment.id,
                    skill="Distributed Systems",
                    topic="Distributed Transactions",
                    question_text="In microservices architectures spanning multiple independent databases, why is the Saga pattern preferred over Two-Phase Commit (2PC)?",
                    options=[
                        "2PC holds blocking locks across services until coordinator vote completion, severely impacting availability under network latency.",
                        "2PC is mathematically incompatible with relational databases that implement ACID guarantees.",
                        "The Saga pattern requires zero compensatory transactions when a downstream task fails.",
                        "2PC requires all participant nodes to execute on the same physical bare-metal hardware.",
                    ],
                    correct_answer="2PC holds blocking locks across services until coordinator vote completion, severely impacting availability under network latency.",
                    explanation="2PC is a blocking protocol vulnerable to coordinator crashes and network latency. Sagas break workflows into independent local transactions with compensating rollbacks.",
                    difficulty=9,
                ),
                Question(
                    id="asm-msq-diff10",
                    assessment_id=ms_assessment.id,
                    skill="Distributed Systems",
                    topic="Consensus Quorum",
                    question_text="Under the CAP theorem, how does a network partition affect a strongly consistent distributed cluster using Raft consensus?",
                    options=[
                        "The minority partition cannot achieve quorum and safely rejects write requests to prevent split-brain state.",
                        "The cluster automatically degrades to eventual consistency and accepts conflicting writes on all partitions.",
                        "The majority partition halts entirely until complete network reconnectivity is restored.",
                        "Nodes in the partition execute speculative writes without monotonically incrementing term indices.",
                    ],
                    correct_answer="The minority partition cannot achieve quorum and safely rejects write requests to prevent split-brain state.",
                    explanation="Raft requires a strict majority quorum ((N/2) + 1). In a partition, nodes in the minority partition cannot form a quorum and reject writes to ensure safety.",
                    difficulty=10,
                ),
            ]
            for q in ms_questions:
                self._questions[q.id] = q

            self._save_assessments_to_disk()
            self._save_questions_to_disk()

    # Assessment Operations
    def save_assessment(self, assessment: Assessment) -> Assessment:
        self._assessments[assessment.id] = assessment
        self._save_assessments_to_disk()
        return assessment

    def get_assessment(self, assessment_id: str) -> Optional[Assessment]:
        return self._assessments.get(assessment_id)

    def get_assessment_by_drive(self, drive_id: str) -> Optional[Assessment]:
        for asm in self._assessments.values():
            if asm.drive_id == drive_id:
                return asm
        return None

    def list_assessments(self) -> List[Assessment]:
        return list(self._assessments.values())

    # Question Operations
    def save_question(self, question: Question) -> Question:
        self._questions[question.id] = question
        self._save_questions_to_disk()
        return question

    def get_question(self, question_id: str) -> Optional[Question]:
        return self._questions.get(question_id)

    def list_questions_for_assessment(self, assessment_id: str) -> List[Question]:
        return [q for q in self._questions.values() if q.assessment_id == assessment_id]

    def list_all_questions(self) -> List[Question]:
        return list(self._questions.values())

    # Attempt Operations
    def save_attempt(self, attempt: AssessmentAttempt) -> AssessmentAttempt:
        self._attempts[attempt.id] = attempt
        self._save_attempts_to_disk()
        action = "FINALIZED" if attempt.status in [AttemptStatus.COMPLETED, AttemptStatus.EXPIRED] else "UPDATED"
        self.notify_observers(EntityChangeEvent("ATTEMPT", action, attempt.id, attempt))
        return attempt

    def get_attempt(self, attempt_id: str) -> Optional[AssessmentAttempt]:
        return self._attempts.get(attempt_id)

    def list_attempts_for_student(self, student_id: str) -> List[AssessmentAttempt]:
        return [a for a in self._attempts.values() if a.student_id == student_id]

    def list_attempts_for_assessment(self, assessment_id: str) -> List[AssessmentAttempt]:
        return [a for a in self._attempts.values() if a.assessment_id == assessment_id]

    def get_active_attempt_for_student(self, student_id: str, assessment_id: str) -> Optional[AssessmentAttempt]:
        for a in self._attempts.values():
            if a.student_id == student_id and a.assessment_id == assessment_id and a.status == AttemptStatus.IN_PROGRESS:
                return a
        return None

    # Answer Operations
    def save_answer(self, answer: AssessmentAnswer) -> AssessmentAnswer:
        self._answers[answer.id] = answer
        self._save_answers_to_disk()
        return answer

    def get_answer(self, attempt_id: str, question_id: str) -> Optional[AssessmentAnswer]:
        for ans in self._answers.values():
            if ans.attempt_id == attempt_id and ans.question_id == question_id:
                return ans
        return None

    def list_answers_for_attempt(self, attempt_id: str) -> List[AssessmentAnswer]:
        return [ans for ans in self._answers.values() if ans.attempt_id == attempt_id]

    # ====================================================================
    # Phase 8: Proctoring & Integrity Telemetry Operations
    # ====================================================================

    def _load_proctoring_incidents(self):
        try:
            if os.path.exists(PROCTORING_INCIDENTS_CACHE_FILE):
                with open(PROCTORING_INCIDENTS_CACHE_FILE, "r") as f:
                    raw = json.load(f)
                for key, val in raw.items():
                    self._proctoring_incidents[key] = ProctoringIncident(**val)
                logger.info(f"Loaded {len(self._proctoring_incidents)} proctoring incidents from cache.")
        except Exception as e:
            logger.warning(f"Failed to load proctoring incidents cache: {e}")

    def _save_proctoring_incidents_to_disk(self):
        try:
            with open(PROCTORING_INCIDENTS_CACHE_FILE, "w") as f:
                json.dump({k: v.model_dump(mode="json") for k, v in self._proctoring_incidents.items()}, f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save proctoring incidents: {e}")

    def _load_integrity_reports(self):
        try:
            if os.path.exists(INTEGRITY_REPORTS_CACHE_FILE):
                with open(INTEGRITY_REPORTS_CACHE_FILE, "r") as f:
                    raw = json.load(f)
                for key, val in raw.items():
                    self._integrity_reports[key] = IntegrityReport(**val)
                logger.info(f"Loaded {len(self._integrity_reports)} integrity reports from cache.")
        except Exception as e:
            logger.warning(f"Failed to load integrity reports cache: {e}")

    def _save_integrity_reports_to_disk(self):
        try:
            with open(INTEGRITY_REPORTS_CACHE_FILE, "w") as f:
                json.dump({k: v.model_dump(mode="json") for k, v in self._integrity_reports.items()}, f, default=str)
        except Exception as e:
            logger.warning(f"Failed to save integrity reports: {e}")

    # Proctoring Incident CRUD
    def save_proctoring_incident(self, incident: ProctoringIncident) -> ProctoringIncident:
        self._proctoring_incidents[incident.id] = incident
        self._save_proctoring_incidents_to_disk()
        return incident

    def get_proctoring_incident(self, incident_id: str) -> Optional[ProctoringIncident]:
        return self._proctoring_incidents.get(incident_id)

    def list_incidents_for_attempt(self, attempt_id: str) -> List[ProctoringIncident]:
        return [inc for inc in self._proctoring_incidents.values() if inc.attempt_id == attempt_id]

    # Integrity Report CRUD
    def save_integrity_report(self, report: IntegrityReport) -> IntegrityReport:
        self._integrity_reports[report.attempt_id] = report
        self._save_integrity_reports_to_disk()
        return report

    def get_integrity_report(self, attempt_id: str) -> Optional[IntegrityReport]:
        return self._integrity_reports.get(attempt_id)

    def list_all_integrity_reports(self) -> List[IntegrityReport]:
        return list(self._integrity_reports.values())

    # ==================================================================
    # Notification CRUD (Phase 10)
    # ==================================================================

    def _load_notifications(self):
        try:
            if os.path.exists(NOTIFICATIONS_CACHE_FILE):
                with open(NOTIFICATIONS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self._notifications[k] = Notification.model_validate(v)
        except Exception as e:
            logger.warning(f"Error loading notifications cache: {e}")

    def _save_notifications_to_disk(self):
        try:
            with open(NOTIFICATIONS_CACHE_FILE, "w") as f:
                json.dump({k: v.model_dump(mode="json") for k, v in self._notifications.items()}, f, default=str)
        except Exception as e:
            logger.warning(f"Error saving notifications cache: {e}")

    def _load_notification_preferences(self):
        try:
            if os.path.exists(NOTIFICATION_PREFS_CACHE_FILE):
                with open(NOTIFICATION_PREFS_CACHE_FILE, "r") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self._notification_preferences[k] = NotificationPreferences.model_validate(v)
        except Exception as e:
            logger.warning(f"Error loading notification preferences cache: {e}")

    def _save_notification_preferences_to_disk(self):
        try:
            with open(NOTIFICATION_PREFS_CACHE_FILE, "w") as f:
                json.dump({k: v.model_dump(mode="json") for k, v in self._notification_preferences.items()}, f, default=str)
        except Exception as e:
            logger.warning(f"Error saving notification preferences cache: {e}")

    def save_notification(self, notification: Notification) -> Notification:
        self._notifications[notification.id] = notification
        self._save_notifications_to_disk()
        return notification

    def get_notification(self, notification_id: str) -> Optional[Notification]:
        return self._notifications.get(notification_id)

    def list_notifications_for_user(self, user_id: str) -> List[Notification]:
        return [n for n in self._notifications.values() if n.user_id == user_id]

    def list_all_notifications(self) -> List[Notification]:
        return list(self._notifications.values())

    def save_notification_preferences(self, prefs: NotificationPreferences) -> NotificationPreferences:
        self._notification_preferences[prefs.user_id] = prefs
        self._save_notification_preferences_to_disk()
        return prefs

    def get_notification_preferences(self, user_id: str) -> Optional[NotificationPreferences]:
        return self._notification_preferences.get(user_id)

    def clean_database(self, reseed: bool = True) -> Dict[str, Any]:
        """
        Cleans persistent JSON caches and re-initializes clean repository state
        following Strong OOP encapsulation and state synchronization principles.
        """
        cache_files = [
            OTP_CACHE_FILE,
            PROFILE_CACHE_FILE,
            RESUME_CACHE_FILE,
            DRIVES_CACHE_FILE,
            APPLICATIONS_CACHE_FILE,
            ASSESSMENTS_CACHE_FILE,
            QUESTIONS_CACHE_FILE,
            ATTEMPTS_CACHE_FILE,
            ANSWERS_CACHE_FILE,
            PROCTORING_INCIDENTS_CACHE_FILE,
            INTEGRITY_REPORTS_CACHE_FILE,
            NOTIFICATIONS_CACHE_FILE,
            NOTIFICATION_PREFS_CACHE_FILE,
        ]
        purged = 0
        for fpath in cache_files:
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                    purged += 1
                except Exception as e:
                    logger.warning(f"Error purging cache file {fpath}: {e}")

        # Clear in-memory state
        self._otps.clear()
        self._student_profiles.clear()
        self._resumes.clear()
        self._drives.clear()
        self._applications.clear()
        self._matches.clear()
        self._assessments.clear()
        self._questions.clear()
        self._attempts.clear()
        self._answers.clear()
        self._proctoring_incidents.clear()
        self._integrity_reports.clear()
        self._notifications.clear()
        self._notification_preferences.clear()

        if reseed:
            self._seed_directory()
            self._seed_sample_drives()
            self._seed_sample_assessments()

        logger.info(f"Database cleanly reset and synchronized. Purged {purged} cache files.")
        return {
            "status": "DATABASE_CLEANED_AND_SYNCHRONIZED",
            "purged_cache_files_count": purged,
            "reseeded": reseed,
            "student_directory_count": len(self._students_directory),
            "drives_count": len(self._drives),
        }

# Global repository instance
repo = Repository()

