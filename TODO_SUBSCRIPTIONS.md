# TODO: Área de Assinaturas (Pós-Login Flow)

Status: ✅ Iniciado

## Fluxo:
Register/Login → Check subscription → Dashboard (ativo) | /subscription (novo/atraso)

## Passos:
### 1. ✅ services/subscriptions.ts (listPlans/createSubscription/checkStatus)
### 2. ✅ app/(app)/subscription/page.tsx (Plans + Asaas checkout)
### 3. ✅ middleware.ts (post-login subscription redirect)
### 4. ✅ app/(app)/dashboard/page.tsx (protect + redirect non-sub)
### 5. ✅ utils/auth-helpers/server.ts (add subscription check)
### 6. 🟡 Test flow: register→login→subscription→dashboard
### 7. ✅ Complete

**Progresso: Passos 1-3,5 ✅**

