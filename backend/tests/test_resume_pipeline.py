import pytest
import io
import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import repo
from app.services.resume_parser import ResumeParserService

def create_sample_resume_pdf(filename: str = "candidate_resume.pdf") -> bytes:
    """Generates an in-memory valid collegiate PDF resume using PyMuPDF."""
    doc = fitz.open()
    
    # Page 1: Header, Summary, Education, Skills
    page1 = doc.new_page()
    text_page1 = """
ARAVIND RAMANATHAN
Roll No: 23Z342 | Email: 23z342@psgtech.ac.in | Phone: +91 9876543210
GitHub: github.com/aravind | LinkedIn: linkedin.com/in/aravind

SUMMARY
Aspiring software engineer specializing in backend systems, distributed architectures, and modern web applications.

EDUCATION
B.Tech in Computer Science & Engineering
PSG College of Technology, Coimbatore
2023 - 2027 | CGPA: 8.80 / 10

SKILLS
Programming Languages: Python, JavaScript, TypeScript, C++, SQL
Backend Frameworks: FastAPI, Node.js, Express, REST APIs
Databases: PostgreSQL, Redis, MongoDB
DevOps & Cloud: Docker, Kubernetes, AWS, Git, Linux
Core CS: Data Structures & Algorithms, Operating Systems, DBMS
"""
    page1.insert_text((50, 60), text_page1, fontsize=10)

    # Page 2: Projects & Experience
    page2 = doc.new_page()
    text_page2 = """
PROJECTS
HireLens Collegiate Assessment Platform
- Designed high-throughput microservices using FastAPI and PostgreSQL with sub-50ms latency.
- Implemented real-time token caching with Redis and containerized services using Docker.
- Built interactive candidate dashboard using React and Tailwind CSS.

Distributed Key-Value Store
- Implemented Raft consensus algorithm in Go with automated leader election.
- Benchmarked partition tolerance and persistent WAL storage on Linux.

EXPERIENCE
Backend Engineering Intern
- Developed asynchronous data processing pipelines using Python and Celery.
- Reduced API response time by 40% through relational query optimization in PostgreSQL.

CERTIFICATIONS
AWS Certified Cloud Practitioner - Amazon Web Services
    """
    page2.insert_text((50, 60), text_page2, fontsize=10)

    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def test_resume_parser_validation_rejects_corrupted_data():
    # 1. Non-PDF bytes over 100 bytes
    invalid_data = b"This is a non-pdf text string that is more than one hundred characters long to specifically test header validation logic"
    with pytest.raises(ValueError, match="valid PDF headers"):
        ResumeParserService.validate_pdf_bytes(invalid_data, "resume.pdf")

    # 2. Too small bytes
    with pytest.raises(ValueError, match="too small or corrupted"):
        ResumeParserService.validate_pdf_bytes(b"short", "resume.pdf")

    # 3. Invalid extension
    valid_pdf = create_sample_resume_pdf()
    with pytest.raises(ValueError, match=".pdf extension"):
        ResumeParserService.validate_pdf_bytes(valid_pdf, "resume.docx")

