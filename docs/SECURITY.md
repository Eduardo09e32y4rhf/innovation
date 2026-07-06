# 🔒 Guia de Segurança - Innovation IA

## ⚠️ Dados Sensíveis - NUNCA COMMITAR!

Este documento descreve quais dados sensíveis **NUNCA** devem ser versionados no Git.
Como estamos lidando com um sistema de RH que trafega dados PII (Personally Identifiable Information) e informações confidenciais de empresas, a segurança do repositório é inegociável.

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
❌ ~/.ssh/         # Diretório SSH inteiro
```

### 3. **Credenciais & Tokens**
```
❌ credentials.json       # Credenciais Google Cloud / AWS
❌ service-account-key.json
❌ api_keys.json
❌ secrets.json
❌ *secret*              # Arquivos com "secret" no nome
❌ *token*               # Arquivos com "token" no nome
```

### 4. **WhatsApp & Baileys (Dados Sensíveis)**
```
❌ apps/api/storage/whatsapp/        # Sessões reais do WhatsApp
❌ auth_info_baileys                 # Credenciais armazenadas do Baileys
❌ creds.json                        # Chaves criptográficas da sessão 
❌ tctoken-*.json                    # Tokens de sessão
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
❌ uploads/                    # Fotos de perfil, Atestados médicos, Documentos PDF
❌ user-data/                  # Dados brutos de clientes
❌ backups/                    # Dumps de banco de dados (.sql, .dump)
```

---

## ✅ Como Trabalhar COM Dados Sensíveis

### Passo 1: Use arquivos `.example`

Crie um arquivo `.example` (já existe o `.env.example` e `.env.prod.example`) com a estrutura necessária. Nunca coloque as senhas ou JWT Secrets nestes arquivos.
Sempre deixe no `.env.example`:
```env
JWT_SECRET=sua_chave_super_segura_aqui
```

### Passo 2: Crie seu `.env` na máquina local ou VPS
O arquivo `.env` já está no `.gitignore`. Quando você for subir o projeto para a VPS ou rodar na sua máquina, crie o arquivo localmente, copie as variáveis do `example` e preencha com senhas fortes.

---

## 🚨 Se Você Acidentalmente Commitou Dados Sensíveis

### ⚠️ AÇÃO IMEDIATA NECESSÁRIA!

1. **Se ainda não fez push:**
   - Remova o arquivo do commit utilizando `git rm --cached <arquivo>` e reescreva o commit com `git commit --amend`.
   
2. **Se já fez push para o GitHub:**
   - **MUDE AS SENHAS IMEDIATAMENTE!** Se você subiu uma chave do JWT ou senha do Banco de Dados, considere ela comprometida. Mude-a no servidor e reinicie o sistema. Não tente apenas apagar do Github em um commit futuro, pois a chave já ficou exposta no histórico.

---

## 📋 Boas Práticas (Checklist)

- [ ] Certifique-se de que o `.gitignore` não foi alterado acidentalmente.
- [ ] Verifique sempre o `git status` antes de fazer `git commit`. Se vir arquivos não planejados em `Untracked files`, revise-os um por um.
- [ ] Use um gerador de senhas para o `JWT_SECRET` e `POSTGRES_PASSWORD` (no mínimo 32 caracteres).
- [ ] Mantenha o acesso à sua VPS protegido por Chave SSH ao invés de senha root.
- [ ] Mantenha a versão do Node.js, NestJS e Next.js atualizada contra vulnerabilidades conhecidas (`npm audit`).

---

**Última atualização:** 2026-06-30
**Status:** 🔒 Repositório e Infraestrutura Seguros
