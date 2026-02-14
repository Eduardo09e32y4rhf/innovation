import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from app.api import jobs, applications, ai, matching, auth, dashboard, interviews, ai_services, projects, rh, finance, support, payments
import app.models # Garante o registro de todos os modelos
from dotenv import load_dotenv

load_dotenv()

# Iniciar App
app = FastAPI(title="Innovation.ia - Elite Recruitment")

# Configuração do Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "SUA_CHAVE_AQUI")
genai.configure(api_key=GEMINI_API_KEY)
model_gemini = genai.GenerativeModel('gemini-pro')

# Configuração de Caminhos (Ajustado para rodar na raiz ou pasta /innovation)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Busca o web-test um nível acima da pasta app/main.py
WEB_BASE = os.path.abspath(os.path.join(BASE_DIR, "../../web-test"))
WEB_ADMIN = os.path.abspath(os.path.join(BASE_DIR, "../../web-admin"))

# Configuração de Templates e Static
# Montamos a pasta raiz do web-test para servir assets como imagens e CSS
app.mount("/static", StaticFiles(directory=WEB_BASE), name="static")
if os.path.exists(WEB_ADMIN):
    app.mount("/admin-static", StaticFiles(directory=WEB_ADMIN), name="admin-static")

# Templates apontam para a pasta company, mas podemos ter outros locais
templates = Jinja2Templates(directory=os.path.join(WEB_BASE, "company"))
templates_common = Jinja2Templates(directory=WEB_BASE)

# Middleware CORS para evitar problemas de bloqueio
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL AUTHENTICATION MIDDLEWARE ---
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse
from app.api.auth import user_memory_cache

# List of public routes that don't pass through auth check
PUBLIC_ROUTES = [
    "/login",
    "/register",
    "/static",
    "/admin-static",
    "/api/auth",
    "/api/payments/webhook", # Webhook needs to be public
    "/docs",
    "/redoc",
    "/openapi.json",
    "/health"
]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Check if route is public
        is_public = any(path.startswith(route) for route in PUBLIC_ROUTES)
        
        # If accessing root, redirect to login or dashboard based on auth (simplification: always login for now)
        if path == "/":
             return await call_next(request) # Let the home route handle logic (it serves landing page)

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
        
        response = await call_next(request)
        return response

app.add_middleware(AuthMiddleware)

# Incluir Roteadores da API
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
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
    # Prioriza a nova Landing Page Futurista
    admin_index = os.path.join(WEB_ADMIN, "index.html")
    if os.path.exists(admin_index):
        with open(admin_index, "r", encoding="utf-8") as f:
            return f.read()

    # Fallback para a antiga
    index_path = os.path.join(WEB_BASE, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Landing Page não encontrada. Verifique a pasta web-test/index.html"

@app.get("/pages/{page_name}", response_class=HTMLResponse)
async def serve_futuristic_pages(page_name: str):
    """Serve páginas do novo tema futurista"""
    page_path = os.path.join(WEB_ADMIN, "pages", page_name)
    if os.path.exists(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("Página não encontrada", status_code=404)

@app.get("/css/{file_name}", response_class=HTMLResponse)
async def serve_css(file_name: str):
    """Serve CSS do novo tema futurista"""
    css_path = os.path.join(WEB_ADMIN, "css", file_name)
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), media_type="text/css")
    return HTMLResponse("CSS não encontrado", status_code=404)

@app.get("/dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/vagas")
async def vagas_page(request: Request):
    return templates.TemplateResponse("jobs.html", {"request": request})

@app.get("/candidatos")
async def candidatos_page(request: Request):
    return templates.TemplateResponse("candidates.html", {"request": request})

@app.get("/configuracoes")
async def configuracoes_page(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request})

@app.get("/projetos")
async def projetos_page(request: Request):
    return templates.TemplateResponse("projects.html", {"request": request})

@app.get("/tarefas")
async def tarefas_page(request: Request):
    return templates.TemplateResponse("tasks.html", {"request": request})

@app.get("/rh")
async def rh_page(request: Request):
    return templates.TemplateResponse("rh.html", {"request": request})

@app.get("/financeiro")
async def finance_page(request: Request):
    return templates.TemplateResponse("finance.html", {"request": request})

@app.get("/suporte")
async def support_page(request: Request):
    return templates.TemplateResponse("support.html", {"request": request})

@app.get("/status", response_class=HTMLResponse)
async def public_status_page(request: Request):
    path = os.path.join(WEB_BASE, "status.html")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return "Página de status não encontrada."

@app.get("/login")
async def login_page(request: Request):
    # Login might be in common/login.html or directly in company/login.html
    # Based on file list, web-test/company/login.html exists.
    return templates.TemplateResponse("login.html", {"request": request})

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
        return JSONResponse(status_code=500, content={"response": "Erro ao conectar com a IA. Verifique a API Key."})

# --- API DE DADOS PARA OS GRÁFICOS ---

@app.get("/api/stats")
async def get_stats():
    return {
        "vagas_ativas": 12,
        "candidatos_total": 458,
        "entrevistas_semana": 24,
        "score_ia_medio": 84,
        "grafico_fluxo": [120, 250, 180, 390, 320, 458],
        "grafico_contratacoes": [5, 8, 12, 7, 15, 20]
    }

@app.get("/health")
def health():
    return {"status": "ok"}
