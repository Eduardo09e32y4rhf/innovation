"""
Innovation IA - Backend Server Simples
====================================
Servidor minimalista para testes local do Desktop App
Executar: python backend/server.py
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

app = FastAPI(title="Innovation IA API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODELOS
# ============================================

class User(BaseModel):
    id: int
    name: str
    email: str
    password: str
    profile: str = "admin"
    companyId: int = 1

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: dict
    token: str
    company: dict

class Ticket(BaseModel):
    id: int
    ticketId: str
    contactId: int
    contactName: str
    status: str = "open"
    queueId: Optional[int] = None
    userId: Optional[int] = None

class Message(BaseModel):
    id: int
    ticketId: int
    message: str
    fromMe: bool = False
    mediaUrl: Optional[str] = None

# ============================================
# DADOS MOCKADOS
# ============================================

# Usuários mock (em memória)
MOCK_USERS = [
    {"id": 1, "name": "Eduardo Innovation", "email": "admin@innovation.ia", "password": "admin123", "profile": "admin", "companyId": 1},
    {"id": 2, "name": "Atendente João", "email": "joao@innovation.ia", "password": "att123", "profile": "attendant", "companyId": 1},
]

# Empresas mock
MOCK_COMPANIES = [
    {"id": 1, "name": "Innovation IA", "phone": "+5511999999999", "email": "contato@innovation.ia", "status": "active", "plan": "enterprise"},
]

WHATSAPP_STATE = {
    "instance": "whatsapp-1",
    "session": "whatsapp-session-1",
    "status": "DISCONNECTED",
    "qr": None,
    "user": None,
}

# Tickets mock (Atendimentos)
MOCK_TICKETS = [
    {"id": 1, "ticketId": "WA-001", "contactId": 1, "contactName": "Cliente João Silva", "status": "open", "queueId": 1, "userId": 1, "createdAt": "2026-01-15T10:30:00Z"},
    {"id": 2, "ticketId": "WA-002", "contactId": 2, "contactName": "Maria Santos", "status": "pending", "queueId": 1, "userId": 1, "createdAt": "2026-01-15T11:00:00Z"},
    {"id": 3, "ticketId": "WA-003", "contactId": 3, "contactName": "Pedro Costa", "status": "closed", "queueId": 2, "userId": 2, "createdAt": "2026-01-14T09:00:00Z"},
]

# ⚡ Bolt: O(1) dictionary for fast ticket lookups by ID
TICKETS_MAP = {ticket["id"]: ticket for ticket in MOCK_TICKETS}

# Filas mock
MOCK_QUEUES = [
    {"id": 1, "name": "Suporte Geral", "color": "#8B5CF6"},
    {"id": 2, "name": "Financeiro", "color": "#10B981"},
    {"id": 3, "name": "Vendas", "color": "#F59E0B"},
]

# Contatos mock
MOCK_CONTACTS = [
    {"id": 1, "name": "João Silva", "number": "+5511999999001", "email": "joao@email.com"},
    {"id": 2, "name": "Maria Santos", "number": "+5511999999002", "email": "maria@email.com"},
    {"id": 3, "name": "Pedro Costa", "number": "+5511999999003", "email": "pedro@email.com"},
]

# Mensagens mock
MOCK_MESSAGES = [
    {"id": 1, "ticketId": 1, "message": "Olá, preciso de ajuda!", "fromMe": False, "createdAt": "2026-01-15T10:30:00Z"},
    {"id": 2, "ticketId": 1, "message": "Olá! Claro, em que posso ajudar?", "fromMe": True, "createdAt": "2026-01-15T10:31:00Z"},
]

# ============================================
# UTILITÁRIOS
# ============================================

def generate_token(user_id: int) -> str:
    """Gera token simples"""
    data = f"{user_id}:{datetime.now().isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Verifica token (simplificado - DISABLED para demo)"""
    # Aceita qualquer request (demo mode)
    return {"userId": 1, "companyId": 1}

# ============================================
# ENDPOINTS - AUTH
# ============================================

@app.get("/")
def root():
    return {"status": "ok", "version": "1.0.0", "message": "Innovation IA API"}

@app.post("/api/auth/login")
def login(data: LoginRequest):
    """Login simples"""
    for user in MOCK_USERS:
        if user["email"] == data.email and user["password"] == data.password:
            token = generate_token(user["id"])
            return LoginResponse(
                user=user,
                token=token,
                company=MOCK_COMPANIES[0]
            )
    raise HTTPException(status_code=401, detail="Credenciais inválidas")

@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    """Pegar usuário atual"""
    user = verify_token(authorization)
    return MOCK_USERS[0]

# ============================================
# ENDPOINTS - COMPANIES
# ============================================

@app.get("/api/companies")
@app.get("/api/companies/listPlan/{plan_id}")
def get_companies(authorization: Optional[str] = Header(None), plan_id: Optional[str] = None):
    """Listar empresas + listPlan support"""
    verify_token(authorization)
    return MOCK_COMPANIES

