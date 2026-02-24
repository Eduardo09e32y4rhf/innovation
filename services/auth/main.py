from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import jwt
import bcrypt
import logging
import time
import os
import threading

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

def run_migrations_and_seed():
    """Executa a sincronização do banco em uma thread separada para não bloquear o startup"""
    logger.info("📡 Iniciando rotina de sincronização de banco de dados...")
    max_retries = 30
    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("✅ Conexão com DB OK. Sincronizando tabelas...")
            Base.metadata.create_all(bind=engine)
            
            db = SessionLocal()
            admin = db.query(models.User).filter(models.User.email == "admin@innovation.ia").first()
            if not admin:
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw("admin123".encode('utf-8'), salt)
                admin = models.User(
                    email="admin@innovation.ia",
                    full_name="Administrador Master",
                    hashed_password=hashed.decode('utf-8'),
                    is_active=True,
                    is_superuser=True
                )
                db.add(admin)
                db.commit()
                logger.info("👤 Admin padrão criado com sucesso!")
            db.close()
            logger.info("🎉 Rotina de DB concluída sem erros.")
            break
        except Exception as e:
            logger.warning(f"⏳ Aguardando DB ({i+1}/{max_retries})... erro: {str(e)[:50]}")
            time.sleep(3)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Auth Service Online (Iniciando thread de banco)...")
    thread = threading.Thread(target=run_migrations_and_seed)
    thread.start()

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
    return {"status": "healthy", "time": str(datetime.now())}

@app.get("/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/login")
async def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Credenciais incorretas")
    
    token_data = {"sub": str(user.id), "email": user.email, "exp": datetime.utcnow() + timedelta(minutes=60)}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "is_superuser": user.is_superuser}
    }
