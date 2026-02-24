"""
Innovation.ia - Auth Service
Microserviço de Autenticação (Corrigido)
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
import bcrypt
import logging
import os

# Imports locais
from database import engine, SessionLocal, Base
import models
import schemas

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Criar app
app = FastAPI(
    title="Innovation.ia - Auth Service",
    description="Serviço de Autenticação",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Configurações JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ============================================
# STARTUP: CRIAR TABELAS E SEED (SELF-HEALING)
# ============================================

@app.on_event("startup")
async def startup_event():
    """Inicialização do serviço com Self-Healing"""
    logger.info("🚀 Iniciando Auth Service...")
    
    try:
        # 1. Criar todas as tabelas (Garante que se o banco subir do zero, as tabelas nasçam)
        logger.info("📊 Verificando/Criando tabelas no banco de dados...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tabelas sincronizadas!")
        
        # 2. Seed do Admin (Garante First-Time UX)
        db = SessionLocal()
        try:
            admin_email = "admin@innovation.ia"
            admin_user = db.query(models.User).filter(models.User.email == admin_email).first()
            
            if not admin_user:
                logger.info(f"👤 Criando usuário admin padrão ({admin_email})...")
                
                # Hash da senha padrão: admin123
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw("admin123".encode('utf-8'), salt)
                
                admin_user = models.User(
                    email=admin_email,
                    full_name="Administrador Master",
                    hashed_password=hashed.decode('utf-8'),
                    is_active=True,
                    is_superuser=True,
                    created_at=datetime.utcnow()
                )
                
                db.add(admin_user)
                db.commit()
                logger.info("✅ Usuário admin criado: admin@innovation.ia / admin123")
            else:
                logger.info("✅ Usuário admin já existe.")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Erro crítico no startup: {e}")

# ============================================
# DEPENDENCIES
# ============================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ============================================
# ROTAS LIMPAS (Kong strip_path remove /api/auth)
# ============================================

@app.get("/health")
async def health_check():
    """Health check para o Docker e Kong"""
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"status": "healthy", "service": "auth-service", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service Unhealthy")

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
        hashed_password=hashed.decode('utf-8'),
        is_active=True,
        is_superuser=False,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login")
async def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuário desativado")
    
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_superuser": user.is_superuser
        }
    }

@app.get("/me", response_model=schemas.UserResponse)
async def get_current_user(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

# Rotas de Depuração (Remover em produção real)
@app.get("/debug/users")
async def list_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"id": u.id, "email": u.email, "is_active": u.is_active} for u in users]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
