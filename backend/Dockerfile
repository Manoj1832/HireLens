# ====================================================================
# HIRELENS BACKEND DOCKERFILE — FASTAPI ASGI SERVICE (uv-powered)
# ====================================================================

FROM python:3.12-slim AS runner

WORKDIR /app

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install uv (ultra-fast Python package manager) + curl for healthcheck
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 hirelens && \
    useradd -u 1001 -g hirelens -m -s /bin/bash hirelens

# Install Python dependencies via uv (uses pyproject.toml)
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy backend application source code
COPY --chown=hirelens:hirelens . .

USER hirelens

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
