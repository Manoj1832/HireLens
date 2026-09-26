from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, admin, student, resume, drives, applications, assessments, proctoring, predict, analytics, notifications

api_router = APIRouter()

# Register core endpoints
api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Identity"])
api_router.include_router(admin.router, prefix="/admin", tags=["College Administration"])
api_router.include_router(student.router, prefix="/student", tags=["Student Portal & Profiles"])
api_router.include_router(resume.router, prefix="/resumes", tags=["Resume Pipeline & Intelligence"])
api_router.include_router(drives.router, prefix="/drives", tags=["Recruitment Drives & Eligibility"])
api_router.include_router(applications.router, prefix="/applications", tags=["Student Applications"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Assessment Engine & Screening"])
api_router.include_router(proctoring.router, prefix="/proctoring", tags=["Proctoring & Integrity Telemetry"])
api_router.include_router(predict.router, prefix="/predict", tags=["Machine Learning & Placement Prediction"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["ML Placement Analytics & Cohort Forecasting"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications & Alerts"])


