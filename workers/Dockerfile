# ====================================================================
# HIRELENS WORKER DOCKERFILE — BACKGROUND PROCESSING SERVICE (uv-powered)
# ====================================================================

FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install uv (ultra-fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Install tesseract-ocr for resume fallback processing
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tesseract-ocr \
        libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 hirelens && \
    useradd -u 1001 -g hirelens -m -s /bin/bash hirelens

# Install Python dependencies via uv (uses pyproject.toml)
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy worker code
COPY --chown=hirelens:hirelens . .

USER hirelens

CMD ["python3", "job_runner.py"]
