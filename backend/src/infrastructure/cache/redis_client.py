import redis.asyncio as redis
from core.config import settings
import json
from typing import Any, Optional

class RedisClient:
    def __init__(self):
        # Em produção, usar REDIS_URL do .env
        self.redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        self._redis: Optional[redis.Redis] = None

    async def connect(self):
        if not self._redis:
            self._redis = await redis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
        return self._redis

    async def get(self, key: str) -> Any:
        client = await self.connect()
        data = await client.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        client = await self.connect()
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await client.set(key, value, ex=expire)

    async def delete(self, key: str):
        client = await self.connect()
        await client.delete(key)

redis_client = RedisClient()
