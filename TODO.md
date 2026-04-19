# Áreas de Contas/Team e Chamados/Tickets
Status: ✅ Iniciado por BLACKBOXAI

## 📋 Passos Lógicos (Prioridade Alta → Baixa)

### 1. ✅ Preparação (Completo)
- [x] Criar este TODO.md
- [x] Confirmar plan com usuário

### 2. Backend Preparação (DB + Models)
- [ ] Adicionar `company_id` ao User model
- [ ] Expandir roles enum no User
- [ ] Alembic migration para DB
- [ ] Testar models

### 3. Backend APIs
- [ ] `/api/v1/team/users` (list/invite company users)
- [ ] `/api/v1/team/{user_id}/role` (update role/permissions)
- [ ] `/api/v1/tickets/` (list/create/filter by company)
- [ ] `/api/v1/tickets/{id}` (get/update/assign/AI-reply)
- [ ] Integrar auth/permissions (company_id match)

### 4. Frontend Services
- [ ] `services/team.ts` (team APIs)
- [ ] `services/support.ts` (tickets APIs)
- [ ] Exportar em `services/api.ts`
- [ ] Permissions utils (role guards)

### 5. Frontend Pages
- [ ] `/app/team/page.tsx` (team list/add/edit roles)
- [ ] `/app/tickets/page.tsx` (client: my tickets + create)
- [ ] `/app/support-admin/page.tsx` (admin: all tickets + manage)

### 6. Permissions & UI Polish
- [ ] Middleware: role/company checks
- [ ] AppLayout: Add menu items (/team, /tickets)
- [ ] RBAC guards em pages
- [ ] TeamTable, TicketForm components
- [ ] Notifications integration

### 7. Test & Deploy
- [ ] Test flows: invite → role limit → ticket open → assign
- [ ] Regenerate supabase types
- [ ] npm run dev → Test local
- [ ] Deploy frontend/backend

## Notas
- RBAC: Backend checks + frontend guards
- Permissions: company_owner/employee/support_agent
- UI: Match AppLayout style (glassmorphism, Lucide)
- Next: Backend models (Step 2)

**Progresso: 5% | Tempo estimado: 4-6h**