@app.get("/companies/listPlan/{plan_id}")
def get_plans(plan_id: Optional[str] = None):
    """Companies plan endpoint"""
    return [{"id": 1, "name": "Enterprise", "price": 99}]

@app.get("/api/companies/{company_id}")
def get_company(company_id: int, authorization: Optional[str] = Header(None)):
    """Pegar empresa"""
    verify_token(authorization)
    for company in MOCK_COMPANIES:
        if company["id"] == company_id:
            return company
    raise HTTPException(status_code=404, detail="Empresa não encontrada")

# ============================================
# ENDPOINTS - TICKETS (ATENDIMENTOS)
# ============================================

@app.get("/api/tickets")
def get_tickets(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Listar tickets"""
    verify_token(authorization)
    if status:
        return [t for t in MOCK_TICKETS if t["status"] == status]
    return MOCK_TICKETS

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: int, authorization: Optional[str] = Header(None)):
    """Pegar ticket"""
    verify_token(authorization)

    # ⚡ Bolt: Use O(1) dictionary lookup instead of O(N) list iteration
    ticket = TICKETS_MAP.get(ticket_id)
    if ticket:
        return ticket

    raise HTTPException(status_code=404, detail="Ticket não encontrado")

@app.post("/api/tickets")
def create_ticket(
    contactId: int,
    contactName: str,
    queueId: Optional[int] = None,
    authorization: Optional[str] = Header(None)
):
    """Criar ticket"""
    verify_token(authorization)
    new_id = len(MOCK_TICKETS) + 1
    new_ticket = {
        "id": new_id,
        "ticketId": f"WA-{new_id:03d}",
        "contactId": contactId,
        "contactName": contactName,
        "status": "open",
        "queueId": queueId,
        "userId": None,
        "createdAt": datetime.now().isoformat()
    }
    MOCK_TICKETS.append(new_ticket)

    # ⚡ Bolt: Keep TICKETS_MAP synchronized with MOCK_TICKETS
    TICKETS_MAP[new_id] = new_ticket

    return new_ticket

@app.put("/api/tickets/{ticket_id}")
def update_ticket(
    ticket_id: int,
    status: Optional[str] = None,
    userId: Optional[int] = None,
    queueId: Optional[int] = None,
    authorization: Optional[str] = Header(None)
):
    """Atualizar ticket"""
    verify_token(authorization)

    # ⚡ Bolt: Use O(1) dictionary lookup instead of O(N) list iteration
    ticket = TICKETS_MAP.get(ticket_id)
    if ticket:
        if status:
            ticket["status"] = status
        if userId:
            ticket["userId"] = userId
        if queueId:
            ticket["queueId"] = queueId
        return ticket

    raise HTTPException(status_code=404, detail="Ticket não encontrado")

# ============================================
# ENDPOINTS - MESSAGES
# ============================================

@app.get("/api/tickets/{ticket_id}/messages")
def get_messages(
    ticket_id: int,
    authorization: Optional[str] = Header(None)
):
    """Listar mensagens do ticket"""
    verify_token(authorization)
    return [m for m in MOCK_MESSAGES if m["ticketId"] == ticket_id]

@app.post("/api/tickets/{ticket_id}/messages")
def send_message(
    ticket_id: int,
    message: str,
    fromMe: bool = True,
    authorization: Optional[str] = Header(None)
):
    """Enviar mensagem"""
    verify_token(authorization)
    new_id = len(MOCK_MESSAGES) + 1
    new_msg = {
        "id": new_id,
        "ticketId": ticket_id,
        "message": message,
        "fromMe": fromMe,
        "createdAt": datetime.now().isoformat()
    }
    MOCK_MESSAGES.append(new_msg)
    return new_msg

# ============================================
# ENDPOINTS - QUEUES
# ============================================

@app.get("/api/queues")
def get_queues(authorization: Optional[str] = Header(None)):
    """Listar filas"""
    verify_token(authorization)
    return MOCK_QUEUES

# ============================================
# ENDPOINTS - CONTACTS
# ============================================

@app.get("/api/contacts")
def get_contacts(authorization: Optional[str] = Header(None)):
    """Listar contatos"""
    verify_token(authorization)
    return MOCK_CONTACTS

@app.get("/api/contacts/{contact_id}")
def get_contact(contact_id: int, authorization: Optional[str] = Header(None)):
    """Pegar contato"""
    verify_token(authorization)
    for contact in MOCK_CONTACTS:
        if contact["id"] == contact_id:
            return contact
    raise HTTPException(status_code=404, detail="Contato não encontrado")

# ============================================
# ENDPOINTS - USERS
# ============================================

@app.get("/api/users")
def get_users(authorization: Optional[str] = Header(None)):
    """Listar usuários"""
    verify_token(authorization)
    return MOCK_USERS

@app.get("/api/users/{user_id}")
def get_user(user_id: int, authorization: Optional[str] = Header(None)):
    """Pegar usuário"""
    verify_token(authorization)
    for user in MOCK_USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="Usuário não encontrado")

@app.put("/api/users/{user_id}")
def update_user(
    user_id: int,
    name: Optional[str] = None,
    email: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Atualizar usuário"""
    verify_token(authorization)
    for user in MOCK_USERS:
        if user["id"] == user_id:
            if name:
                user["name"] = name
            if email:
                user["email"] = email
            return user
    raise HTTPException(status_code=404, detail="Usuário não encontrado")

# ============================================
# ENDPOINTS - LANGUAGE
# ============================================

@app.post("/api/users/set-language/{lang}")
def set_language(
    lang: str,
    authorization: Optional[str] = Header(None)
):
    """Definir idioma do usuário"""
    verify_token(authorization)
    return {"message": "Idioma atualizado", "language": lang}

# Alias sem /api (para compatibilidade)
@app.post("/users/set-language/{lang}")
def set_language_alias(
    lang: str,
    authorization: Optional[str] = Header(None)
):
    """Definir idioma do usuário (alias)"""
    verify_token(authorization)
    return {"message": "Idioma atualizado", "language": lang}

@app.get("/api/users/{user_id}/settings")
def get_user_settings(
    user_id: int,
    authorization: Optional[str] = Header(None)
):
    """Pegar configurações do usuário"""
    verify_token(authorization)
    return {
        "language": "pt",
        "theme": "dark",
        "queues": []
    }

@app.put("/api/users/{user_id}/settings")
def update_user_settings(
    user_id: int,
    language: Optional[str] = None,
    theme: Optional[str] = None,
    queues: Optional[List[int]] = None,
    authorization: Optional[str] = Header(None)
):
    """Atualizar configurações do usuário"""
    verify_token(authorization)
    return {
        "language": language or "pt",
        "theme": theme or "dark",
        "queues": queues or []
    }

# ============================================
# ENDPOINTS - TENANT/STATS
# ============================================

@app.get("/api/tenant/stats")
def get_tenant_stats(authorization: Optional[str] = Header(None)):
    """Estatísticas do tenant (para dashboard)"""
    verify_token(authorization)
    return {
        "totalTickets": len(MOCK_TICKETS),
        "openTickets": len([t for t in MOCK_TICKETS if t["status"] == "open"]),
        "pendingTickets": len([t for t in MOCK_TICKETS if t["status"] == "pending"]),
        "closedTickets": len([t for t in MOCK_TICKETS if t["status"] == "closed"]),
        "totalContacts": len(MOCK_CONTACTS),
        "totalUsers": len(MOCK_USERS),
        "totalQueues": len(MOCK_QUEUES),
    }

# ============================================
# ENDPOINTS - WHATSAPP
# ============================================

@app.get("/api/whatsapp")
def get_whatsapp_instances(session: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Listar instâncias WhatsApp com query param ?session"""
    verify_token(authorization)
    instances = [
        {
            "id": "whatsapp-1",
            "name": "Principal",
            "status": "connected",
            "session": "whatsapp-session-1",
            "qrcode": None,
            "connectedAt": "2026-01-15T10:00:00Z",
            "phoneNumber": "+5511999999999"
        }
    ]
    return instances

@app.get("/api/whatsapp/status")
def whatsapp_status(authorization: Optional[str] = Header(None)):
    """Status WhatsApp"""
    verify_token(authorization)
    return {
        "status": WHATSAPP_STATE["status"],
        "instance": WHATSAPP_STATE["instance"],
        "session": WHATSAPP_STATE["session"],
        "qr": WHATSAPP_STATE["qr"],
        "user": WHATSAPP_STATE["user"],
    }

@app.post("/api/whatsapp/connect")
def connect_whatsapp(authorization: Optional[str] = Header(None)):
    """Conectar WhatsApp"""
    verify_token(authorization)
    WHATSAPP_STATE["status"] = "PAIRING"
    WHATSAPP_STATE["qr"] = f"innovation-ia-demo:{WHATSAPP_STATE['session']}:{int(datetime.now().timestamp())}"
    return {
        "session": WHATSAPP_STATE["session"],
        "status": WHATSAPP_STATE["status"],
        "qr": WHATSAPP_STATE["qr"],
        "qrcode": WHATSAPP_STATE["qr"],
        "instance": WHATSAPP_STATE["instance"],
        "message": "Escaneie o QR Code para conectar"
    }

@app.post("/api/whatsapp/disconnect")
def disconnect_whatsapp(authorization: Optional[str] = Header(None)):
    """Desconectar WhatsApp"""
    verify_token(authorization)
    WHATSAPP_STATE["status"] = "DISCONNECTED"
    WHATSAPP_STATE["qr"] = None
    WHATSAPP_STATE["user"] = None
    return {"status": WHATSAPP_STATE["status"], "instance": WHATSAPP_STATE["instance"]}

@app.get("/api/whatsapp/{instance_id}")
def get_instance(instance_id: str, authorization: Optional[str] = Header(None)):
    """Get specific instance"""
    verify_token(authorization)
    return {"id": instance_id, "status": "connected"}

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    print("\n" + "="*50)
    print("Innovation IA Backend")
    print("http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 50 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
