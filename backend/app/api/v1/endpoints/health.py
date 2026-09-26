from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.database import check_database_connection
from app.core.redis import check_redis_connection
from app.core.config import settings

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Basic liveness check."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV
    }

@router.get("/readiness")
async def readiness_check():
    """Readiness probe checking database and redis infrastructure."""
    db_ok = await check_database_connection()
    redis_ok = await check_redis_connection()

    all_ready = db_ok and redis_ok
    status_code = status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ready else "degraded",
            "components": {
                "database": "connected" if db_ok else "unreachable",
                "redis": "connected" if redis_ok else "unreachable"
            }
        }
    )
