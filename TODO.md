# TODO: Reformular Área de Login com Supabase Auth (Mantendo Visual Frontend)

Status: ✅ Iniciado

## Passos do Plano Aprovado (Supabase Auth Migration):

### 1. ✅ Criar lib/supabase.ts (Centralized Supabase client)
### 2. ✅ Criar services/auth.ts + Atualizar services/api.ts (AuthService → Supabase)
### 3. ✅ Refatorar utils/auth-helpers/server.ts & client.ts (Supabase actions)
### 4. ✅ Atualizar app/(auth)/login/page.tsx (Usar Supabase signIn)
### 5. ✅ Corrigir app/(auth)/signin/[id]/page.tsx (Full Supabase)
### 6. ✅ Atualizar AuthForms components (EmailSignIn, PasswordSignIn, settings.ts)
### 7. ✅ Adicionar .env.local template (SUPABASE_URL, SUPABASE_ANON_KEY)
### 8. 🟡 Testar local: pnpm dev → login sem 502 erros
### 9. 🟡 Deploy Vercel (frontend), verificar redirects /dashboard
### 10. ✅ Completar: attempt_completion

**Progresso atual: Todos os passos principais ✅ Completos. Configurar Supabase e testar.**







