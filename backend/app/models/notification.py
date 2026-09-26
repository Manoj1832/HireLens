"""
Notification Domain Models (Phase 10).
Complies with Master Build Specification Sections 72, 93-94, 105.
Provides:
- NotificationType: Exhaustive event type taxonomy for Student, Recruiter, Admin
- NotificationChannel: Delivery channel classification (IN_APP, EMAIL)
- DeliveryStatus: Lifecycle tracking for retry and audit
- Notification: Core domain entity with metadata, delivery state, retry, and timestamps
- NotificationPreferences: Per-user channel preferences
"""

from enum import Enum
from typing import Optional, Dict, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


class NotificationType(str, Enum):
    """Section 93: Exhaustive notification event taxonomy."""
    # Student-facing events
    DRIVE_PUBLISHED = "DRIVE_PUBLISHED"
    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED"
    APPLICATION_STATUS_CHANGED = "APPLICATION_STATUS_CHANGED"
    ASSESSMENT_SCHEDULED = "ASSESSMENT_SCHEDULED"
    ASSESSMENT_REMINDER = "ASSESSMENT_REMINDER"
    ASSESSMENT_COMPLETED = "ASSESSMENT_COMPLETED"
    CANDIDATE_SHORTLISTED = "CANDIDATE_SHORTLISTED"
    CANDIDATE_REJECTED = "CANDIDATE_REJECTED"

    # Recruiter-facing events
    NEW_APPLICATION = "NEW_APPLICATION"
    ASSESSMENT_RESULTS_READY = "ASSESSMENT_RESULTS_READY"
    INTEGRITY_REVIEW_REQUIRED = "INTEGRITY_REVIEW_REQUIRED"

    # Admin events
    SYSTEM_ALERT = "SYSTEM_ALERT"
    DRIVE_STATUS_CHANGED = "DRIVE_STATUS_CHANGED"


class NotificationChannel(str, Enum):
    """Delivery channel classification."""
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"


class DeliveryStatus(str, Enum):
    """Lifecycle delivery status with retry support (Section 105)."""
    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class Notification(BaseModel):
    """
    Core notification entity (Section 72).
    Fields: id, user_id, type, title, message, read_at, created_at,
    plus delivery tracking for email channel.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: NotificationType
    channel: NotificationChannel = NotificationChannel.IN_APP
    title: str
    message: str
    metadata: Dict = Field(default_factory=dict)  # drive_id, assessment_id, application_id, etc.
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_status: DeliveryStatus = DeliveryStatus.PENDING
    retry_count: int = 0
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationPreferences(BaseModel):
    """Per-user notification channel preferences."""
    user_id: str
    email_enabled: bool = True
    in_app_enabled: bool = True
    muted_types: List[NotificationType] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
