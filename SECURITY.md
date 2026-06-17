# 🔒 Guia de Segurança - Innovation IA

## ⚠️ Dados Sensíveis - NUNCA COMMITAR!

Este documento descreve quais dados sensíveis **NUNCA** devem ser versionados no Git.

---

## 🚫 Arquivos PROIBIDOS

### 1. **Variáveis de Ambiente**
```
❌ .env                    # Nunca!
❌ .env.production         # Nunca!
❌ .env.local             # Nunca!
❌ .env.development.local # Nunca!

✅ .env.example           # OK - Use como template
✅ .env.*.example         # OK - Exemplo de cada ambiente
```

### 2. **Chaves Criptográficas & SSH**
```
❌ *.key           # Chaves privadas
❌ *.pem           # Certificados privados
❌ *.p8            # Chaves privadas PKCS8
❌ *.p12           # Chaves armazenadas
❌ id_rsa          # Chave SSH
❌ id_dsa          # Chave SSH DSA
❌ ~/.ssh/         # Diretório SSH inteiro
```

### 3. **Credenciais & Tokens**
```
❌ credentials.json       # Credenciais Google Cloud
❌ google-credentials.json
❌ service-account-key.json
❌ api_keys.json
❌ oauth.json
❌ secrets.json
❌ *secret*              # Arquivos com "secret" no nome
❌ *token*               # Arquivos com "token" no nome
```

### 4. **WhatsApp & Baileys (Dados Sensíveis)**
```
❌ apps/api/storage/whatsapp/      # NUNCA!
❌ auth_info_baileys                # Dados de sessão
❌ creds.json                        # Credenciais
❌ tctoken-*.json                    # Tokens de sessão
❌ app-state-sync-*.json             # Estado de aplicativo
❌ identity-key-*.json               # Chaves de identidade
❌ device-list-*.json                # Lista de dispositivos
```

### 5. **Credenciais de Banco de Dados**
```
❌ database.url
❌ DATABASE_URL
❌ db_credentials.json
❌ connection-string*
```

### 6. **Dados Pessoais (PII)**
```
❌ uploads/                    # Arquivos de usuários
❌ user-data/                  # Dados de clientes
❌ */private/*                 # Pastas privadas
```

### 7. **Credenciais de Cloud Providers**
```
❌ ~/.aws/                     # AWS
❌ ~/.gcp/                     # Google Cloud
❌ ~/.azure/                   # Azure
❌ *aws*.json
❌ *gcp*.json
❌ *azure*.json
```

---

## ✅ Como Trabalhar COM Dados Sensíveis

### Passo 1: Use arquivos `.example`

Crie um arquivo `.example` com a estrutura necessária:

```bash
# ✅ CERTO - Versionar este arquivo
.env.example
```

**Conteúdo do `.env.example`:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/innovation_ias

# API Keys (NUNCA ADICIONE VALORES REAIS!)
GEMINI_API_KEY=your_api_key_here
OPENAI_API_KEY=your_api_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# WhatsApp (Baileys)
WHATSAPP_BOT_NUMBER=+5511999999999

# JWT Secret
JWT_SECRET=your_jwt_secret_here_min_32_chars
```

### Passo 2: Crie `.env` locais (não versionados)

Cada desenvolvedor cria seu próprio `.env`:

```bash
# No seu PC - NUNCA commitar!
.env                      # Seu .env real com valores
.env.local
.env.production.local
```

### Passo 3: Configure Git para ignorar

Os arquivos já estão no `.gitignore`:

```bash
# Ver o que será ignorado
git check-ignore -v .env
git check-ignore -v .env.local

# Resultado esperado:
# .gitignore:52:.env
# .gitignore:53:.env.local
```

---

## 🚨 Se Você Acidentalmente Commitou Dados Sensíveis

### ⚠️ AÇÃO IMEDIATA NECESSÁRIA!

1. **Não faça push!** Se ainda não fez push, remova:
```bash
# Remove do staging
git reset HEAD <arquivo_sensível>

# Ou remova e amende o commit
git rm --cached <arquivo_sensível>
git commit --amend
```

2. **Se já fez push para GitHub:**

```bash
# ⚠️ AVISO: Isso é IRREVERSÍVEL, fale com o administrador!

# Opção 1: Remover completamente do histórico (usa BFG ou filter-branch)
# Opção 2: Rotacione IMEDIATAMENTE as credenciais/tokens!
```

3. **Avise imediatamente:**
   - 🚨 Notifique o administrador do projeto
   - 🔑 Revogue/rode qualquer credencial exposta
   - 📝 Documente o incidente

---

## 🛡️ Boas Práticas de Segurança

### ✅ Faça Isto:

```bash
# ✅ Use variáveis de ambiente
export DATABASE_URL="postgresql://..."

# ✅ Leia de .env local
require('dotenv').config(); // Node.js

# ✅ Use secrets management
# AWS Secrets Manager, GCP Secret Manager, etc.

# ✅ Revise antes de commitar
git diff --staged

# ✅ Use git hooks (pre-commit)
# Exemplo: .git/hooks/pre-commit para verificar senhas
```

### ❌ NÃO Faça Isto:

```bash
# ❌ Hardcode de credenciais
const API_KEY = "sk-abc123xyz789";

# ❌ Commitar .env
git add .env  # ❌ NUNCA!

# ❌ Usar credenciais em logs
console.log("Conectando com token:", myToken);

# ❌ Submeter credenciais em pull requests
```

---

## 📋 Checklist Antes de Commitar

```bash
# ✅ Executar antes de CADA commit
□ git diff --staged | grep -i "password\|api_key\|secret\|token"
□ git diff --staged | grep -i ".env\|credentials\|key"

# ✅ Revisar arquivos modificados
□ git status
□ Confirmar que NENHUM arquivo sensível está em staging

# ✅ Se tudo OK
□ git commit -m "message"
□ git push
```

---

## 🔧 Configurar Git Hooks (Prevenção Automática)

### Criar `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Previne commits com dados sensíveis

PATTERNS=(
  "password.*="
  "api_key.*="
  "secret.*="
  "\.env$"
  "credentials.json"
  "\.pem$"
  "\.key$"
)

for pattern in "${PATTERNS[@]}"; do
  if git diff --cached --name-only | xargs grep -l "$pattern" 2>/dev/null; then
    echo "❌ ERRO: Dados sensíveis detectados!"
    echo "Padrão: $pattern"
    exit 1
  fi
done

exit 0
```

### Dar permissão:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📞 Contato de Segurança

Se encontrar uma brecha de segurança ou dados expostos:
1. ⚠️ **NÃO** faça push
2. 🚨 Notifique imediatamente
3. 📝 Documente o incidente
4. 🔑 Revogue credenciais expostas

---

## 📚 Referências

- [OWASP - Secrets Management](https://owasp.org/www-community/Sensitive_Data_Exposure)
- [GitHub - Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Última atualização:** 2026-06-16  
**Status:** 🔒 Repositório Seguro
