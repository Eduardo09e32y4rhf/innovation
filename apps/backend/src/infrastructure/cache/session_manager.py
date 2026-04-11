from .redis_client import redis_client
from typing import Any, Optional


class CacheManager:
    @staticmethod
    async def get_candidate_data(candidate_id: int) -> Optional[Any]:
        return await redis_client.get(f"candidate:{candidate_id}")

    @staticmethod
    async def set_candidate_data(candidate_id: int, data: Any, expire: int = 1800):
        await redis_client.set(f"candidate:{candidate_id}", data, expire=expire)

    @staticmethod
    async def get_ai_analysis(candidate_id: int, job_id: int) -> Optional[Any]:
        return await redis_client.get(f"analysis:{candidate_id}:{job_id}")

    @staticmethod
    async def set_ai_analysis(candidate_id: int, job_id: int, analysis: Any):
        await redis_client.set(
            f"analysis:{candidate_id}:{job_id}", analysis, expire=7200
        )  # 2h cache


cache_manager = CacheManager()
