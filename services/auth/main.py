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
SECRET_KEY = "innovation-super-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Iniciando Auth Service...")
    
    # Wait-for-DB Resiliência
    max_retries = 5
    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Conexão com o Banco de Dados estabelecida!")
            break
        except Exception as e:
            logger.warning(f"⏳ Banco não está pronto. Tentativa {i+1}/{max_retries}. Aguardando...")
            time.sleep(3)
    
    try:
        logger.info("📊 Criando tabelas no banco de dados...")
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        admin_user = db.query(models.User).filter(models.User.email == "admin@innovation.ia").first()
        if not admin_user:
            logger.info("👤 Criando usuário admin padrão...")
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw("admin123".encode('utf-8'), salt)
            
            admin_user = models.User(
                email="admin@innovation.ia",
                full_name="Administrador",
                hashed_password=hashed.decode('utf-8'),
                is_active=True,
                is_superuser=True,
                created_at=datetime.utcnow()
            )
            db.add(admin_user)
            db.commit()
            logger.info("✅ Usuário admin criado (admin@innovation.ia / admin123)")
        db.close()
    except Exception as e:
        logger.error(f"❌ Erro no startup: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# As rotas AQUI estão sem /api/auth, pois o Kong faz o strip_path
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
    
    token_data = {"sub": str(user.id), "email": user.email, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