def test_resume_parser_pipeline_extracts_canonical_skills_and_evidence():
    pdf_bytes = create_sample_resume_pdf()
    analysis = ResumeParserService.parse_resume(
        pdf_bytes=pdf_bytes,
        user_id="usr-student-23z342",
        filename="aravind_resume.pdf",
    )

    assert analysis.page_count == 2
    assert analysis.extraction_method == "NATIVE"
    assert analysis.word_count > 50
    assert "SKILLS" in analysis.sections_detected
    assert "PROJECTS" in analysis.sections_detected
    assert "EDUCATION" in analysis.sections_detected

    # Verify canonical skill mapping
    expected_skills = [
        "Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes",
        "React", "Redis", "Data Structures & Algorithms", "Linux"
    ]
    for skill in expected_skills:
        assert skill in analysis.canonical_skills, f"Expected {skill} in canonical skills"

    # Verify evidence items linking
    assert len(analysis.evidence_items) > 5
    fastapi_ev = next((e for e in analysis.evidence_items if e.canonical_name == "FastAPI"), None)
    assert fastapi_ev is not None
    assert fastapi_ev.section in ["SKILLS", "PROJECTS"]
    assert fastapi_ev.source_type in ["EXPLICIT", "CONTEXTUAL"]
    assert "FastAPI" in fastapi_ev.snippet or "fastapi" in fastapi_ev.snippet.lower()
    assert fastapi_ev.page_number in [1, 2]

    # Verify Contact Info Extraction
    assert analysis.candidate_email == "23z342@psgtech.ac.in"
    assert analysis.candidate_phone is not None
    assert "github" in analysis.candidate_links
    assert "linkedin" in analysis.candidate_links

    # Verify Education Entity Extraction (dynamic without hardcoded fallbacks)
    assert len(analysis.extracted_education) > 0
    edu = analysis.extracted_education[0]
    assert "B.Tech" in edu.degree
    assert "PSG College of Technology" in edu.institution
    assert "Computer Science" in edu.field_of_study
    assert edu.score == "8.80"
    assert edu.start_year == 2023
    assert edu.end_year == 2027

    # Verify Project Entities
    assert len(analysis.extracted_projects) >= 2
    proj_titles = [p.title for p in analysis.extracted_projects]
    assert any("HireLens" in t for t in proj_titles)
    p1 = next(p for p in analysis.extracted_projects if "HireLens" in p.title)
    assert "FastAPI" in p1.technologies or "PostgreSQL" in p1.technologies or "React" in p1.technologies

    # Verify Experience Entities
    assert len(analysis.extracted_experience) > 0
    exp = analysis.extracted_experience[0]
    assert "Intern" in exp.role or "Engineer" in exp.role
    assert "Python" in exp.technologies or "PostgreSQL" in exp.technologies

    # Verify Certifications (dynamic issuer detection)
    assert len(analysis.extracted_certifications) > 0
    cert = analysis.extracted_certifications[0]
    assert "AWS" in cert.name or "Cloud" in cert.name
    assert cert.issuing_organization == "Amazon Web Services"

    # Verify Sentence Transformers embedding was generated (Section 24)
    assert analysis.embedding_model == "all-MiniLM-L6-v2"
    assert analysis.embedding_dim == 384
    assert len(analysis.embedding_vector) == 384
    # Embedding should be normalized (L2 norm ≈ 1.0)
    import math
    norm = math.sqrt(sum(x * x for x in analysis.embedding_vector))
    assert abs(norm - 1.0) < 0.01, f"Expected L2-normalized embedding, got norm={norm}"

