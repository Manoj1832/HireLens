import logging
from typing import Optional
from redis.asyncio import Redis, from_url
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_url = settings.REDIS_URL
if _redis_url.startswith("https://") or _redis_url.startswith("http://"):
    logger.warning(
        f"REDIS_URL ({_redis_url}) uses HTTP(S). Standard Redis protocol requires redis:// or rediss://. "
        "Falling back to local redis://localhost:6379/0."
    )
    _redis_url = "redis://localhost:6379/0"

try:
    redis_client: Optional[Redis] = from_url(
        _redis_url,
        decode_responses=True,
        socket_timeout=3.0,
        socket_connect_timeout=3.0
    )
except Exception as e:
    logger.warning(f"Could not initialize Redis client: {e}")
    redis_client = None

async def check_redis_connection() -> bool:
    if redis_client is None:
        return False
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False
