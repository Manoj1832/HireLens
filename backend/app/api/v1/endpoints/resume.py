import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.api import deps
from app.models.user import User, UserRole
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeDetailResponse,
    ResumeSyncRequest,
    ResumeSyncResponse,
)
from app.services.resume_parser import ResumeParserService
from app.db.repository import repo

router = APIRouter()

# Secure upload directory
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """
    Upload and parse student PDF resume using the structured HireLens resume pipeline.
    Complies with Sections 11–18 and 21 of the Master Build Specification:
    - Magic bytes & format validation
    - Native PyMuPDF text & block extraction
    - Quality detection & section segmentation
    - Canonical skill resolution & evidence linking
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename must not be empty.",
        )

    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # Validate and parse via ResumeParserService
        analysis = ResumeParserService.parse_resume(
            pdf_bytes=content,
            user_id=current_user.id,
            filename=file.filename,
        )

        # Save copy to private storage
        safe_filename = f"{current_user.id}_{analysis.sha256[:12]}_{file.filename}"
        storage_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(storage_path, "wb") as f:
            f.write(content)
        analysis.storage_path = storage_path

        # Persist analysis
        repo.save_resume_analysis(current_user.id, analysis)

        return ResumeUploadResponse(
            id=analysis.id,
            filename=analysis.filename,
            file_size=analysis.file_size,
            page_count=analysis.page_count,
            word_count=analysis.word_count,
            extraction_method=analysis.extraction_method,
            candidate_name=analysis.candidate_name,
            candidate_email=analysis.candidate_email,
            candidate_phone=analysis.candidate_phone,
            candidate_links=analysis.candidate_links,
            sections_detected=analysis.sections_detected,
            canonical_skills=analysis.canonical_skills,
            evidence_items=analysis.evidence_items,
            extracted_projects=analysis.extracted_projects,
            extracted_education=analysis.extracted_education,
            extracted_certifications=analysis.extracted_certifications,
            extracted_experience=analysis.extracted_experience,
            embedding_model=analysis.embedding_model,
            embedding_dim=analysis.embedding_dim,
            has_embedding=len(analysis.embedding_vector) > 0,
            parsed_at=analysis.parsed_at,
            message=f"Resume parsed successfully ({analysis.word_count} words, {len(analysis.canonical_skills)} canonical skills verified with evidence).",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing resume processing pipeline: {str(e)}",
        )

@router.get("/current", response_model=ResumeDetailResponse)
def get_current_resume_analysis(
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """Retrieves the active student's parsed resume analysis and evidence links."""
    analysis = repo.get_resume_analysis(current_user.id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No parsed resume found for this candidate. Please upload your resume PDF.",
        )
    
    return ResumeDetailResponse(
        id=analysis.id,
        filename=analysis.filename,
        file_size=analysis.file_size,
        page_count=analysis.page_count,
        word_count=analysis.word_count,
        extraction_method=analysis.extraction_method,
        candidate_name=analysis.candidate_name,
        candidate_email=analysis.candidate_email,
        candidate_phone=analysis.candidate_phone,
        candidate_links=analysis.candidate_links,
        sections_detected=analysis.sections_detected,
        canonical_skills=analysis.canonical_skills,
        evidence_items=analysis.evidence_items,
        extracted_projects=analysis.extracted_projects,
        extracted_education=analysis.extracted_education,
        extracted_certifications=analysis.extracted_certifications,
        extracted_experience=analysis.extracted_experience,
        embedding_model=analysis.embedding_model,
        embedding_dim=analysis.embedding_dim,
        has_embedding=len(analysis.embedding_vector) > 0,
        parsed_at=analysis.parsed_at,
    )

@router.post("/sync-to-profile", response_model=ResumeSyncResponse)
def sync_resume_data_to_profile(
    req: ResumeSyncRequest,
    current_user: User = Depends(deps.require_role(UserRole.STUDENT)),
):
    """
    Synchronizes parsed canonical skills, projects, and certifications directly to the student profile.
    Collegiate verified fields (roll number, verified CGPA, department) remain locked and unaffected.
    """
    try:
        skills_added, projs_added, certs_added, comp = repo.sync_resume_to_profile(
            user_id=current_user.id,
            sync_skills=req.sync_skills,
            sync_projects=req.sync_projects,
            sync_certs=req.sync_certifications,
        )
        return ResumeSyncResponse(
            message=f"Profile updated: {skills_added} skills, {projs_added} projects, and {certs_added} certifications synchronized.",
            skills_added=skills_added,
            projects_added=projs_added,
            certifications_added=certs_added,
            updated_completion_percentage=comp,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize resume data: {str(e)}",
        )
