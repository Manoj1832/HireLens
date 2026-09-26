"""
Proctoring & Integrity Telemetry Models (Phase 8).
Complies with Sections 93–102, 115 of the Master Build Specification.
- Browser event telemetry data models (tab switch, window blur, clipboard paste, fullscreen exit)
- Lightweight vision telemetry (face present, face missing, multiple faces)
- Temporal penalty aggregation with trust score (0–100)
- Incident audit log with timestamps and severity
"""

from enum import Enum
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field


class IncidentType(str, Enum):
    """Types of proctoring violations detected during assessment."""
    TAB_SWITCH = "TAB_SWITCH"                # Browser tab visibility change
    WINDOW_BLUR = "WINDOW_BLUR"              # Window lost focus
    CLIPBOARD_PASTE = "CLIPBOARD_PASTE"      # Paste attempt detected
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"      # Exited fullscreen mode
    FACE_MISSING = "FACE_MISSING"            # No face detected in frame
    MULTIPLE_FACES = "MULTIPLE_FACES"        # More than one face detected
    RAPID_ANSWER = "RAPID_ANSWER"            # Suspiciously fast response time
    OBJECT_DETECTED = "OBJECT_DETECTED"      # Prohibited object (phone/device) detected


class IncidentSeverity(str, Enum):
    """Severity classification for proctoring incidents."""
    LOW = "LOW"          # Minor: window blur, brief tab switch
    MEDIUM = "MEDIUM"    # Moderate: clipboard paste, fullscreen exit
    HIGH = "HIGH"        # Critical: multiple faces, sustained face missing
    CRITICAL = "CRITICAL"  # Auto-flag: repeated critical violations


class ProctoringIncident(BaseModel):
    """Individual proctoring violation event."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    attempt_id: str
    incident_type: IncidentType
    severity: IncidentSeverity
    penalty_points: float = 0.0  # Points deducted from trust score (0-100 scale)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict = Field(default_factory=dict)  # Additional context (duration, count, etc.)
    description: str = ""


class IntegrityReport(BaseModel):
    """Aggregated integrity assessment for a test attempt."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    attempt_id: str
    trust_score: float = 100.0  # 0-100, starts at 100 and decreases with violations
    total_incidents: int = 0
    incidents_by_type: Dict[str, int] = Field(default_factory=dict)  # {type: count}
    total_penalty: float = 0.0  # Sum of all penalty points
    risk_level: str = "CLEAN"  # CLEAN, LOW_RISK, MEDIUM_RISK, HIGH_RISK, FLAGGED
    incidents: List[ProctoringIncident] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Penalty configuration table: maps incident types to penalty points and severity
PENALTY_CONFIG: Dict[IncidentType, Dict] = {
    IncidentType.TAB_SWITCH: {
        "base_penalty": 3.0,
        "escalation_per_repeat": 2.0,
        "max_penalty": 15.0,
        "severity": IncidentSeverity.LOW,
    },
    IncidentType.WINDOW_BLUR: {
        "base_penalty": 2.0,
        "escalation_per_repeat": 1.5,
        "max_penalty": 12.0,
        "severity": IncidentSeverity.LOW,
    },
    IncidentType.CLIPBOARD_PASTE: {
        "base_penalty": 8.0,
        "escalation_per_repeat": 4.0,
        "max_penalty": 25.0,
        "severity": IncidentSeverity.MEDIUM,
    },
    IncidentType.FULLSCREEN_EXIT: {
        "base_penalty": 5.0,
        "escalation_per_repeat": 3.0,
        "max_penalty": 20.0,
        "severity": IncidentSeverity.MEDIUM,
    },
    IncidentType.FACE_MISSING: {
        "base_penalty": 6.0,
        "escalation_per_repeat": 3.0,
        "max_penalty": 25.0,
        "severity": IncidentSeverity.HIGH,
    },
    IncidentType.MULTIPLE_FACES: {
        "base_penalty": 10.0,
        "escalation_per_repeat": 5.0,
        "max_penalty": 30.0,
        "severity": IncidentSeverity.HIGH,
    },
    IncidentType.RAPID_ANSWER: {
        "base_penalty": 4.0,
        "escalation_per_repeat": 2.0,
        "max_penalty": 15.0,
        "severity": IncidentSeverity.MEDIUM,
    },
    IncidentType.OBJECT_DETECTED: {
        "base_penalty": 20.0,
        "escalation_per_repeat": 5.0,
        "max_penalty": 35.0,
        "severity": IncidentSeverity.HIGH,
    },
}
