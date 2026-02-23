from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import os

from database import get_db
from schemas import LoginRequest, RegisterRequest, Token, UserOut
from auth_logic import authenticate_user, register_user
from two_factor import request_code, verify_code
from security import create_temporary_token, verify_temporary_token, SECRET_KEY, ALGORITHM
from models import User
from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI(title="Innovation IA - Auth Service")
security = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=UserOut)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = register_user(
            db,
            email=data.email,
            password=data.password,
            name=data.name,
            role=data.role,
            phone=data.phone
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login", response_model=Token)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    result = authenticate_user(db, data.email, data.password)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    access_token, refresh_token, user = result

    if user.two_factor_enabled:
        request_code(db, user.id, user.email, user.phone)
        temp_token = create_temporary_token(user.id)
        return Token(
            access_token="",
            refresh_token="",
            token_type="bearer",
            two_factor_required=True,
            temporary_token=temp_token
        )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        role=user.role
    )

@app.post("/2fa/verify", response_model=Token)
async def verify_2fa(temporary_token: str, code: str, db: Session = Depends(get_db)):
    user_id = verify_temporary_token(temporary_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token temporário inválido ou expirado")
    
    if not verify_code(db, user_id, code):
        raise HTTPException(status_code=401, detail="Código inválido ou expirado")
    
    user = db.query(User).filter(User.id == user_id).first()
    # Login sem senha pois 2FA foi validado
    access_token, refresh_token, _ = authenticate_user(db, user.email, None, skip_password=True)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        role=user.role
    )

@app.post("/refresh")
async def refresh(refresh_token: str, db: Session = Depends(get_db)):
    from auth_logic import refresh_access_token
    new_token = refresh_access_token(db, refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Refresh token inválido ou expirado")
    return {"access_token": new_token, "token_type": "bearer"}

@app.post("/logout")
async def logout(refresh_token: str, db: Session = Depends(get_db)):
    from auth_logic import revoke_refresh_token
    revoke_refresh_token(db, refresh_token)
    return {"message": "Logout realizado com sucesso"}

@app.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
