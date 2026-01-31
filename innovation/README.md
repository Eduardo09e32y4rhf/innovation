# 🚀 Innovation Recruit (Django)

Plataforma SaaS para **RH + Recrutamento + Gestão** (estilo ERP) construída em **Django** com:
- ✅ **Login / Registro** (sessão)
- ✅ **Dashboard** (resumo da empresa)
- ✅ **Sidebar estilo SaaS** (módulos do sistema)
- ✅ **Módulo de Pagamento** (base pronta — Stripe como padrão)
- ✅ **SQLite** (padrão) + **MySQL** (opcional)

---

## ✨ Visão Geral

O sistema é dividido em módulos:

- **Dashboard** → resumo geral da empresa (vagas, funcionários, contratos, agenda)
- **Aut-Temp** → estilo Trello/Kanban para tarefas e pipeline
- **RH** → gestão de ponto e funcionários
- **Funcionários** → controle completo de colaboradores
- **Portal** → avaliação de candidatos + entrevistas/testes
- **Vagas** → criação e gerenciamento de vagas
- **Configurações** → plano, notas fiscais, suporte e cancelamento
- **Pagamento** → checkout/assinatura (estrutura pronta)

---

## 🧭 Rotas do Sistema

| Rota | O que é |
|------|---------|
| `/` | Login |
| `/register/` | Criar conta |
| `/dashboard/` | Dashboard (login obrigatório) |
| `/aut-temp/` | Kanban/Trello |
| `/rh/` | RH (ponto e gestão) |
| `/funcionarios/` | Funcionários |
| `/portal/` | Portal de candidatos |
| `/vagas/` | Gestão de vagas |
| `/configuracoes/` | Plano/NF/Suporte |
| `/payment/` | Pagamento |
| `/admin/` | Admin do Django |
| `/logout/` | Sair |

---

## ✅ Requisitos

- **Python 3.10+** (recomendado 3.11/3.12)
- **pip**
- **Git** (para versionamento)

> No Windows, use `py` no lugar de `python`.

---

## ⚡ Instalação Rápida

### 1) Criar e ativar ambiente virtual

**Windows**
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1

Linux/Mac
python3 -m venv .venv
source .venv/bin/activate

2) Instalar dependências
Se já existir requirements.txt:
pip install -r requirements.txt

Se não existir, crie um requirements.txt assim:
Django>=5
stripe

e rode:
pip install -r requirements.txt


▶️ Rodar o Projeto
1) Migrar banco
py manage.py migrate

2) Criar superusuário (admin)
py manage.py createsuperuser

3) Rodar servidor
py manage.py runserver

Acesse:


App → http://127.0.0.1:8000/


Admin → http://127.0.0.1:8000/admin/



🔐 Usuário e Senha
Admin do Django (/admin/)


Usuário e senha: os que você criou no createsuperuser


Se esqueceu a senha:
py manage.py changepassword SEU_USUARIO

Login do sistema (/)


Você pode logar com:


Usuário


ou Email




Crie conta em /register/



🗃 Banco de Dados
SQLite (padrão)
Já vem pronto e funciona sem configurar nada.
MySQL (opcional)
Instale:
pip install mysqlclient

E no settings.py:
DATABASES = {
  "default": {
    "ENGINE": "django.db.backends.mysql",
    "NAME": "innovation_db",
    "USER": "root",
    "PASSWORD": "sua_senha",
    "HOST": "localhost",
    "PORT": "3306",
  }
}


💳 Pagamento (Stripe)
O módulo payment já está preparado para integração.
Instale:
pip install stripe

Depois configure a chave no apps/payment/views.py ou via variável de ambiente (recomendado).

Próximo passo: integrar Checkout Session + Webhooks.


🗂 Estrutura de Pastas (resumo)
innovation/
├── manage.py
├── recruitment_project/
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── apps/
│   ├── auth_app/
│   ├── dashboard/
│   ├── payment/
│   └── core/        (módulos: Aut-Temp, RH, etc.)
├── templates/
│   ├── base.html
│   ├── auth/
│   ├── dashboard/
│   └── core/
└── static/
    └── css/style.css


🧨 Problemas Comuns (e solução)
CSS não atualiza


Faça CTRL + F5


Reinicie o server (CTRL + C e py manage.py runserver)


TemplateDoesNotExist


Confirme a pasta templates/


Confirme no settings.py:


TEMPLATES[0]['DIRS'] = [BASE_DIR / 'templates']




ModuleNotFoundError: apps.x


Garanta que existe apps/__init__.py


Confira se o app está em INSTALLED_APPS



🛣 Roadmap (Próximos passos)


Modelos reais: Funcionários, Vagas, Candidatos, Entrevistas


Portal com ranking/score


Aut-Temp com drag & drop real (Kanban)


Agenda semanal real (FullCalendar)


Stripe real (checkout + assinatura + webhooks)


Nota fiscal + suporte dentro do sistema



🧾 Licença
Projeto privado / uso interno.
