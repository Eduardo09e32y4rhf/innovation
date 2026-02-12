# 🚀 Innovation.ia - Plataforma de Recrutamento com IA

## 📁 Estrutura do Projeto

```
innovation.ia/
├── innovation/          # 🔹 BACKEND (FastAPI + PostgreSQL)
│   ├── app/            # Código da aplicação
│   ├── alembic/        # Migrações de banco de dados
│   ├── tests/          # Testes automatizados
│   ├── docs/           # Documentação técnica
│   └── requirements.txt
│
├── web-test/           # 🎨 FRONTEND (HTML/CSS/JS)
│   ├── index.html      # Landing page
│   ├── company/        # Portal da empresa
│   └── common/         # Assets compartilhados
│
└── tools/              # 🛠️ Scripts utilitários
```

## 🏃 Quick Start

### 1. Backend (FastAPI)
```bash
cd innovation
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Acesse: `http://localhost:8000`

### 2. Frontend
O frontend é servido automaticamente pelo FastAPI em `/` e rotas como `/dashboard`, `/vagas`, etc.

## 🔐 Configuração

1. Copie `.env.example` para `.env` dentro da pasta `innovation/`
2. Configure suas variáveis de ambiente:
   - `DATABASE_URL` - String de conexão do PostgreSQL
   - `SECRET_KEY` - Chave secreta para JWT
   - `GEMINI_API_KEY` - Chave da API do Google Gemini

## 📦 Deploy

### Vercel
```bash
vercel
```

### Render/Railway
Use o `Dockerfile` em `innovation/`

## 🧪 Testes

```bash
cd innovation
pytest tests/
```

## 📚 Documentação

- **API Docs (Swagger)**: http://localhost:8000/docs
- **Docs Técnicas**: `innovation/docs/`
- **Audit Log**: `CLEANUP_AUDIT.md`

## 🛠️ Stack Tecnológica

**Backend:**
- FastAPI (Python)
- SQLAlchemy + Alembic
- PostgreSQL
- Google Gemini AI
- JWT Auth

**Frontend:**
- HTML5/CSS3/JavaScript Vanilla
- TailwindCSS
- Chart.js
- Font Awesome

## 📝 License

Proprietary - Innovation.ia © 2026
