"""
Proctoring & Integrity Telemetry API Schemas (Phase 8).
Complies with Sections 93–102, 115 of the Master Build Specification.
Request/Response schemas for telemetry event ingestion and integrity reporting.
"""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.proctoring import IncidentType, IncidentSeverity


class TelemetryEventRequest(BaseModel):
    """Single browser/vision telemetry event submitted by the client."""
    attempt_id: str
    event_type: IncidentType
    timestamp: Optional[datetime] = None  # Client-side timestamp (server timestamps are authoritative)
    metadata: Dict = Field(default_factory=dict)  # e.g., {"duration_ms": 5000, "paste_length": 120}


class TelemetryBatchRequest(BaseModel):
    """Batch of telemetry events for efficient submission."""
    attempt_id: str
    events: List[TelemetryEventRequest] = Field(..., min_length=1, max_length=50)


class TelemetryEventResponse(BaseModel):
    """Response after processing a telemetry event."""
    success: bool
    incident_id: str
    incident_type: IncidentType
    severity: IncidentSeverity
    penalty_applied: float
    current_trust_score: float
    total_incidents: int
    warning_message: Optional[str] = None  # Shown to candidate on critical violations


class TelemetryBatchResponse(BaseModel):
    """Response after processing a batch of telemetry events."""
    success: bool
    processed_count: int
    current_trust_score: float
    total_incidents: int
    risk_level: str


class IncidentDetailItem(BaseModel):
    """Detailed incident record in the integrity report."""
    id: str
    incident_type: IncidentType
    severity: IncidentSeverity
    penalty_points: float
    timestamp: datetime
    description: str
    metadata: Dict = Field(default_factory=dict)


class IntegrityReportResponse(BaseModel):
    """Full integrity report for a test attempt."""
    attempt_id: str
    trust_score: float
    total_incidents: int
    incidents_by_type: Dict[str, int]
    total_penalty: float
    risk_level: str
    incidents: List[IncidentDetailItem] = Field(default_factory=list)


class IntegritySummaryResponse(BaseModel):
    """Compact integrity summary for recruiter dashboard views."""
    attempt_id: str
    trust_score: float
    risk_level: str
    total_incidents: int
    tab_switches: int = 0
    window_blurs: int = 0
    paste_attempts: int = 0
    fullscreen_exits: int = 0
    face_missing_events: int = 0
    multiple_faces_events: int = 0
    prohibited_object_events: int = 0


class AnalyzeFrameRequest(BaseModel):
    """Camera frame image submitted for computer vision ML analysis."""
    attempt_id: str
    image_base64: str  # Base64 encoded JPEG/PNG frame from student's webcam
    sustained_duration_ms: Optional[int] = None


class AnalyzeFrameResponse(BaseModel):
    """Results of computer vision ML analysis on a candidate's camera frame."""
    success: bool
    face_count: int
    faces: List[Dict] = Field(default_factory=list)
    prohibited_objects: List[Dict] = Field(default_factory=list)
    incident_triggered: Optional[str] = None
    warning_message: Optional[str] = None
    current_trust_score: float
    verified_normal: bool
