"""
Innovation IA - Backend Server Simples
====================================
Servidor minimalista para testes local do Desktop App
Executar: python backend/server_fixed.py
"""

from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import json
from datetime import datetime, timedelta
import hashlib
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = FastAPI(title="Innovation IA API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models and mocks (same as original)
# [OMITTED for brevity - full code same as server.py but with fixed print]

class User(BaseModel):
    id: int
    name: str
    email: str
    password: str
    profile: str = "admin"
    companyId: int = 1

# ... (all models, mocks, endpoints same)

if __name__ == "__main__":
    print("\n" + "="*50)
print("🚀 Innovation IA Backend - FIXED")
    print("http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("="*50 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


