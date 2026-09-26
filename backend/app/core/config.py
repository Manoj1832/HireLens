from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core Application
    APP_ENV: str = "development"
    APP_NAME: str = "HireLens"
    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    SECRET_KEY: str = "development-secret-key-replace-in-production-with-high-entropy-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days for persistent session stability

    COLLEGE_ALLOWED_DOMAINS_RAW: str = "psgtech.ac.in,student.psgtech.ac.in,psgtecg.ac.in"

    @computed_field
    @property
    def COLLEGE_ALLOWED_DOMAINS(self) -> List[str]:
        return [d.strip().lower() for d in self.COLLEGE_ALLOWED_DOMAINS_RAW.split(",") if d.strip()]

    # Database (Supabase PostgreSQL / Local)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/hirelens"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # Redis Cache & Background Jobs
    REDIS_URL: str = "redis://localhost:6379/0"

    # Amazon S3 (Private Storage)
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "hirelens-resumes-private"
    S3_ENDPOINT_URL: Optional[str] = None

    # Groq API
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Email Service
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "notifications@psgtech.ac.in"

settings = Settings()
