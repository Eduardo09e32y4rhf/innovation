# Próximos passos (roteiro para continuar)

## 1. Na VPS agora (não muda nada para os usuários)
```bash
cd /var/www/innovation
git pull --ff-only origin main
bash scripts/security/bootstrap-env.sh https://innovationia.com.br   # gera segredos fortes no .env
bash scripts/security/rotate-db-password.sh                          # troca a senha do Postgres existente
bash scripts/backup/install-cron.sh                                  # backup diário + teste semanal de restauração
bash scripts/deploy/vps-update.sh                                    # backup -> migrations -> build -> verificação de saúde
```
Migrations aplicadas pelo script: `20261005*` (pagamentos, cupons, auditoria, status de acesso) e `20261006090000_auth_hardening`.
Depois: trocar a senha que ficou exposta no histórico, autorizar o `git filter-repo`, definir `BACKUP_REMOTE` (rclone) no `.env`, colocar os tokens de pagamento.

## 2. Fase 1 — o backend está pronto, falta o frontend
Desligados por padrão: `JWT_EXPIRES_IN=7d`, `MFA_ENFORCE=false`, e-mail sem provedor (apenas loga).
- `apps/web/app/lib/api.ts` (`request`): em 401 chamar `POST /auth/refresh` (credentials 'include', uma chamada por vez) e repetir a requisição; avisar o AuthContext do novo token.
- `apps/web/app/contexts/AuthContext.tsx`: `credentials:'include'` no login; tratar `{mfaRequired, mfaToken}` (tela de código -> `POST /auth/mfa/verify`); `logout` chama `POST /auth/logout`; se `mfaEnrollmentRequired`, ir para `/mfa`.
- Telas novas: `/mfa` (setup: `POST /auth/mfa/setup` -> QR; `POST /auth/mfa/enable` -> mostrar códigos de recuperação), `/verify-email` (`POST /auth/verify-email`), `/reset-password` aceitar `?token=` (link do e-mail), Configurações -> "Sessões e dispositivos" (`GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /auth/sessions/revoke-others`) e "Autenticação em duas etapas".
- **Só depois** do front: `.env` com `JWT_EXPIRES_IN=15m` e `MFA_ENFORCE=true`; e-mail: `RESEND_API_KEY`+`MAIL_FROM` ou `SMTP_HOST/PORT/USER/PASS`+`MAIL_FROM`.
- Pendentes: `UsersService.resetMfa` + `POST /users/:id/mfa/reset` (DEV), e-mail de convite ao criar usuário, testes de `SessionService` (rotação/reuso) e `lockDurationMs`.

## 3. Fases 2 a 8
2. Segurança de dados: auditar as ~369 rotas (3 controllers sem RolesGuard: privacy, support, platform-support), matriz perfil x endpoint no CI, RLS no Postgres, criptografia de CPF/banco/salário, histórico "tinha -> ficou" em todos os módulos, aprovação dupla (estorno, purge, ghost-mode), DTO nas rotas restantes.
3. DevOps: deploy automático + staging, `prisma migrate deploy` no CI, Sentry/uptime/alertas, unificar CI, PRs obrigatórios, unificar módulos duplicados (time-track/time-tracking, escala/escalas, colaboradores/employees).
4. Cobrança: produção com tokens, lock nos crons, régua de inadimplência, recorrência no Mercado Pago, conciliação, telas de banco/aprovações do Contábil.
5. Conformidade: ponto Portaria 671 (NSR, AFD/AEJ), LGPD (exportar/excluir dados), WhatsApp oficial.
6. Folha completa (13º, rescisão, férias), eSocial, NFS-e, relatórios financeiros.
7. Front: PWA/ponto offline, subpáginas antigas da Plataforma, remover `any`, E2E logado.
8. API pública, chaves por empresa, webhooks de saída.