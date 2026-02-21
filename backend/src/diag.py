#!/usr/bin/env python3
"""
Script de diagnóstico para identificar o erro exato de importação do backend.
Execute dentro do container com:
    docker exec innovation_ia-backend-1 python /app/src/diag.py
Ou no VPS, fora do container (se ele já caiu):
    docker run --rm --env-file .env.prod \
      -e DATABASE_URL=sqlite:///./test.db \
      -e SECRET_KEY=test \
      innovation_ia-backend-1 python /app/src/diag.py
"""

import sys
import traceback

print("=" * 60)
print("Innovation.ia - Diagnóstico de Importações")
print("=" * 60)
print(f"Python: {sys.version}")
print(f"PYTHONPATH: {sys.path}")
print()

modules_to_test = [
    ("fastapi", "FastAPI"),
    ("uvicorn", "uvicorn"),
    ("sqlalchemy", "create_engine"),
    ("pydantic_settings", "BaseSettings"),
    ("google.genai", "google.genai"),
    ("mercadopago", "mercadopago"),
    ("httpx", "httpx"),
    ("redis", "redis"),
    ("slowapi", "slowapi"),
    ("passlib", "passlib"),
    ("jose", "python-jose"),
]

print("--- Testando dependências externas ---")
for mod, label in modules_to_test:
    try:
        __import__(mod)
        print(f"  ✅ {label}")
    except ImportError as e:
        print(f"  ❌ {label}: {e}")

print()
print("--- Testando módulos internos ---")

internal_modules = [
    "core.config",
    "core.dependencies",
    "core.superintendent",
    "core.security.vpn_block",
    "domain.models",
    "infrastructure.database.sql.session",
    "infrastructure.database.sql.dependencies",
    "services.auth_service",
    "api.v1.endpoints.auth",
    "api.v1.endpoints.jobs",
    "api.v1.endpoints.payments",
    "api.v1.endpoints.enterprise",
    "api.v1.endpoints.csc_advanced",
    "api.v1.endpoints.rh_advanced",
    "api.v1.endpoints.finance_advanced",
    "api.v1.endpoints.projects_advanced",
    "api.v1.endpoints.killer_questions",
    "api.main",
]

for mod in internal_modules:
    try:
        __import__(mod)
        print(f"  ✅ {mod}")
    except Exception as e:
        print(f"  ❌ {mod}")
        print(f"      → {type(e).__name__}: {e}")
        traceback.print_exc()
        print()

print()
print("=" * 60)
print("Diagnóstico concluído.")
