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
SECRET_KEY = os.getenv("SECRET_KEY", "innovation_v2_premium_dark")
ALGORITHM = "HS256"
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
                        role="admin", # Campo role incluído
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
    asyncio.create_task(check_db_ready())

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id: raise HTTPException(status_code=401)
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user: raise HTTPException(status_code=401)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "auth-service"}

@app.get("/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/login", response_model=schemas.TokenResponse)
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
    
    # Payload IDENTICO à versão Golden 29ac18b
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "is_new_user": False # Valor padrão para compatibilidade
    }

@app.post("/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing: raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(user_data.password.encode('utf-8'), salt)
    new_user = models.User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="candidate", # Default role
        hashed_password=hashed.decode('utf-8'),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
