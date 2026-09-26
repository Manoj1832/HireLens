"""
Notification Schemas (Phase 10).
Pydantic request/response models for the Notification API endpoints.
"""

from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.notification import NotificationType, NotificationChannel, DeliveryStatus


class NotificationResponse(BaseModel):
    """Single notification item for feed display."""
    id: str
    user_id: str
    type: NotificationType
    channel: NotificationChannel
    title: str
    message: str
    metadata: Dict = Field(default_factory=dict)
    is_read: bool = False
    read_at: Optional[datetime] = None
    delivery_status: DeliveryStatus
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Paginated notification feed with unread count."""
    notifications: List[NotificationResponse]
    total_count: int
    unread_count: int
    page: int = 1
    page_size: int = 20


class UnreadCountResponse(BaseModel):
    """Quick badge count for navbar."""
    unread_count: int


class MarkReadRequest(BaseModel):
    """Mark one or multiple notifications as read."""
    notification_ids: List[str] = Field(default_factory=list)


class MarkReadResponse(BaseModel):
    """Response after marking notifications read."""
    marked_count: int
    unread_remaining: int


class NotificationPreferencesResponse(BaseModel):
    """User notification channel preferences."""
    user_id: str
    email_enabled: bool = True
    in_app_enabled: bool = True
    muted_types: List[NotificationType] = Field(default_factory=list)


class NotificationPreferencesUpdateRequest(BaseModel):
    """Update user notification preferences."""
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    muted_types: Optional[List[NotificationType]] = None


class RetryFailedResponse(BaseModel):
    """Response for admin retry failed notifications."""
    retried_count: int
    still_failed_count: int
