# TODO: CAIXA PRETA - Criptografia Blindada + Git Protection

## ✅ 1. Dependencies
- [x] cryptography==43.0.1

## ✅ 2. BlackBox Service
- [x] security/blackbox.py (PBKDF2 + Fernet)

## ✅ 3. Model Update
- [x] user.py encrypted_data
- [x] Migration alembic/versions/

## ✅ 4. Secure Endpoints
- [x] /api/secure-data/{user_id} POST/GET/DELETE

## ✅ 5. Git Hooks
- [x] .pre-commit-config.yaml + block_secrets.py

## ⏳ 6. Frontend upload
## ⏳ 7. Headers CSP/HSTS

**Status:** Backend + Git protection ✅
**Instalar hooks:** pip install pre-commit && pre-commit install
**Test full:**
1. BLACKBOX_MASTER_KEY=... .env
2. alembic upgrade head
3. Backend rodando → POST /api/secure-data/1 file=texto → recebe encrypted
**Próximo:** Frontend form


