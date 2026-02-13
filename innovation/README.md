🚀 Innovation

Innovation é uma plataforma SaaS de RH, Folha de Pagamento e Automação com IA, focada em pequenas e médias empresas, construída com arquitetura moderna, escalável e orientada a produto.

O projeto nasce com um MVP funcional e monetizável, pronto para evolução contínua até se tornar um ERP completo de RH, Fiscal e Contábil.

🎯 Visão do Produto

Fluxo principal do usuário:

Login → Aceite dos Termos → Escolha da Empresa (CNPJ) → Assinatura →
Dashboard RH → Cadastro de Funcionários → Geração de Holerite (PDF) → Histórico

🧩 Funcionalidades do MVP
✅ Autenticação & Acesso

Cadastro e login de usuários

Autenticação JWT

RBAC básico (perfis)

Estrutura preparada para multi-empresa (org_id)

✅ RH

Cadastro de funcionários

Estrutura base de folha de pagamento

Salary Slip (Holerite) como entidade central

Histórico mensal por funcionário

✅ Documentos

Geração de holerite em PDF

Histórico de documentos

Download seguro por usuário

✅ Pagamentos

Integração com Mercado Pago (assinaturas recorrentes)

Planos mensais

Webhook funcional para atualização automática de status

Estrutura pronta para bloqueio por inadimplência

✅ IA (Base)

Pipeline preparado para IA:

Prompt → JSON → Validação → Persistência


Estrutura pronta para integração com Google Gemini

Token externo (não versionado)

Base preparada para OCR, auditoria e explicações automáticas

🛠️ Stack Tecnológica
Backend

Python 3.12+

FastAPI

SQLAlchemy

Alembic

SQLite (dev) / PostgreSQL (produção)

JWT Authentication

Frontend (Mobile)

Flutter

Navegação por rotas nomeadas

Arquitetura por camadas (screens, services, models)

Integrações

Mercado Pago (assinaturas)

Google Gemini (IA)

📁 Estrutura do Projeto
innovation.ia/
├── innovation/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── payments.py
│   │   │   ├── documents.py
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   ├── dependencies.py
│   │   │   ├── permissions.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── plan.py
│   │   │   ├── subscription.py
│   │   │   ├── document.py
│   │   ├── services/
│   │   │   ├── pdf_service.py
│   │   │   ├── document_service.py
│   │   │   ├── ai_service.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   ├── seeds.py
│   │   └── main.py
│   ├── alembic/
│   └── docs/
├── innovation_app/        # Flutter
│   ├── lib/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── screens/
│   │   ├── services/
│   │   └── main.dart
│   └── pubspec.yaml
├── scripts/
├── .env
├── pyproject.toml
├── requirements.txt
└── README.md

▶️ Como Rodar o Projeto
🔹 Backend
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


Pode rodar em:

Android Emulator

Celular físico

Windows (desktop)

🔐 Variáveis de Ambiente

Arquivo .env:

SECRET_KEY=sua-chave-secreta
DATABASE_URL=sqlite:///innovation.db

# Integrações
MERCADO_PAGO_TOKEN=
GEMINI_API_KEY=


⚠ Tokens nunca são versionados.

📊 Status Atual do Projeto

Base técnica: ~75%

MVP comercial: ~55%

Produto final (ERP): ~25%

Projeto geral: ~48–50%

✔ Arquitetura consolidada
✔ Pagamento recorrente funcional
✔ Webhook ativo
✔ Projeto já é um produto em evolução, não apenas um estudo

🧠 Roadmap
Curto Prazo (MVP)

Finalizar bloqueio total por assinatura

Conectar Flutter ao fluxo de pagamento

Publicar APK no Google Play

Médio Prazo

IA explicando holerites

Agenda diária estilo Trello

Chat interno

Longo Prazo

Contabilidade completa

Fiscal

RH avançado

👨‍💻 Autor

Eduardo Silva
Projeto independente com foco em produto real, monetização progressiva e escala.

© Innovation — Todos os direitos reservados