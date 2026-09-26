"""
Proctoring & Integrity Engine (Phase 8).
Complies with Sections 93–102, 115 of the Master Build Specification.

Responsibilities:
- Ingests browser telemetry events (tab switch, blur, clipboard paste, fullscreen exit)
- Ingests lightweight vision telemetry (face missing, multiple faces)
- Applies configurable temporal penalty escalation per incident type
- Aggregates a final integrity trust score (0–100) with risk classification
- Maintains an immutable incident audit log per attempt
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Tuple

from app.models.proctoring import (
    IncidentType,
    IncidentSeverity,
    ProctoringIncident,
    IntegrityReport,
    PENALTY_CONFIG,
)
from app.schemas.proctoring import (
    TelemetryEventRequest,
    TelemetryEventResponse,
    TelemetryBatchRequest,
    TelemetryBatchResponse,
    IntegrityReportResponse,
    IncidentDetailItem,
    IntegritySummaryResponse,
)
from app.db.repository import repo

logger = logging.getLogger("hirelens.proctoring")


# Risk level classification thresholds (trust score)
RISK_THRESHOLDS = {
    "CLEAN": 90,       # 90-100: No significant violations
    "LOW_RISK": 70,    # 70-89: Minor violations detected
    "MEDIUM_RISK": 50, # 50-69: Moderate violations, review recommended
    "HIGH_RISK": 30,   # 30-49: Significant violations, likely compromised
    "FLAGGED": 0,      # 0-29: Critical integrity failure, auto-flag for review
}

# Warning messages shown to candidate for escalating violations
WARNING_MESSAGES = {
    IncidentSeverity.LOW: None,
    IncidentSeverity.MEDIUM: "⚠️ Assessment integrity monitoring has detected unusual activity. Please maintain focus on the test window.",
    IncidentSeverity.HIGH: "🚨 Critical integrity warning: Continued violations will significantly impact your trust score and may flag your attempt for review.",
    IncidentSeverity.CRITICAL: "🔴 Your assessment has been flagged for integrity review due to repeated violations. This incident will be reported to the recruitment team.",
}


class ProctoringEngine:
    """
    Stateless proctoring engine that processes telemetry events,
    applies penalties, and manages integrity reports.
    """

    @classmethod
    def process_event(cls, event: TelemetryEventRequest) -> TelemetryEventResponse:
        """
        Process a single telemetry event and update the integrity report.
        Returns the response with current trust score and any warnings.
        """
        # 1. Get or create the integrity report for this attempt
        report = repo.get_integrity_report(event.attempt_id)
        if not report:
            report = IntegrityReport(attempt_id=event.attempt_id)
            repo.save_integrity_report(report)

        # 2. Calculate penalty with escalation
        config = PENALTY_CONFIG.get(event.event_type)
        if not config:
            logger.warning(f"Unknown incident type: {event.event_type}")
            config = {"base_penalty": 2.0, "escalation_per_repeat": 1.0, "max_penalty": 10.0, "severity": IncidentSeverity.LOW}

        # Count prior incidents of same type for escalation
        type_key = event.event_type.value
        prior_count = report.incidents_by_type.get(type_key, 0)

        # Escalating penalty: base + (repeats * escalation), capped at max
        raw_penalty = config["base_penalty"] + (prior_count * config["escalation_per_repeat"])
        penalty = min(raw_penalty, config["max_penalty"])

        # 3. Determine severity (escalate on repeated violations)
        severity = config["severity"]
        if prior_count >= 5:
            severity = IncidentSeverity.CRITICAL
        elif prior_count >= 3 and severity in (IncidentSeverity.LOW, IncidentSeverity.MEDIUM):
            severity = IncidentSeverity.HIGH

        # 4. Create the incident record
        description = cls._generate_incident_description(event.event_type, prior_count + 1, event.metadata)
        incident = ProctoringIncident(
            attempt_id=event.attempt_id,
            incident_type=event.event_type,
            severity=severity,
            penalty_points=penalty,
            timestamp=event.timestamp or datetime.now(timezone.utc),
            metadata=event.metadata,
            description=description,
        )

        # 5. Update the integrity report
        report.incidents.append(incident)
        report.total_incidents += 1
        report.incidents_by_type[type_key] = prior_count + 1
        report.total_penalty += penalty
        report.trust_score = max(0.0, 100.0 - report.total_penalty)
        report.risk_level = cls._classify_risk(report.trust_score)
        report.updated_at = datetime.now(timezone.utc)

        # 6. Persist
        repo.save_integrity_report(report)
        repo.save_proctoring_incident(incident)

        # 7. Build response
        warning = WARNING_MESSAGES.get(severity)
        if severity == IncidentSeverity.CRITICAL or report.trust_score < 30:
            warning = WARNING_MESSAGES[IncidentSeverity.CRITICAL]

        logger.info(
            f"Proctoring incident: attempt={event.attempt_id} type={type_key} "
            f"penalty={penalty:.1f} trust_score={report.trust_score:.1f} risk={report.risk_level}"
        )

        return TelemetryEventResponse(
            success=True,
            incident_id=incident.id,
            incident_type=incident.incident_type,
            severity=severity,
            penalty_applied=penalty,
            current_trust_score=report.trust_score,
            total_incidents=report.total_incidents,
            warning_message=warning,
        )

    @classmethod
    def process_batch(cls, batch: TelemetryBatchRequest) -> TelemetryBatchResponse:
        """Process a batch of telemetry events efficiently."""
        processed = 0
        for event in batch.events:
            # Ensure attempt_id consistency
            event.attempt_id = batch.attempt_id
            cls.process_event(event)
            processed += 1

        report = repo.get_integrity_report(batch.attempt_id)
        trust = report.trust_score if report else 100.0
        total = report.total_incidents if report else 0
        risk = report.risk_level if report else "CLEAN"

        return TelemetryBatchResponse(
            success=True,
            processed_count=processed,
            current_trust_score=trust,
            total_incidents=total,
            risk_level=risk,
        )

    @classmethod
    def get_integrity_report(cls, attempt_id: str) -> IntegrityReportResponse:
        """Retrieve the full integrity report for an attempt."""
        report = repo.get_integrity_report(attempt_id)
        if not report:
            # No incidents recorded — clean report
            return IntegrityReportResponse(
                attempt_id=attempt_id,
                trust_score=100.0,
                total_incidents=0,
                incidents_by_type={},
                total_penalty=0.0,
                risk_level="CLEAN",
                incidents=[],
            )

        incident_items = [
            IncidentDetailItem(
                id=inc.id,
                incident_type=inc.incident_type,
                severity=inc.severity,
                penalty_points=inc.penalty_points,
                timestamp=inc.timestamp,
                description=inc.description,
                metadata=inc.metadata,
            )
            for inc in report.incidents
        ]

        return IntegrityReportResponse(
            attempt_id=attempt_id,
            trust_score=report.trust_score,
            total_incidents=report.total_incidents,
            incidents_by_type=report.incidents_by_type,
            total_penalty=report.total_penalty,
            risk_level=report.risk_level,
            incidents=incident_items,
        )

    @classmethod
    def get_integrity_summary(cls, attempt_id: str) -> IntegritySummaryResponse:
        """Retrieve a compact integrity summary for recruiter views."""
        report = repo.get_integrity_report(attempt_id)
        if not report:
            return IntegritySummaryResponse(
                attempt_id=attempt_id,
                trust_score=100.0,
                risk_level="CLEAN",
                total_incidents=0,
            )

        by_type = report.incidents_by_type
        return IntegritySummaryResponse(
            attempt_id=attempt_id,
            trust_score=report.trust_score,
            risk_level=report.risk_level,
            total_incidents=report.total_incidents,
            tab_switches=by_type.get("TAB_SWITCH", 0),
            window_blurs=by_type.get("WINDOW_BLUR", 0),
            paste_attempts=by_type.get("CLIPBOARD_PASTE", 0),
            fullscreen_exits=by_type.get("FULLSCREEN_EXIT", 0),
            face_missing_events=by_type.get("FACE_MISSING", 0),
            multiple_faces_events=by_type.get("MULTIPLE_FACES", 0),
        )

    @classmethod
    def detect_rapid_answer(cls, attempt_id: str, response_time_ms: int, threshold_ms: int = 2000) -> Optional[TelemetryEventResponse]:
        """
        Server-side detection of suspiciously fast responses.
        Called automatically when submitting answers.
        """
        if response_time_ms < threshold_ms and response_time_ms > 0:
            event = TelemetryEventRequest(
                attempt_id=attempt_id,
                event_type=IncidentType.RAPID_ANSWER,
                metadata={"response_time_ms": response_time_ms, "threshold_ms": threshold_ms},
            )
            return cls.process_event(event)
        return None

    @classmethod
    def _classify_risk(cls, trust_score: float) -> str:
        """Classify the risk level based on current trust score."""
        if trust_score >= 90:
            return "CLEAN"
        elif trust_score >= 70:
            return "LOW_RISK"
        elif trust_score >= 50:
            return "MEDIUM_RISK"
        elif trust_score >= 30:
            return "HIGH_RISK"
        else:
            return "FLAGGED"

    @classmethod
    def _generate_incident_description(cls, incident_type: IncidentType, occurrence: int, metadata: Dict) -> str:
        """Generate a human-readable description for the incident."""
        descriptions = {
            IncidentType.TAB_SWITCH: f"Tab switch detected (occurrence #{occurrence}). Candidate navigated away from the assessment window.",
            IncidentType.WINDOW_BLUR: f"Window blur detected (occurrence #{occurrence}). Assessment window lost focus.",
            IncidentType.CLIPBOARD_PASTE: f"Clipboard paste attempt detected (occurrence #{occurrence}). Paste content length: {metadata.get('paste_length', 'unknown')} characters.",
            IncidentType.FULLSCREEN_EXIT: f"Fullscreen exit detected (occurrence #{occurrence}). Candidate exited the proctored fullscreen environment.",
            IncidentType.FACE_MISSING: f"Face not detected (occurrence #{occurrence}). Duration: {metadata.get('duration_ms', 'unknown')}ms.",
            IncidentType.MULTIPLE_FACES: f"Multiple faces detected (occurrence #{occurrence}). Detected {metadata.get('face_count', '2+')} faces in frame.",
            IncidentType.RAPID_ANSWER: f"Suspiciously rapid response (occurrence #{occurrence}). Response time: {metadata.get('response_time_ms', 'unknown')}ms (threshold: {metadata.get('threshold_ms', '2000')}ms).",
            IncidentType.OBJECT_DETECTED: f"Prohibited object detected (occurrence #{occurrence}). Detected: {metadata.get('detected_object', 'mobile device/phone')} (confidence: {metadata.get('confidence', 0.85):.0%}).",
        }
        return descriptions.get(incident_type, f"Unknown incident type (occurrence #{occurrence}).")
