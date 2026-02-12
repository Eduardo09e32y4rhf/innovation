# ⚡ Innovation.ia - Quick Start Guide

**Tempo estimado:** 5-10 minutos  
**Objetivo:** Ter o projeto rodando localmente com dados de exemplo

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- ✅ **Python 3.12+** ([Download](https://www.python.org/downloads/))
- ✅ **Git** ([Download](https://git-scm.com/downloads))
- ✅ (Opcional) **PostgreSQL** para produção

---

## 🚀 Passo a Passo

### 1️⃣ Clone o Repositório

```bash
git clone https://github.com/seu-usuario/innovation.ia.git
cd innovation.ia/innovation
```

### 2️⃣ Crie o Ambiente Virtual

**Windows:**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3️⃣ Instale as Dependências

```bash
pip install -r requirements.txt
```

⏱️ *Isso pode levar 1-2 minutos...*

### 4️⃣ Configure o Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

**Edite o `.env` e adicione uma SECRET_KEY:**

```bash
# Gere uma chave segura
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Cole a chave gerada no `.env`:
```env
SECRET_KEY=sua-chave-gerada-aqui
```

### 5️⃣ Execute as Migrações

```bash
alembic upgrade head
```

### 6️⃣ Popule o Banco com Dados de Exemplo

```bash
python -m app.db.seed
```

**✅ Credenciais criadas:**
- **Admin:** `admin@innovation.ia` / `admin123`
- **Empresa:** `empresa1@test.com` / `senha123`
- **Candidato:** `candidato1@test.com` / `senha123`

### 7️⃣ Inicie o Servidor

```bash
uvicorn app.main:app --reload
```

---

## 🎉 Pronto! Acesse:

| Recurso | URL | Descrição |
|---------|-----|-----------|
| **API Docs (Swagger)** | http://localhost:8000/docs | Documentação interativa da API |
| **Web Admin** | http://localhost:8000/login | Portal da empresa |
| **Landing Page** | http://localhost:8000/ | Página inicial |
| **Health Check** | http://localhost:8000/health | Status do servidor |

---

## 🧪 Teste Rápido

### Via Swagger (http://localhost:8000/docs)

1. Abra a seção **Auth**
2. Clique em `POST /auth/login`
3. Clique em "Try it out"
4. Cole o JSON:
   ```json
   {
     "email": "admin@innovation.ia",
     "password": "admin123"
   }
   ```
5. Clique em "Execute"
6. ✅ Você deve receber um `access_token` e `refresh_token`

### Via Web Admin

1. Acesse http://localhost:8000/login
2. Use: `admin@innovation.ia` / `admin123`
3. ✅ Você deve ser redirecionado para o Dashboard

---

## 📚 Próximos Passos

Agora que o projeto está rodando, explore:

1. **📖 Documentação Completa:** [`innovation/README.md`](./innovation/README.md)
2. **🔐 Recursos de Segurança:** [`innovation/docs/SECURITY_FIXES.md`](./innovation/docs/SECURITY_FIXES.md)
3. **🎨 Frontend (Flutter):** [`innovation_app/README.md`](./innovation_app/README.md)
4. **🌐 Web Admin:** [`web-test/`](./web-test/)

---

## 🐛 Problemas Comuns

### ❌ Erro: "No such table: users"

**Solução:**
```bash
alembic upgrade head
```

### ❌ Erro: "ModuleNotFoundError: No module named 'app'"

**Solução:** Certifique-se de estar na pasta `innovation/`:
```bash
cd innovation
```

### ❌ Erro 500 no Login

**Solução:** Verifique se o `.env` tem `SECRET_KEY`:
```bash
cat .env | grep SECRET_KEY
```

Se vazio, gere uma nova chave:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### ❌ Porta 8000 já em uso

**Solução:** Use outra porta:
```bash
uvicorn app.main:app --reload --port 8001
```

---

## 💡 Dicas

- **Auto-reload:** O servidor reinicia automaticamente quando você edita o código
- **Logs:** Acompanhe o terminal para ver requisições em tempo real
- **Swagger:** Use `/docs` para testar todos os endpoints sem precisar de frontend
- **Banco de dados:** O arquivo `innovation.db` (SQLite) fica na pasta `innovation/`

---

## 🔗 Links Úteis

- [Documentação FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy Tutorial](https://docs.sqlalchemy.org/en/20/tutorial/)
- [Alembic Docs](https://alembic.sqlalchemy.org/)

---

**🎊 Parabéns! Você está pronto para desenvolver no Innovation.ia!**

Dúvidas? Consulte o [README completo](./innovation/README.md) ou abra uma issue no GitHub.
