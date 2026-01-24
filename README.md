# 🚀 Innovation

**Innovation** é uma plataforma **SaaS de RH, Folha de Pagamento e Automação com IA**, focada em pequenas e médias empresas, com arquitetura moderna, escalável e preparada para evolução contínua.

O projeto nasce com um **MVP funcional**, pronto para publicação no Google Play, e evolui de forma progressiva para um ERP completo.

---

## 🎯 Visão do Produto

Fluxo principal do usuário:

**Login → Aceite dos Termos → Escolha da Empresa (CNPJ) → Assinatura →  
Dashboard RH → Cadastro de Funcionários → Geração de Holerite (PDF) → Histórico**

---

## 🧩 Funcionalidades do MVP

### ✅ Autenticação e Acesso
- Login e cadastro de usuários
- JWT
- RBAC básico (perfis)
- Multi-empresa (estrutura pronta)

### ✅ RH
- Cadastro de funcionários
- Base de folha de pagamento
- Salary Slip como entidade central
- Histórico mensal

### ✅ Documentos
- Geração de holerite em PDF
- Histórico para download

### ✅ Pagamentos
- Integração com Mercado Pago (assinaturas)
- Planos mensais
- Estrutura para bloqueio por inadimplência

### ✅ IA (Base)
- Pipeline preparado:
  - Prompt → JSON → Validação → Persistência
- Estrutura pronta para Google Gemini (token externo)

---

## 🛠️ Stack Tecnológica

### Backend
- Python 3.12+
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL / SQLite (dev)
- JWT Auth

### Frontend (Mobile)
- Flutter
- Navegação por rotas nomeadas
- Arquitetura por camadas (screens, services, models)

### Integrações
- Mercado Pago (assinaturas)
- Google Gemini (IA)

---

## 📁 Estrutura do Projeto

innovation.ia/
├── innovation/
│ ├── backend/
│ │ ├── app/
│ │ │ ├── auth/
│ │ │ ├── hr/
│ │ │ ├── payments/
│ │ │ ├── ai/
│ │ │ └── core/
│ │ └── main.py
│ ├── alembic/
│ └── docs/
│
├── innovation_app/ # Flutter
│ ├── lib/
│ │ ├── models/
│ │ ├── routes/
│ │ ├── screens/
│ │ ├── services/
│ │ └── main.dart
│ └── pubspec.yaml
│
├── scripts/
│ ├── install.ps1
│ ├── run.ps1
│ └── check.ps1
│
├── .env
├── pyproject.toml
├── requirements.txt
└── README.md


---

## ▶️ Como Rodar o Projeto

### 🔹 Backend
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload


Acesse:

http://127.0.0.1:8000/docs

🔹 Frontend (Flutter)
cd innovation_app
flutter pub get
flutter run


Escolha:

Android Emulator

Celular físico

Windows (desktop)

🔐 Variáveis de Ambiente

Arquivo .env:

SECRET_KEY=chave-secreta
DATABASE_URL=sqlite:///innovation.db

# Integrações (opcional no MVP)
MERCADO_PAGO_TOKEN=
GEMINI_API_KEY=


⚠ Tokens não são versionados.

📊 Status do Projeto

Base técnica: ~75%

MVP comercial: ~55%

Produto final (ERP): ~25%

Projeto geral: ~48–50%

✔ Projeto já saiu da fase de arquitetura
✔ Entrou na fase de produto
✔ MVP publicável no curto prazo

🧠 Roadmap
Curto prazo (MVP)

Finalizar integração Mercado Pago

Conectar frontend ao backend

Publicar APK no Google Play

Médio prazo

IA explicando holerites

Agenda diária estilo Trello

Chat interno

Longo prazo

Contabilidade completa

Fiscal

RH avançado

👨‍💻 Autor

Eduardo Silva
Projeto independente com foco em produto real, monetização progressiva e escala.

© Innovation — Todos os direitos reservados