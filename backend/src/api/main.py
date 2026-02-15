import os
from fastapi import FastAPI, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from api.v1.endpoints import (
    jobs,
    applications,
    ai,
    matching,
    auth,
    dashboard,
    interviews,
    ai_services,
    projects,
    rh,
    finance,
    support,
    payments,
)
import domain.models  # Garante o registro de todos os modelos
from core.config import settings

# Iniciar App
from contextlib import asynccontextmanager
from core.superintendent import superintendent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Superintendent AI
    print("🤖 Innovation.ia Superintendent: Online")
    await superintendent.run_check()
    yield
    # Shutdown
    print("🤖 Innovation.ia Superintendent: Offline")


app = FastAPI(title="Innovation.ia - Elite Recruitment", lifespan=lifespan)

# Configuração do Gemini
# Configuração do Gemini
GEMINI_API_KEY = settings.GEMINI_API_KEY
model_gemini = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model_gemini = genai.GenerativeModel("gemini-pro")
    except Exception as e:
        print(f"Aviso: Falha ao configurar Gemini AI (Pode estar depreciado): {e}")

# Configuração de Caminhos (Ajustado para a nova estrutura Enterprise)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Busca pastas do frontend no novo local
WEB_MARKETING = os.path.abspath(os.path.join(BASE_DIR, "../../../frontend/marketing"))
WEB_ADMIN = WEB_MARKETING  # Fallback seguro, já que legacy_web_admin foi removido
WEB_PAGES = os.path.abspath(os.path.join(BASE_DIR, "../../../frontend/src/pages"))

# Fallback para WEB_BASE (usando marketing como base se legacy não existir)
WEB_BASE = WEB_MARKETING

# Configuração de Templates e Static
# Montamos a pasta raiz do web-test para servir assets como imagens e CSS
if os.path.exists(WEB_BASE):
    app.mount("/static", StaticFiles(directory=WEB_BASE), name="static")

if os.path.exists(WEB_ADMIN):
    app.mount("/admin-static", StaticFiles(directory=WEB_ADMIN), name="admin-static")

# Templates apontam para a pasta company, mas podemos ter outros locais
# templates = Jinja2Templates(directory=os.path.join(WEB_BASE, "company")) # Legacy
templates = Jinja2Templates(
    directory=WEB_PAGES
)  # Usando pages como default para templates agora?
# templates_common = Jinja2Templates(directory=WEB_BASE)
templates_modern = Jinja2Templates(directory=WEB_PAGES)

# Middleware CORS para evitar problemas de bloqueio
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL AUTHENTICATION MIDDLEWARE ---
from starlette.middleware.base import BaseHTTPMiddleware
from api.v1.endpoints.auth import user_memory_cache

# List of public routes that don't pass through auth check
PUBLIC_ROUTES = [
    "/login",
    "/register",
    "/static",
    "/admin-static",
    "/api/auth",
    "/api/payments/webhook",  # Webhook needs to be public
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health",
]


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Check if route is public
        is_public = any(path.startswith(route) for route in PUBLIC_ROUTES)

        # If accessing root, redirect to login or dashboard based on auth (simplification: always login for now)
        if path == "/":
            return await call_next(
                request
            )  # Let the home route handle logic (it serves landing page)

        # Protect HTML pages (dashboard, etc) AND API routes (except auth/public)
        # For now, let's focus on protecting the Application Pages (HTML)
        # API routes are usually protected by Depends(get_current_user), so we double check here for HTML safety.

        if not is_public and not path.startswith("/api"):
            # It's a frontend page request. Check for session/token.
            # In a real app we'd verify the JWT token from cookies.
            # For this MVP, we assume if they can't provide a token in Authorization header or Cookie, kickoff.
            # However, since we are serving HTML, we rely on Cookies usually.
            # Let's check for 'access_token' cookie.

            token = request.cookies.get("access_token")
            if not token:
                # Redirect to login
                return RedirectResponse(url="/login")

            # Verify Token Signature
            try:
                jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            except JWTError:
                # Invalid token
                return RedirectResponse(url="/login")

        response = await call_next(request)
        return response


app.add_middleware(AuthMiddleware)

# Incluir Roteadores da API
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(enterprise.router)
app.include_router(payments.router)
app.include_router(ai.router)
app.include_router(matching.router)
app.include_router(dashboard.router)
app.include_router(interviews.router)
app.include_router(ai_services.router)
app.include_router(projects.router)
app.include_router(rh.router)
app.include_router(finance.router)
app.include_router(support.router)
app.include_router(payments.router)


# Modelo para o Chat
class ChatMessage(BaseModel):
    message: str = Field(..., max_length=1000)


