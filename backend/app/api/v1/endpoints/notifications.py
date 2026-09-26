"""
Notification API Endpoints (Phase 10).
Provides in-app notification feed, unread count, mark-as-read,
preferences management, and admin retry for failed email deliveries.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api import deps
from app.models.user import User, UserRole
from app.models.notification import NotificationChannel
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkReadRequest,
    MarkReadResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdateRequest,
    RetryFailedResponse,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Items per page"),
    current_user: User = Depends(deps.get_current_user),
):
    """Returns paginated notification feed for the authenticated user."""
    notifs, total, unread = NotificationService.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        page=page,
        page_size=page_size,
    )
    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                user_id=n.user_id,
                type=n.type,
                channel=n.channel,
                title=n.title,
                message=n.message,
                metadata=n.metadata,
                is_read=n.read_at is not None,
                read_at=n.read_at,
                delivery_status=n.delivery_status,
                created_at=n.created_at,
            )
            for n in notifs
        ],
        total_count=total,
        unread_count=unread,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(deps.get_current_user),
):
    """Quick badge count for navbar polling (30-second interval)."""
    count = NotificationService.get_unread_count(current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(deps.get_current_user),
):
    """Marks a single notification as read."""
    success = NotificationService.mark_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or not owned by current user.",
        )
    unread = NotificationService.get_unread_count(current_user.id)
    return MarkReadResponse(marked_count=1, unread_remaining=unread)


@router.post("/read-all", response_model=MarkReadResponse)
def mark_all_notifications_read(
    current_user: User = Depends(deps.get_current_user),
):
    """Marks all unread notifications as read for the authenticated user."""
    count = NotificationService.mark_all_as_read(current_user.id)
    return MarkReadResponse(marked_count=count, unread_remaining=0)


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(deps.get_current_user),
):
    """Returns the user's notification channel preferences."""
    prefs = NotificationService.get_preferences(current_user.id)
    return NotificationPreferencesResponse(
        user_id=prefs.user_id,
        email_enabled=prefs.email_enabled,
        in_app_enabled=prefs.in_app_enabled,
        muted_types=prefs.muted_types,
    )


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    req: NotificationPreferencesUpdateRequest,
    current_user: User = Depends(deps.get_current_user),
):
    """Updates the user's notification channel preferences."""
    prefs = NotificationService.update_preferences(
        user_id=current_user.id,
        email_enabled=req.email_enabled,
        in_app_enabled=req.in_app_enabled,
        muted_types=req.muted_types,
    )
    return NotificationPreferencesResponse(
        user_id=prefs.user_id,
        email_enabled=prefs.email_enabled,
        in_app_enabled=prefs.in_app_enabled,
        muted_types=prefs.muted_types,
    )


@router.post("/retry-failed", response_model=RetryFailedResponse)
def retry_failed_notifications(
    current_user: User = Depends(deps.require_role(UserRole.COLLEGE_ADMIN)),
):
    """Admin action: retries all failed email notifications that haven't exceeded max retries."""
    retried, still_failed = NotificationService.retry_failed_notifications()
    return RetryFailedResponse(retried_count=retried, still_failed_count=still_failed)
