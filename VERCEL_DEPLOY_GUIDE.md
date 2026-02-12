# 🚀 Guia de Deploy na Vercel - Innovation.ia

## ✅ Correções Implementadas

### 1. ✅ Configuração do `vercel.json`
- ✅ Alterado de `@vercel/node` para `@vercel/python` 
- ✅ Rotas `/api/*` e `/auth/*` agora apontam para `backend/app/main.py`
- ✅ Removido conflito com `api/index.ts` (Node.js)
- ✅ Adicionadas todas as variáveis de ambiente necessárias

### 2. ✅ Padronização de Rotas
- ✅ Router de autenticação alterado de `/auth` para `/api/auth`
- ✅ Agora todas as rotas da API seguem o padrão `/api/*`
- ✅ Frontend pode acessar `/api/auth/login`, `/api/auth/register`, etc.

### 3. ✅ Arquivo `requirements.txt`
- ✅ Criado na raiz do projeto (copiado de `innovation/requirements.txt`)
- ✅ Vercel conseguirá instalar as dependências Python

---

## 📋 Variáveis de Ambiente para Configurar na Vercel

Acesse: **Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

### 🔴 OBRIGATÓRIAS (Sem essas o deploy falha):

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```
**Importante:** Use PostgreSQL (Supabase/Neon/Railway), não SQLite em produção!

```env
SECRET_KEY=c_Gl9BCLPhpWG89Qn_tgrw2ItMjo6_p15f6678KHKqY
```

### 🟡 RECOMENDADAS (Para funcionalidades completas):

```env
GEMINI_API_KEY=AIzaSyANLiXYenULJ6osXQLZmjrylkHI0fL3mkw
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30
TERMS_VERSION=v1
```

### 🟢 OPCIONAIS (Recursos avançados):

```env
# SendGrid (Email)
SENDGRID_API_KEY=SG.YOUR_API_KEY_HERE
SENDGRID_FROM_EMAIL=noreply@innovation.ia
SENDGRID_FROM_NAME=Innovation.ia

# Google Calendar
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=https://seu-dominio.vercel.app/auth/google/callback

# Twilio (SMS 2FA)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Mercado Pago
MERCADO_PAGO_TOKEN=
```

---

## 🗄️ Configurar Banco de Dados PostgreSQL

### Opção 1: Supabase (Recomendado - Grátis)
1. Acesse https://supabase.com
2. Crie um novo projeto
3. Vá em **Settings → Database**
4. Copie a **Connection String** (URI mode)
5. Cole em `DATABASE_URL` na Vercel

### Opção 2: Neon (Serverless PostgreSQL)
1. Acesse https://neon.tech
2. Crie um novo projeto
3. Copie a connection string
4. Cole em `DATABASE_URL` na Vercel

### Opção 3: Railway
1. Acesse https://railway.app
2. Crie um PostgreSQL database
3. Copie a `DATABASE_URL`
4. Cole na Vercel

---

## 🚀 Comandos para Deploy

### 1. Commit das alterações:
```bash
git add .
git commit -m "fix: Configurado vercel.json para Python e padronizado rotas da API"
git push origin main
```

### 2. Deploy automático:
- A Vercel detectará o push e fará o deploy automaticamente
- Acompanhe em: https://vercel.com/seu-usuario/seu-projeto

### 3. Verificar deploy:
Após o deploy, teste os endpoints:
- https://seu-dominio.vercel.app/health
- https://seu-dominio.vercel.app/docs (Swagger UI)
- https://seu-dominio.vercel.app/api/auth/login

---

## 🔧 Estrutura de Rotas Atualizada

### API Backend (FastAPI):
- `/api/auth/login` → Login
- `/api/auth/register` → Registro
- `/api/auth/me` → Usuário atual
- `/api/jobs/*` → Vagas
- `/api/applications/*` → Candidaturas
- `/api/ai/*` → IA e Matching
- `/api/dashboard/*` → Dashboard
- `/health` → Health check
- `/docs` → Swagger UI

### Frontend (HTML estático):
- `/` → Landing page
- `/login` → Página de login
- `/dashboard` → Dashboard
- `/vagas` → Vagas
- `/candidatos` → Candidatos
- `/configuracoes` → Configurações

---

## ⚠️ Problemas Comuns e Soluções

### Erro: "DATABASE_URL not found"
**Solução:** Configure a variável `DATABASE_URL` nas Environment Variables da Vercel

### Erro: "Module not found"
**Solução:** Verifique se `requirements.txt` está na raiz do projeto

### Erro: 404 em `/api/auth/login`
**Solução:** Já corrigido! O router agora usa `/api/auth` como prefixo

### Erro: "Internal Server Error" no deploy
**Solução:** Verifique os logs na Vercel Dashboard → Deployments → View Function Logs

---

## 📝 Checklist Final

- [x] `vercel.json` configurado para `@vercel/python`
- [x] Rotas padronizadas com prefixo `/api`
- [x] `requirements.txt` na raiz
- [x] Variáveis de ambiente documentadas
- [ ] `DATABASE_URL` configurada na Vercel
- [ ] `SECRET_KEY` configurada na Vercel
- [ ] `GEMINI_API_KEY` configurada na Vercel (opcional)
- [ ] Commit e push para o GitHub
- [ ] Deploy na Vercel executado
- [ ] Testes dos endpoints em produção

---

## 🎉 Próximos Passos

1. Configure as variáveis de ambiente na Vercel
2. Faça commit e push das alterações
3. Aguarde o deploy automático
4. Teste a aplicação em produção
5. Configure o domínio customizado (opcional)

**Boa sorte com o deploy! 🚀**
