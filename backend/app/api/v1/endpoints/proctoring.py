"""
Proctoring & Integrity Telemetry API Endpoints (Phase 8).
Complies with Sections 93–102, 115 of the Master Build Specification.
Provides:
- Client telemetry event ingestion (tab switches, window blur, clipboard paste, fullscreen exit)
- Lightweight vision telemetry ingestion (face missing, multiple faces)
- Real-time trust score updates with penalty escalation
- Integrity report retrieval for recruiter analytics
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.models.user import User, UserRole
from app.schemas.proctoring import (
    TelemetryEventRequest,
    TelemetryEventResponse,
    TelemetryBatchRequest,
    TelemetryBatchResponse,
    IntegrityReportResponse,
    IntegritySummaryResponse,
    AnalyzeFrameRequest,
    AnalyzeFrameResponse,
)
from app.services.proctoring_engine import ProctoringEngine
from app.db.repository import repo

router = APIRouter()


# ----------------------------------------------------------------------
# Student Telemetry Event & Vision ML Frame Ingestion
# ----------------------------------------------------------------------

@router.post(
    "/event",
    response_model=TelemetryEventResponse,
    summary="Submit a single proctoring telemetry event",
)
def submit_telemetry_event(
    req: TelemetryEventRequest,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """
    Records a browser or vision telemetry event during an active assessment.
    Applies penalty escalation and returns current trust score.
    """
    attempt = repo.get_attempt(req.attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {req.attempt_id} not found.",
        )
    if attempt.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Attempt does not belong to this student.",
        )

    return ProctoringEngine.process_event(req)


@router.post(
    "/batch",
    response_model=TelemetryBatchResponse,
    summary="Submit a batch of proctoring telemetry events",
)
def submit_telemetry_batch(
    req: TelemetryBatchRequest,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """
    Records multiple telemetry events in a single request.
    Useful for batching offline-queued events when connectivity resumes.
    """
    attempt = repo.get_attempt(req.attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {req.attempt_id} not found.",
        )
    if attempt.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Attempt does not belong to this student.",
        )

    return ProctoringEngine.process_batch(req)


@router.post(
    "/analyze-frame",
    response_model=AnalyzeFrameResponse,
    summary="Analyze camera frame using Computer Vision ML for face and object detection",
)
def analyze_frame(
    req: AnalyzeFrameRequest,
    current_user: User = Depends(deps.require_role([UserRole.STUDENT])),
):
    """
    Server-side computer vision ML analysis on student webcam frames.
    Detects face presence, multiple faces, and prohibited electronic devices (e.g. mobile phones).
    Automatically records proctoring incidents when sustained violations are detected.
    """
    attempt = repo.get_attempt(req.attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {req.attempt_id} not found.",
        )
    if attempt.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Attempt does not belong to this student.",
        )

    import sys
    sys.path.append("/home/manoj/Documents/HireLens")
    from ai.cv_proctoring import VisionProctorML

    detection = VisionProctorML.analyze_base64_frame(req.image_base64)
    if not detection.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detection.get("error", "Failed to analyze frame image."),
        )

    incident_triggered = None
    warning_message = None

    # If an incident was detected, process it through the proctoring engine
    if detection.get("incident_type"):
        from app.models.proctoring import IncidentType
        inc_type_str = detection["incident_type"]
        inc_type = getattr(IncidentType, inc_type_str, None)

        if inc_type:
            event = TelemetryEventRequest(
                attempt_id=req.attempt_id,
                event_type=inc_type,
                metadata={
                    "face_count": detection.get("face_count", 0),
                    "prohibited_objects": [o["label"] for o in detection.get("prohibited_objects", [])],
                    "duration_ms": req.sustained_duration_ms or 5000,
                },
            )
            resp = ProctoringEngine.process_event(event)
            incident_triggered = inc_type.value
            warning_message = resp.warning_message

    report = repo.get_integrity_report(req.attempt_id)
    current_trust = report.trust_score if report else 100.0

    return AnalyzeFrameResponse(
        success=True,
        face_count=detection.get("face_count", 0),
        faces=detection.get("faces", []),
        prohibited_objects=detection.get("prohibited_objects", []),
        incident_triggered=incident_triggered,
        warning_message=warning_message,
        current_trust_score=current_trust,
        verified_normal=detection.get("verified_normal", False),
    )


# ----------------------------------------------------------------------
# Integrity Report Retrieval (Recruiter & Student)
# ----------------------------------------------------------------------

@router.get(
    "/report/{attempt_id}",
    response_model=IntegrityReportResponse,
    summary="Get full integrity report for an attempt",
)
def get_integrity_report(
    attempt_id: str,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Returns the full integrity report including all incidents, penalties,
    trust score, and risk classification.
    Students can view their own reports; recruiters/admins can view any.
    """
    attempt = repo.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found.",
        )

    # Authorization: students can only see their own reports
    if current_user.role == UserRole.STUDENT and attempt.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot view another student's integrity report.",
        )

    return ProctoringEngine.get_integrity_report(attempt_id)


@router.get(
    "/summary/{attempt_id}",
    response_model=IntegritySummaryResponse,
    summary="Get compact integrity summary for recruiter views",
)
def get_integrity_summary(
    attempt_id: str,
    current_user: User = Depends(deps.require_role([UserRole.RECRUITER, UserRole.COLLEGE_ADMIN])),
):
    """
    Returns a compact integrity summary for the recruiter dashboard.
    Includes trust score, risk level, and breakdown by violation category.
    """
    attempt = repo.get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found.",
        )

    return ProctoringEngine.get_integrity_summary(attempt_id)
