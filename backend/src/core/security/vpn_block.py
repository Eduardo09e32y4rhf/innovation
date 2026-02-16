from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import httpx
import os
import logging

logger = logging.getLogger(__name__)

async def vpn_blocker_middleware(request: Request, call_next):
    """
    Middleware para bloqueio de VPNs, Proxies e IPs maliciosos.
    Ativado apenas se ENABLE_VPN_BLOCK=True no .env
    """
    client_ip = request.client.host
    
    # Em ambiente de desenvolvimento local, permitir localhost
    if client_ip in ["127.0.0.1", "::1", "localhost"]:
        return await call_next(request)
        
    # Verificar flag de segurança
    if os.getenv("ENABLE_VPN_BLOCK", "False").lower() == "true":
        # Ignorar verificação para rotas estáticas ou de health
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
             return await call_next(request)

        try:
            is_risky, reason = await check_ip_risk(client_ip)
            if is_risky:
                logger.warning(f"Blocked suspicious IP: {client_ip} ({reason})")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": f"Access denied: {reason}"}
                )
        except Exception as e:
            # Fail-open: Se api de verificação falhar, permite o acesso mas loga o erro
            logger.error(f"Failed to verify IP risk: {e}")

    response = await call_next(request)
    return response

async def check_ip_risk(ip: str) -> tuple[bool, str]:
    """Verifica se o IP é VPN/Proxy/Hosting usando ip-api (grátis)"""
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            # API Gratuita (limite 45 req/min) - Em prod, usar cache Redis
            url = f"http://ip-api.com/json/{ip}?fields=status,message,proxy,hosting"
            response = await client.get(url)
            data = response.json()
            
            if data.get("status") == "success":
                if data.get("proxy"):
                    return True, "VPN/Proxy Detected"
                if data.get("hosting"):
                    return True, "Datacenter/Hosting IP Detected"
        except Exception:
            pass # Fail open
            
    return False, ""
