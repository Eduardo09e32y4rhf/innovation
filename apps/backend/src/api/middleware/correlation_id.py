"""
Middleware de Correlação ID — Innovation.ia
──────────────────────────────────────────────
Gera ou propaga um X-Correlation-ID único em cada request.
Isso permite rastrear um erro que aparece no Frontend (400/500)
e encontrar exatamente o log correspondente no Backend.

Uso: O frontend pode enviar o header X-Correlation-ID,
ou o backend gera um novo UUID automaticamente.
"""

from __future__ import annotations

import uuid
import logging
import time
from contextvars import ContextVar

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("innovation.api")

# ContextVar permite acessar o correlation_id de qualquer lugar do código
# sem precisar passar o request como parâmetro
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Retorna o Correlation ID da requisição atual."""
    return correlation_id_ctx.get("")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware que:
    1. Lê o header X-Correlation-ID da requisição (se existir).
    2. Gera um novo UUID se não existir.
    3. Injeta o ID no contexto da requisição (ContextVar).
    4. Adiciona o ID na resposta para que o Frontend possa rastreá-lo.
    5. Loga início e fim de cada requisição com tempo de resposta.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Propaga o ID do frontend OU gera um novo
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

        # Injeta no contexto da requisição
        token = correlation_id_ctx.set(correlation_id)

        start_time = time.time()

        # Log de entrada
        logger.info(
            "[%s] ▶ %s %s",
            correlation_id,
            request.method,
            request.url.path,
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "[%s] ✗ %s %s | %dms | ERRO: %s",
                correlation_id,
                request.method,
                request.url.path,
                duration_ms,
                str(exc),
            )
            raise
        finally:
            correlation_id_ctx.reset(token)

        duration_ms = int((time.time() - start_time) * 1000)

        # Log de saída com status e tempo
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            "[%s] ◀ %s %s | %d | %dms",
            correlation_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        # Retorna o ID na resposta para rastreabilidade no frontend
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        return response
