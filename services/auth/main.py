from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import jwt
import bcrypt
import logging
import asyncio
import os

from database import engine, SessionLocal, Base
import models
import schemas
from security import SECRET_KEY, ALGORITHM

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Innovation.ia - Auth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
ACCESS_TOKEN_EXPIRE_MINUTES = 60


async def check_db_ready():
    """Garante que o DB esteja pronto sem bloquear a thread principal do Uvicorn."""
    logger.info("📡 Iniciando verificação assíncrona do Banco de Dados...")
    max_retries = 30
    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            logger.info("✅ Conexão com o Banco de Dados estabelecida!")
            Base.metadata.create_all(bind=engine)

            db = SessionLocal()
            try:
                admin = db.query(models.User).filter(models.User.email == "admin@innovation.ia").first()
                if not admin:
                    logger.info("👤 Criando usuário admin padrão...")
                    salt = bcrypt.gensalt()
                    hashed = bcrypt.hashpw("admin123".encode('utf-8'), salt)
                    admin = models.User(
                        email="admin@innovation.ia",
                        full_name="Administrador Master",
                        role="admin",
                        hashed_password=hashed.decode('utf-8'),
                        is_active=True,
                        is_superuser=True
                    )
                    db.add(admin)
                    db.commit()
                    logger.info("✅ Admin criado com sucesso!")
            finally:
                db.close()
            break
        except Exception as e:
            logger.warning(f"⏳ Banco de Dados não está pronto. Tentativa {i+1}/{max_retries}. Erro: {str(e)[:50]}")
            await asyncio.sleep(3)


@app.on_event("startup")
async def startup_event():
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is not set")
    asyncio.create_task(check_db_ready())


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401)
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/auth/health")
async def health():
    return {"status": "healthy", "service": "auth-service"}


# ─────────────────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.full_name,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at
    }


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
async def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "is_new_user": False
    }


@app.post("/api/auth/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    # Harmonização 'name' -> 'full_name'
    real_name = user_data.name or user_data.full_name or "Usuário Innovation"

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(user_data.password.encode('utf-8'), salt)
    new_user = models.User(
        email=user_data.email,
        full_name=real_name,
        role=user_data.role or "candidate",
        hashed_password=hashed.decode('utf-8'),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.full_name,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "is_superuser": new_user.is_superuser,
        "created_at": new_user.created_at
    }


@app.post("/api/auth/forgot-password")
async def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Mock: evita 404 no Frontend
    db.query(models.User).filter(models.User.email == request.email).first()
    return {"message": "Se o e-mail existir, um link de recuperação será enviado."}


@app.post("/api/auth/reset-password")
async def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    # Mock: evita 404 no Frontend
    return {"message": "Senha redefinida com sucesso."}
