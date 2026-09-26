from redis.asyncio import Redis, from_url
from app.core.config import settings

redis_client: Redis = from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_timeout=3.0,
    socket_connect_timeout=3.0
)

async def check_redis_connection() -> bool:
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False
