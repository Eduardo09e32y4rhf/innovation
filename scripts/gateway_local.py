"""
gateway_local.py — Mini proxy/gateway local substituto do Kong
Roda na porta 8000 e roteia:
  /api/auth/*  → http://localhost:8001
  /api/ai/*    → http://localhost:8002
  /api/core/*  → http://localhost:8003

Uso: python gateway_local.py
"""

import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn

app = FastAPI(title="Innovation.ia — Local Gateway")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
allow_all_origins = allowed_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "X-Correlation-ID"],
)

ROUTES = {
    "/api/auth": "http://localhost:8001",
    "/api/ai": "http://localhost:8002",
    "/api/core": "http://localhost:8003",
}


async def proxy(request: Request, target_base: str):
    url = target_base + str(request.url.path)
    if request.url.query:
        url += "?" + request.url.query

    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
            )
            # Para SSE (streaming), usar StreamingResponse
            content_type = resp.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                return StreamingResponse(
                    resp.aiter_bytes(),
                    status_code=resp.status_code,
                    headers=dict(resp.headers),
                    media_type="text/event-stream",
                )
            return JSONResponse(
                content=resp.json() if "json" in content_type else resp.text,
                status_code=resp.status_code,
                headers={
                    k: v
                    for k, v in resp.headers.items()
                    if k.lower() not in ["content-encoding", "transfer-encoding"]
                },
            )
        except httpx.ConnectError:
            return JSONResponse(
                {
                    "error": f"Serviço em {target_base} não está disponível. Verifique se o backend está rodando."
                },
                status_code=503,
            )


@app.api_route(
    "/api/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def auth_proxy(request: Request, path: str):
    return await proxy(request, "http://localhost:8001")


@app.api_route(
    "/api/ai/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
)
async def ai_proxy(request: Request, path: str):
    return await proxy(request, "http://localhost:8002")


@app.api_route(
    "/api/core/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def core_proxy(request: Request, path: str):
    return await proxy(request, "http://localhost:8003")


@app.get("/")
async def root():
    return {
        "gateway": "Innovation.ia Local Gateway",
        "routes": {
            "/api/auth/*": "http://localhost:8001",
            "/api/ai/*": "http://localhost:8002",
            "/api/core/*": "http://localhost:8003",
        },
    }


if __name__ == "__main__":
    uvicorn.run("gateway_local:app", host="0.0.0.0", port=8000, reload=False)
