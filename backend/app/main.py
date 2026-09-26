import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.api.v1.endpoints.health import health_check, readiness_check

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hirelens")

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        description="Production-Ready College Recruitment & Assessment Platform",
        version="1.0.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None
    )

    # CORS configuration
    origins = [
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if settings.APP_ENV != "production" else None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    # Global unhandled exception handler
    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error processing {request.method} {request.url}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred while processing your request. Please try again shortly."
                }
            }
        )

    # Direct top-level health checks
    application.add_api_route("/health", health_check, methods=["GET"], tags=["Health"])
    application.add_api_route("/readiness", readiness_check, methods=["GET"], tags=["Health"])

    # Versioned API routes
    application.include_router(api_router, prefix="/api/v1")

    return application

app = create_application()