@pytest.mark.asyncio
async def test_resume_upload_and_get_current_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Auth as student
        login_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        pdf_bytes = create_sample_resume_pdf()
        files = {"file": ("aravind_resume.pdf", pdf_bytes, "application/pdf")}

        # 1. Upload
        response = await ac.post("/api/v1/resumes/upload", headers=headers, files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "aravind_resume.pdf"
        assert data["page_count"] == 2
        assert "Python" in data["canonical_skills"]
        assert len(data["evidence_items"]) > 0
        assert data["has_embedding"] is True
        assert data["embedding_dim"] == 384
        assert data["embedding_model"] == "all-MiniLM-L6-v2"

        # 2. Get current resume
        get_res = await ac.get("/api/v1/resumes/current", headers=headers)
        assert get_res.status_code == 200
        current_data = get_res.json()
        assert current_data["id"] == data["id"]
        assert "FastAPI" in current_data["canonical_skills"]

@pytest.mark.asyncio
async def test_resume_sync_to_profile_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Auth as student
        login_res = await ac.post("/api/v1/auth/verify-otp", json={
            "email": "23z342@psgtech.ac.in",
            "otp": "123456"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Upload first
        pdf_bytes = create_sample_resume_pdf()
        files = {"file": ("aravind_resume.pdf", pdf_bytes, "application/pdf")}
        upload_res = await ac.post("/api/v1/resumes/upload", headers=headers, files=files)
        assert upload_res.status_code == 200

        # Sync
        sync_res = await ac.post(
            "/api/v1/resumes/sync-to-profile",
            headers=headers,
            json={"sync_skills": True, "sync_projects": True, "sync_certifications": True},
        )
        assert sync_res.status_code == 200
        sync_data = sync_res.json()
        assert "Profile updated" in sync_data["message"]
        assert sync_data["updated_completion_percentage"] >= 80

        # Verify profile contains synced data
        student_user = repo.get_user_by_email("23z342@psgtech.ac.in")
        profile = repo.get_student_profile(student_user.id)
        assert profile is not None
        skill_names = [s.name for s in profile.skills]
        assert "Python" in skill_names
        assert "PostgreSQL" in skill_names

def test_dynamic_multi_condition_resume_extraction():
    """
    Tests parsing a distinct collegiate resume with diverse formatting:
    - B.E. in Electronics & Communication Engineering
    - Coimbatore Institute of Technology
    - Swiggy Technologies experience (Data Science Associate)
    - GitHub project link embedded in title
    - Azure certification
    """
    doc = fitz.open()
    page = doc.new_page()
    text = """
PRIYA SUNDARAM
Email: priya.s@student.psgtech.ac.in | Phone: +91 9123456780
GitHub: github.com/priyasundaram | LinkedIn: linkedin.com/in/priyasundaram

EDUCATION
B.E. in Electronics & Communication Engineering
Coimbatore Institute of Technology, Coimbatore
2021 - 2025 | Score: 9.12 CGPA

TECHNICAL PROFICIENCIES
Programming: Python, C++, SQL, Bash
ML & Frameworks: PyTorch, TensorFlow, Scikit-learn, OpenCV
Tools & Cloud: Docker, Git, Linux, Azure

KEY PROJECTS
Autonomous Rover Vision | github.com/priyasundaram/rover-vision
- Implemented real-time object detection using OpenCV and PyTorch with 30fps latency.
- Containerized the vision pipeline using Docker for field deployment.

WORK EXPERIENCE
Data Science Associate | Swiggy Technologies | Jan 2024 - Jul 2024
- Developed predictive dispatch models using Python and Scikit-learn.
- Analyzed large-scale delivery telemetry stored in PostgreSQL and Redis.

LICENSES & CERTIFICATIONS
Microsoft Certified: Azure AI Fundamentals - Microsoft 2024
    """
    page.insert_text((50, 60), text, fontsize=10)
    pdf_bytes = doc.write()

    analysis = ResumeParserService.parse_resume(
        pdf_bytes=pdf_bytes,
        user_id="usr-test-priya",
        filename="priya_resume.pdf",
    )

    # 1. Contact Info
    assert analysis.candidate_email == "priya.s@student.psgtech.ac.in"
    assert "priyasundaram" in analysis.candidate_links.get("github", "")

    # 2. Education
    assert len(analysis.extracted_education) > 0
    edu = analysis.extracted_education[0]
    assert "B.E." in edu.degree
    assert "Coimbatore Institute of Technology" in edu.institution
    assert "Electronics & Communication" in edu.field_of_study
    assert edu.score == "9.12"
    assert edu.start_year == 2021
    assert edu.end_year == 2025

    # 3. Projects & Links
    assert len(analysis.extracted_projects) > 0
    proj = analysis.extracted_projects[0]
    assert "Autonomous Rover Vision" in proj.title
    assert proj.github_url is not None
    assert "rover-vision" in proj.github_url
    assert any(t in proj.technologies for t in ["PyTorch", "Docker"])

    # 4. Experience & Company
    assert len(analysis.extracted_experience) > 0
    exp = analysis.extracted_experience[0]
    assert "Data Science" in exp.role or "Associate" in exp.role
    assert "Swiggy" in exp.company
    assert exp.duration is not None
    assert "Jan 2024" in exp.duration

    # 5. Certifications & Issuer
    assert len(analysis.extracted_certifications) > 0
    cert = analysis.extracted_certifications[0]
    assert "Azure" in cert.name
    assert cert.issuing_organization == "Microsoft"

    # 6. Canonical Skills & Embedding
    assert "PyTorch" in analysis.canonical_skills
    assert "Docker" in analysis.canonical_skills
    assert analysis.embedding_dim == 384
    assert len(analysis.embedding_vector) == 384

