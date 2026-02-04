from __future__ import annotations

import random
import time


_CODE_TTL_SECONDS = 300
_CODE_STORE: dict[int, tuple[str, float]] = {}


def request_code(user_id: int, email: str | None, phone: str | None) -> str:
    code = f"{random.randint(0, 999999):06d}"
    expires_at = time.time() + _CODE_TTL_SECONDS
    _CODE_STORE[user_id] = (code, expires_at)
    return code


def verify_code(user_id: int, code: str) -> bool:
    stored = _CODE_STORE.get(user_id)
    if not stored:
        return False
    stored_code, expires_at = stored
    if time.time() > expires_at:
        _CODE_STORE.pop(user_id, None)
        return False
    if stored_code != code:
        return False
    _CODE_STORE.pop(user_id, None)
    return True
