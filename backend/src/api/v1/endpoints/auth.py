from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from typing import List, Optional

from core.dependencies import get_current_user, require_admin_role
from core.security import (
    create_temporary_token,
    verify_temporary_token,
    create_reset_token,
    verify_reset_token,
    get_password_hash,
)
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.schemas.auth import LoginRequest, RegisterRequest, Token, UserOut
from services.auth_service import authenticate_user, register_user
from services.two_factor_service import request_code, verify_code
from core.config import settings
import httpx
from core.security import create_access_token, create_refresh_token
from starlette.concurrency import run_in_threadpool

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return register_user(
            db,
            data.email,
            data.password,
            name=data.name,
            phone=data.phone,
            company_name=data.company_name,
            razao_social=data.razao_social,
            cnpj=data.cnpj,
            cidade=data.cidade,
            uf=data.uf,
            cep=data.cep,
            street=data.street,
            number=data.number,
            complement=data.complement,
            neighborhood=data.neighborhood,
            role=data.role or "candidate",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")  # Máximo 5 tentativas de login por minuto
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    result = authenticate_user(db, data.email, data.password)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    access_token, refresh_token, user = result

    # Se 2FA está habilitado, retorna temporary_token
    if user.two_factor_enabled:
        request_code(db, user.id, user.email, user.phone)
        temporary_token = create_temporary_token(user.id)
        return {
            "access_token": "",
            "refresh_token": "",
            "token_type": "bearer",
            "two_factor_required": True,
            "temporary_token": temporary_token,
        }

    from services.audit_service import log_event

    log_event(db, "LOGIN", user_id=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
    }


@router.post("/login/verify", response_model=Token)
@limiter.limit("3/minute")  # Máximo 3 tentativas de verificação por minuto
def verify_login_code(
    request: Request, temporary_token: str, code: str, db: Session = Depends(get_db)
):
    """
    Verifica código 2FA usando temporary_token em vez de user_id exposto.
    Isso previne enumeração de usuários.
    """
    user_id = verify_temporary_token(temporary_token)
    if not user_id:
        raise HTTPException(
            status_code=401, detail="Token temporário inválido ou expirado"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_code(db, user.id, code):
        raise HTTPException(status_code=401, detail="Código inválido ou expirado")

    # Autentica sem senha (2FA já verificado)
    result = authenticate_user(db, user.email, None, skip_password=True)
    if not result:
        raise HTTPException(status_code=500, detail="Erro na autenticação")

    access_token, refresh_token, _ = result
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
    }


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()


@router.post("/forgot-password")
async def forgot_password(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if user exists for security, just return success
        return {"message": "Se o email existir, um link de recuperação será enviado."}

    token = create_reset_token(user.id)
    # Em um app real, enviaria o e-mail aqui.
    # Por enquanto, apenas retornamos sucesso. O token seria incluído no link do e-mail.
    print(f"DEBUG: Password reset token for {email}: {token}")
    return {"message": "Link de recuperação enviado com sucesso."}


@router.post("/reset-password")
async def reset_password(data: dict, db: Session = Depends(get_db)):
    token = data.get("token")
    new_password = data.get("password")

    if not token or not new_password:
        raise HTTPException(
            status_code=400, detail="Token e nova senha são obrigatórios"
        )

    user_id = verify_reset_token(token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()

    return {"message": "Senha redefinida com sucesso."}


@router.get("/google-login")
async def google_login():
    """
    Retorna a URL para iniciar o fluxo OAuth com Google.
    """
    client_id = settings.GOOGLE_CLIENT_ID
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    scope = "openid email profile"

    if not client_id:
        raise HTTPException(status_code=500, detail="Google Client ID não configurado.")

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return {"url": auth_url}


@router.post("/google-callback", response_model=Token)
async def google_callback(code: str, db: Session = Depends(get_db)):
    """
    Troca o code pelo token, busca info do user e loga/registra.
    Retorna também 'role' e 'is_new_user' para o front decidir redirecionamento.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, detail="Google Credentials não configuradas."
        )

    # 1. Trocar code por token
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data=payload)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=400, detail=f"Falha ao obter token Google: {resp.text}"
            )

        token_data = resp.json()
        access_token = token_data.get("access_token")

        # 2. Obter dados do usuário
        user_info_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_info_resp.status_code != 200:
            raise HTTPException(
                status_code=400, detail="Falha ao obter dados do usuário Google"
            )

        user_info = user_info_resp.json()

    # 3. Logar ou Registrar
    email = user_info.get("email")
    name = user_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email não retornado pelo Google.")

    # Executar query síncrona em threadpool
    user = await run_in_threadpool(
        lambda: db.query(User).filter(User.email == email).first()
    )

    is_new_user = False

    if not user:
        is_new_user = True
        # Registrar novo usuário
        from services.auth_service import register_user
        import secrets

        random_password = secrets.token_urlsafe(16)

        # Executar registro síncrono em threadpool
        user = await run_in_threadpool(
            register_user,
            db,
            email,
            random_password,
            name=name,
            role="candidate",  # Default, front deve pedir dados extras se quiser virar Company
        )

    # 4. Gerar JWT do nosso app
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "is_new_user": is_new_user,
    }
