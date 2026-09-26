"""
HireLens Background Worker Architecture

Processes queued tasks from Redis:
- resume_processing
- ocr_fallback
- mcq_generation
- notification_dispatch
"""

import sys
import os
import json
import asyncio
import logging
from typing import Dict, Any, Optional

# Ensure backend modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.config import settings
from app.core.redis import redis_client, check_redis_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] worker: %(message)s")
logger = logging.getLogger("hirelens-worker")

QUEUE_NAME = "hirelens:task_queue"
PROCESSING_QUEUE = "hirelens:task_processing"
DEAD_LETTER_QUEUE = "hirelens:task_dlq"


class BackgroundWorker:
    def __init__(self):
        self.running = False

    async def handle_task(self, task: Dict[str, Any]) -> bool:
        task_type = task.get("type")
        payload = task.get("payload", {})
        task_id = task.get("task_id", "unknown")
        logger.info(f"Processing task [{task_id}] of type '{task_type}'")

        try:
            if task_type == "resume_processing":
                from app.services.resume_parser import ResumeParserService
                pdf_bytes = bytes.fromhex(payload.get("pdf_hex", "")) if "pdf_hex" in payload else b""
                user_id = payload.get("user_id", "")
                filename = payload.get("filename", "resume.pdf")
                if pdf_bytes and user_id:
                    await asyncio.to_thread(ResumeParserService.parse_resume, pdf_bytes, user_id, filename)
                logger.info(f"Completed resume_processing for task {task_id}")

            elif task_type == "ocr_fallback":
                from app.services.ocr_extractor import extract_text_with_ocr
                pdf_bytes = bytes.fromhex(payload.get("pdf_hex", "")) if "pdf_hex" in payload else b""
                if pdf_bytes:
                    await asyncio.to_thread(extract_text_with_ocr, pdf_bytes)
                logger.info(f"Completed ocr_fallback for task {task_id}")

            elif task_type == "mcq_generation":
                from app.services.hybrid_mcq_service import generate_questions_for_drive
                drive_id = payload.get("drive_id")
                if drive_id:
                    await asyncio.to_thread(generate_questions_for_drive, drive_id)
                logger.info(f"Completed mcq_generation for task {task_id}")

            elif task_type == "notification_dispatch":
                from app.services.notification_service import NotificationService
                from app.models.notification import NotificationType
                user_id = payload.get("user_id")
                n_type_str = payload.get("notification_type", "SYSTEM_ALERT")
                n_type = getattr(NotificationType, n_type_str, NotificationType.SYSTEM_ALERT)
                title = payload.get("title", "Notification")
                message = payload.get("message", "")
                metadata = payload.get("metadata", {})
                if user_id:
                    NotificationService.dispatch(
                        user_id=user_id,
                        notification_type=n_type,
                        title=title,
                        message=message,
                        metadata=metadata,
                    )
                logger.info(f"Completed notification_dispatch for task {task_id}")
            else:
                logger.warning(f"Unknown task type '{task_type}' for task {task_id}")
                return False

            return True
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}", exc_info=True)
            return False

    async def start(self):
        self.running = True
        logger.info("HireLens background worker started.")
        
        redis_available = await check_redis_connection()
        if not redis_available:
            logger.warning(
                "Redis connection is not reachable. Worker running in idle poll mode. "
                "Ensure REDIS_URL is configured and Redis service is running to consume queues."
            )

        while self.running:
            try:
                if redis_client is not None and await check_redis_connection():
                    # Blocking pop with 2s timeout
                    item = await redis_client.blpop(QUEUE_NAME, timeout=2)
                    if item:
                        _, raw_payload = item
                        try:
                            task = json.loads(raw_payload)
                            success = await self.handle_task(task)
                            if not success:
                                # Push to DLQ
                                await redis_client.rpush(DEAD_LETTER_QUEUE, raw_payload)
                        except json.JSONDecodeError as jde:
                            logger.error(f"Invalid JSON payload: {jde}")
                else:
                    await asyncio.sleep(2)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Worker queue polling error: {e}. Retrying in 2 seconds...")
                await asyncio.sleep(2)

    async def stop(self):
        logger.info("Stopping HireLens background worker...")
        self.running = False


if __name__ == "__main__":
    worker = BackgroundWorker()
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        asyncio.run(worker.stop())