# --- ROTAS DE NAVEGAÇÃO ---


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    # 1. Prioridade Máxima: Nova Landing Page Futurista de Marketing
    marketing_index = os.path.join(WEB_MARKETING, "index.html")
    if os.path.exists(marketing_index):
        with open(marketing_index, "r", encoding="utf-8") as f:
            return f.read()

    # 2. Segunda opção: Dashboard Admin
    admin_index = os.path.join(WEB_ADMIN, "index.html")
    if os.path.exists(admin_index):
        with open(admin_index, "r", encoding="utf-8") as f:
            return f.read()

    # 3. Fallback: Legado
    index_path = os.path.join(WEB_BASE, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Landing Page não encontrada em frontend/marketing/index.html"


@app.get("/pages/{page_name}", response_class=HTMLResponse)
async def serve_futuristic_pages(page_name: str):
    """Serve páginas do novo tema futurista"""
    # Security: Normalize path and prevent traversal
    page_path = os.path.normpath(os.path.join(WEB_ADMIN, "pages", page_name))
    base_path = os.path.join(WEB_ADMIN, "pages")

    if not page_path.startswith(base_path):
        return HTMLResponse("Acesso negado", status_code=403)

    if os.path.exists(page_path) and os.path.isfile(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("Página não encontrada", status_code=404)


@app.get("/css/{file_name}", response_class=HTMLResponse)
async def serve_css(file_name: str):
    """Serve CSS do novo tema futurista"""
    # Security: Normalize path and prevent traversal
    css_path = os.path.normpath(os.path.join(WEB_ADMIN, "css", file_name))
    base_path = os.path.join(WEB_ADMIN, "css")

    if not css_path.startswith(base_path):
        return HTMLResponse("Acesso negado", status_code=403)

    if os.path.exists(css_path) and os.path.isfile(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), media_type="text/css")
    return HTMLResponse("CSS não encontrado", status_code=404)


@app.get("/dashboard")
async def dashboard_page(request: Request):
    modern_dashboard = os.path.join(WEB_PAGES, "dashboard.html")
    if os.path.exists(modern_dashboard):
        return templates_modern.TemplateResponse(request=request, name="dashboard.html")
    return templates_common.TemplateResponse(
        request=request, name="company/dashboard.html"
    )


@app.get("/ats")
async def ats_page(request: Request):
    modern_ats = os.path.join(WEB_PAGES, "ats.html")
    if os.path.exists(modern_ats):
        return templates_modern.TemplateResponse(request=request, name="ats.html")
    return templates.TemplateResponse(request=request, name="jobs.html")


@app.get("/finance")
@app.get("/financeiro")
async def finance_page(request: Request):
    modern_finance = os.path.join(WEB_PAGES, "finance.html")
    if os.path.exists(modern_finance):
        return templates_modern.TemplateResponse(request=request, name="finance.html")
    return templates.TemplateResponse(request=request, name="finance.html")


@app.get("/projects")
@app.get("/projetos")
async def projects_modern_page(request: Request):
    modern_projects = os.path.join(WEB_PAGES, "projects.html")
    if os.path.exists(modern_projects):
        return templates_modern.TemplateResponse(request=request, name="projects.html")
    return templates.TemplateResponse(request=request, name="projects.html")


@app.get("/support")
@app.get("/suporte")
async def support_modern_page(request: Request):
    modern_support = os.path.join(WEB_PAGES, "support.html")
    if os.path.exists(modern_support):
        return templates_modern.TemplateResponse(request=request, name="support.html")
    return templates.TemplateResponse(request=request, name="support.html")


@app.get("/chat-ia")
async def chat_ia_page(request: Request):
    return templates_modern.TemplateResponse(request=request, name="chat-ia.html")


@app.get("/vagas")
async def vagas_page(request: Request):
    return templates.TemplateResponse(request=request, name="jobs.html")


@app.get("/candidatos")
async def candidatos_page(request: Request):
    return templates.TemplateResponse(request=request, name="candidates.html")


@app.get("/configuracoes")
async def configuracoes_page(request: Request):
    return templates.TemplateResponse(request=request, name="settings.html")


@app.get("/rh")
async def rh_page(request: Request):
    return templates.TemplateResponse(request=request, name="rh.html")


@app.get("/login")
async def login_page(request: Request):
    modern_login = os.path.join(WEB_PAGES, "login.html")
    if os.path.exists(modern_login):
        return templates_modern.TemplateResponse(request=request, name="login.html")
    return templates_common.TemplateResponse(request=request, name="login.html")


@app.get("/register")
async def register_modern_page(request: Request):
    modern_register = os.path.join(WEB_PAGES, "login.html")
    if os.path.exists(modern_register):
        return templates_modern.TemplateResponse(request=request, name="login.html")
    return templates.TemplateResponse(request=request, name="register.html")


@app.get("/carreiras", response_class=HTMLResponse)
async def careers_page(request: Request):
    careers_path = os.path.join(WEB_BASE, "careers.html")
    if os.path.exists(careers_path):
        with open(careers_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Portal de Carreiras não encontrado."


# --- API DE INTELIGÊNCIA ARTIFICIAL ---


@app.post("/api/chat")
async def chat_gemini(data: ChatMessage):
    try:
        # Prompt focado em recrutamento para o Gemini ser um assistente de elite
        prompt = f"Você é o assistente de recrutamento da Innovation.ia. Responda de forma curta e profissional: {data.message}"
        response = model_gemini.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"response": "Erro ao conectar com a IA. Verifique a API Key."},
        )


# --- API DE DADOS PARA OS GRÁFICOS ---


@app.get("/api/stats")
async def get_stats():
    return {
        "vagas_ativas": 12,
        "candidatos_total": 458,
        "entrevistas_semana": 24,
        "score_ia_medio": 84,
        "grafico_fluxo": [120, 250, 180, 390, 320, 458],
        "grafico_contratacoes": [5, 8, 12, 7, 15, 20],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
