# 🚀 Innovation.ia - Plataforma de Recrutamento Inteligente

> **Plataforma SaaS completa de recrutamento que combina Inteligência Artificial, agendamento inteligente e segurança enterprise-grade.**

---

## 🎯 Visão Geral

O **Innovation.ia** revoluciona o processo de contratação com:
- ✅ **Backend FastAPI:** Alta performance e segurança.
- ✅ **Frontend Moderno:** Interface administrativa responsiva (`web-test`).
- ✅ **IA Gemini Pro:** Triagem e análise de candidatos.
- ✅ **Segurança Avançada:** 2FA, Rate Limiting, Proteção contra Injection e DoS.

---

## 🛠️ Estrutura do Projeto

O projeto foi reorganizado para máxima eficiência:

```
innovation.ia/
├── innovation/              # 🔹 BACKEND (Python/FastAPI)
│   ├── app/
│   │   ├── api/            # Endpoints REST (Auth, Jobs, etc.)
│   │   ├── models/         # Modelos de Banco de Dados (SQLAlchemy)
│   │   ├── services/       # Lógica de Negócio (Auth, IA, Email)
│   │   └── core/           # Configurações e Segurança
│   ├── tests/              # Testes Automatizados e de Segurança
│   └── .env.example        # Modelo de variáveis de ambiente
│
├── web-test/               # 🎨 FRONTEND (HTML5/JS/Tailwind)
│   ├── company/            # Painel Administrativo
│   ├── common/             # Assets e Estilos
│   └── app.js              # Lógica do Frontend
│
├── requirements.txt        # Dependências Python
└── README.md               # Esta documentação
```

---

## 🔐 Segurança Implementada

Realizamos uma auditoria completa e implementamos correções críticas:

1.  **Proteção contra DoS:** Limites rigorosos de tamanho de payload em todos os endpoints de criação/edição.
2.  **Correção de Autenticação:** Normalização de roles (`company` vs `COMPANY`) e correção no serviço de registro.
3.  **Rate Limiting:** Proteção contra força bruta em login e endpoints sensíveis.
4.  **Validação de Input:** Sanitização e tipagem estrita com Pydantic para prevenir Injection.
5.  **2FA:** Suporte nativo a autenticação de dois fatores.

---

## 🚀 Como Executar

### 1. Pré-requisitos
- Python 3.12+
- Pip

### 2. Instalação

```bash
# Clone o repositório
git clone <url-do-repo>
cd innovation.ia

# Crie um ambiente virtual
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou .venv\Scripts\activate  # Windows

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configuração
Crie um arquivo `innovation/.env` com suas credenciais (baseado em `.env.example` ou use os valores abaixo para teste local):

```env
DATABASE_URL=sqlite:///./innovation.db
SECRET_KEY=sua_chave_secreta_super_segura
GEMINI_API_KEY=sua_api_key_gemini
```

### 4. Executando o Servidor

```bash
# Execute a partir da raiz do projeto
export PYTHONPATH=$PYTHONPATH:$(pwd)/innovation
uvicorn innovation.app.main:app --reload --host 0.0.0.0 --port 8000
```

Acesse:
- **Web Admin:** `http://localhost:8000/`
- **Documentação API:** `http://localhost:8000/docs`

---

## 🧪 Testes

Para executar a bateria de testes, incluindo os testes de segurança ("Hacker Mode"):

```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/innovation
pytest innovation/tests
```

> **Nota:** O script `tests/test_hacker.py` simula ataques reais para validar a robustez do sistema.

---

## 👨‍💻 Manutenção

Este projeto segue padrões estritos de segurança e qualidade de código.
Qualquer nova feature deve ser acompanhada de testes e validação de segurança.

**Innovation.ia © 2026**
