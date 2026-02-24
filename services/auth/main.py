"""
Innovation.ia - Auth Service (Resilient Version)
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import jwt
import bcrypt
import logging
import os
import time

# Imports locais
from database import engine, SessionLocal, Base
import models
import schemas

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Innovation.ia - Auth Service")

# CORS (Backend side safety)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

@app.on_event("startup")
async def startup_event():
    """Startup resiliente: aguarda o banco de dados"""
    logger.info("🚀 Iniciando Auth Service...")
    
    max_retries = 10
    retry_count = 0
    connected = False
    
    while not connected and retry_count < max_retries:
        try:
            # Testa conexão
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            connected = True
            logger.info("✅ Conexão com o banco estabelecida!")
        except Exception as e:
            retry_count += 1
            logger.warning(f"⚠️ Aguardando banco de dados ({retry_count}/{max_retries})...")
            time.sleep(3)
    
    if not connected:
        logger.error("❌ Não foi possível conectar ao banco após várias tentativas.")
        return

    try:
        # Sincroniza Tabelas
        Base.metadata.create_all(bind=engine)
        logger.info("📊 Tabelas sincronizadas!")
        
        # Seed Admin
        db = SessionLocal()
        try:
            admin_email = "admin@innovation.ia"
            admin = db.query(models.User).filter(models.User.email == admin_email).first()
            if not admin:
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw("admin123".encode('utf-8'), salt)
                new_admin = models.User(
                    email=admin_email,
                    full_name="Administrador Master",
                    hashed_password=hashed.decode('utf-8'),
                    is_active=True,
                    is_superuser=True
                )
                db.add(new_admin)
                db.commit()
                logger.info(f"✅ Admin criado: {admin_email} / admin123")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Erro no processamento de startup: {e}")

# ... (Resto das rotas permanecem iguais, focadas no /login, /register, etc)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/login")
async def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"🔑 Tentativa de login: {credentials.email}")
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        logger.warning(f"❌ Falha de login para: {credentials.email}")
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    token_data = {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name}
    }

@app.post("/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(user_data.password.encode('utf-8'), salt)
    new_user = models.User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed.decode('utf-8')
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
