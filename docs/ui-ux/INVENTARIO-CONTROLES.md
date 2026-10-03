# Inventário rastreável da interface

Data: 03/10/2026. Referência publicada: `c1b340ac`.

Este inventário é extraído estaticamente do código; não afirma que os controles foram testados em navegador. Foram encontrados 86 arquivos de página, 144 arquivos TSX examinados, 670 ocorrências de ações/formulários, 340 campos nativos e 223 componentes com propriedades de campo/rótulo (incluindo indicadores, não apenas entradas). Mapas dinâmicos podem gerar vários controles a partir de uma ocorrência. Formulários e seus botões aparecem separadamente. Contagens não representam funcionalidades únicas.

Nos arquivos com alterações locais pendentes, a extração usa HEAD para não tomar reparos inacabados de codificação como especificação. Nos demais, usa o arquivo local. Rótulos quebrados foram preservados como evidência; a redação correta está nos planos. Este recorte não substitui inventário de endpoints, regras do servidor ou testes de execução.

O arquivo `inventario-ui.json` preserva os dados completos, inclusive textos longos, componentes, referências à API e propriedades. Nesta versão legível, legendas muito longas são abreviadas; nenhum controle é removido.

## Manifesto de todas as páginas

| ID | Rota | Arquivo |
| --- | --- | --- |
| R001 | `/planos` | `apps/web/app/(public)/planos/page.tsx` |
| R002 | `/[tenant]/clientes` | `apps/web/app/[tenant]/clientes/page.tsx` |
| R003 | `/[tenant]/dashboard/chat` | `apps/web/app/[tenant]/dashboard/chat/page.tsx` |
| R004 | `/[tenant]/dashboard/colaboradores` | `apps/web/app/[tenant]/dashboard/colaboradores/page.tsx` |
| R005 | `/[tenant]/dashboard/employees/import` | `apps/web/app/[tenant]/dashboard/employees/import/page.tsx` |
| R006 | `/[tenant]/dashboard/employees/new` | `apps/web/app/[tenant]/dashboard/employees/new/page.tsx` |
| R007 | `/[tenant]/dashboard/employees` | `apps/web/app/[tenant]/dashboard/employees/page.tsx` |
| R008 | `/[tenant]/dashboard/escala` | `apps/web/app/[tenant]/dashboard/escala/page.tsx` |
| R009 | `/[tenant]/dashboard/escalas/calendario` | `apps/web/app/[tenant]/dashboard/escalas/calendario/page.tsx` |
| R010 | `/[tenant]/dashboard/escalas/documentos` | `apps/web/app/[tenant]/dashboard/escalas/documentos/page.tsx` |
| R011 | `/[tenant]/dashboard/escalas/equipe` | `apps/web/app/[tenant]/dashboard/escalas/equipe/page.tsx` |
| R012 | `/[tenant]/dashboard/escalas/fechamento` | `apps/web/app/[tenant]/dashboard/escalas/fechamento/page.tsx` |
| R013 | `/[tenant]/dashboard/escalas/ocorrencias` | `apps/web/app/[tenant]/dashboard/escalas/ocorrencias/page.tsx` |
| R014 | `/[tenant]/dashboard/escalas` | `apps/web/app/[tenant]/dashboard/escalas/page.tsx` |
| R015 | `/[tenant]/dashboard/escalas/ponto` | `apps/web/app/[tenant]/dashboard/escalas/ponto/page.tsx` |
| R016 | `/[tenant]/dashboard/escalas/regras` | `apps/web/app/[tenant]/dashboard/escalas/regras/page.tsx` |
| R017 | `/[tenant]/dashboard/escalas/trocas` | `apps/web/app/[tenant]/dashboard/escalas/trocas/page.tsx` |
| R018 | `/[tenant]/dashboard/finance` | `apps/web/app/[tenant]/dashboard/finance/page.tsx` |
| R019 | `/[tenant]/dashboard/jobs/[jobId]` | `apps/web/app/[tenant]/dashboard/jobs/[jobId]/page.tsx` |
| R020 | `/[tenant]/dashboard/jobs` | `apps/web/app/[tenant]/dashboard/jobs/page.tsx` |
| R021 | `/[tenant]/dashboard/management/agenda` | `apps/web/app/[tenant]/dashboard/management/agenda/page.tsx` |
| R022 | `/[tenant]/dashboard/management/aso` | `apps/web/app/[tenant]/dashboard/management/aso/page.tsx` |
| R023 | `/[tenant]/dashboard/management/notifications` | `apps/web/app/[tenant]/dashboard/management/notifications/page.tsx` |
| R024 | `/[tenant]/dashboard/management/onboarding` | `apps/web/app/[tenant]/dashboard/management/onboarding/page.tsx` |
| R025 | `/[tenant]/dashboard/management` | `apps/web/app/[tenant]/dashboard/management/page.tsx` |
| R026 | `/[tenant]/dashboard/management/payroll` | `apps/web/app/[tenant]/dashboard/management/payroll/page.tsx` |
| R027 | `/[tenant]/dashboard/media` | `apps/web/app/[tenant]/dashboard/media/page.tsx` |
| R028 | `/[tenant]/dashboard/notifications` | `apps/web/app/[tenant]/dashboard/notifications/page.tsx` |
| R029 | `/[tenant]/dashboard` | `apps/web/app/[tenant]/dashboard/page.tsx` |
| R030 | `/[tenant]/dashboard/partners` | `apps/web/app/[tenant]/dashboard/partners/page.tsx` |
| R031 | `/[tenant]/dashboard/performance` | `apps/web/app/[tenant]/dashboard/performance/page.tsx` |
| R032 | `/[tenant]/dashboard/platform/[companyId]` | `apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx` |
| R033 | `/[tenant]/dashboard/platform/access` | `apps/web/app/[tenant]/dashboard/platform/access/page.tsx` |
| R034 | `/[tenant]/dashboard/platform/accounting` | `apps/web/app/[tenant]/dashboard/platform/accounting/page.tsx` |
| R035 | `/[tenant]/dashboard/platform/audit` | `apps/web/app/[tenant]/dashboard/platform/audit/page.tsx` |
| R036 | `/[tenant]/dashboard/platform/companies` | `apps/web/app/[tenant]/dashboard/platform/companies/page.tsx` |
| R037 | `/[tenant]/dashboard/platform/configuration` | `apps/web/app/[tenant]/dashboard/platform/configuration/page.tsx` |
| R038 | `/[tenant]/dashboard/platform/contracts` | `apps/web/app/[tenant]/dashboard/platform/contracts/page.tsx` |
| R039 | `/[tenant]/dashboard/platform/coupons` | `apps/web/app/[tenant]/dashboard/platform/coupons/page.tsx` |
| R040 | `/[tenant]/dashboard/platform/finance` | `apps/web/app/[tenant]/dashboard/platform/finance/page.tsx` |
| R041 | `/[tenant]/dashboard/platform/intelligence` | `apps/web/app/[tenant]/dashboard/platform/intelligence/page.tsx` |
| R042 | `/[tenant]/dashboard/platform` | `apps/web/app/[tenant]/dashboard/platform/page.tsx` |
| R043 | `/[tenant]/dashboard/platform/permissions` | `apps/web/app/[tenant]/dashboard/platform/permissions/page.tsx` |
| R044 | `/[tenant]/dashboard/platform/plans` | `apps/web/app/[tenant]/dashboard/platform/plans/page.tsx` |
| R045 | `/[tenant]/dashboard/platform/proposals/[id]` | `apps/web/app/[tenant]/dashboard/platform/proposals/[id]/page.tsx` |
| R046 | `/[tenant]/dashboard/platform/proposals/new` | `apps/web/app/[tenant]/dashboard/platform/proposals/new/page.tsx` |
| R047 | `/[tenant]/dashboard/platform/proposals` | `apps/web/app/[tenant]/dashboard/platform/proposals/page.tsx` |
| R048 | `/[tenant]/dashboard/platform/subscriptions` | `apps/web/app/[tenant]/dashboard/platform/subscriptions/page.tsx` |
| R049 | `/[tenant]/dashboard/platform/support` | `apps/web/app/[tenant]/dashboard/platform/support/page.tsx` |
| R050 | `/[tenant]/dashboard/platform/whatsapp` | `apps/web/app/[tenant]/dashboard/platform/whatsapp/page.tsx` |
| R051 | `/[tenant]/dashboard/ponto` | `apps/web/app/[tenant]/dashboard/ponto/page.tsx` |
| R052 | `/[tenant]/dashboard/reports` | `apps/web/app/[tenant]/dashboard/reports/page.tsx` |
| R053 | `/[tenant]/dashboard/rh` | `apps/web/app/[tenant]/dashboard/rh/page.tsx` |
| R054 | `/[tenant]/dashboard/settings` | `apps/web/app/[tenant]/dashboard/settings/page.tsx` |
| R055 | `/[tenant]/dashboard/support` | `apps/web/app/[tenant]/dashboard/support/page.tsx` |
| R056 | `/[tenant]/dashboard/time-track/clock-in` | `apps/web/app/[tenant]/dashboard/time-track/clock-in/page.tsx` |
| R057 | `/[tenant]/dashboard/time-track/closing` | `apps/web/app/[tenant]/dashboard/time-track/closing/page.tsx` |
| R058 | `/[tenant]/dashboard/time-track/occurrences` | `apps/web/app/[tenant]/dashboard/time-track/occurrences/page.tsx` |
| R059 | `/[tenant]/dashboard/time-track` | `apps/web/app/[tenant]/dashboard/time-track/page.tsx` |
| R060 | `/[tenant]/dashboard/time-track/rules` | `apps/web/app/[tenant]/dashboard/time-track/rules/page.tsx` |
| R061 | `/[tenant]/dashboard/time-tracking` | `apps/web/app/[tenant]/dashboard/time-tracking/page.tsx` |
| R062 | `/[tenant]/dashboard/users` | `apps/web/app/[tenant]/dashboard/users/page.tsx` |
| R063 | `/[tenant]/dashboard/vacations` | `apps/web/app/[tenant]/dashboard/vacations/page.tsx` |
| R064 | `/[tenant]/dashboard/whatsapp` | `apps/web/app/[tenant]/dashboard/whatsapp/page.tsx` |
| R065 | `/[tenant]/fatura-pendente` | `apps/web/app/[tenant]/fatura-pendente/page.tsx` |
| R066 | `/[tenant]/parceiros` | `apps/web/app/[tenant]/parceiros/page.tsx` |
| R067 | `/[tenant]/portal/documentos` | `apps/web/app/[tenant]/portal/documentos/page.tsx` |
| R068 | `/[tenant]/portal/ferias` | `apps/web/app/[tenant]/portal/ferias/page.tsx` |
| R069 | `/[tenant]/portal/holerites` | `apps/web/app/[tenant]/portal/holerites/page.tsx` |
| R070 | `/[tenant]/portal` | `apps/web/app/[tenant]/portal/page.tsx` |
| R071 | `/[tenant]/portal/ponto` | `apps/web/app/[tenant]/portal/ponto/page.tsx` |
| R072 | `/auth/ghost-init` | `apps/web/app/auth/ghost-init/page.tsx` |
| R073 | `/auth/ghost` | `apps/web/app/auth/ghost/page.tsx` |
| R074 | `/cadastro` | `apps/web/app/cadastro/page.tsx` |
| R075 | `/carreiras/[companyId]/[jobId]` | `apps/web/app/carreiras/[companyId]/[jobId]/page.tsx` |
| R076 | `/carreiras/[companyId]` | `apps/web/app/carreiras/[companyId]/page.tsx` |
| R077 | `/carreiras` | `apps/web/app/carreiras/page.tsx` |
| R078 | `/criar-conta` | `apps/web/app/criar-conta/page.tsx` |
| R079 | `/esqueci-senha` | `apps/web/app/esqueci-senha/page.tsx` |
| R080 | `/forgot-password` | `apps/web/app/forgot-password/page.tsx` |
| R081 | `/login` | `apps/web/app/login/page.tsx` |
| R082 | `/` | `apps/web/app/page.tsx` |
| R083 | `/privacidade` | `apps/web/app/privacidade/page.tsx` |
| R084 | `/reset-password` | `apps/web/app/reset-password/page.tsx` |
| R085 | `/suporte` | `apps/web/app/suporte/page.tsx` |
| R086 | `/termos` | `apps/web/app/termos/page.tsx` |

## Controles e campos por arquivo

Identificadores A/F/C são locais a cada arquivo. As linhas referem-se à referência de leitura e podem mudar na implementação. Para confirmar contexto, abra o arquivo; não reescreva ações apenas pela legenda.

### apps/web/app/(public)/planos/page.tsx

Origem: arquivo local.

Títulos: 72: Planos perfeitos para o tamanho da sua ambição.; 143: {plan.name === 'VIP' ? <Building2 className="text-emerald-400" /> : plan.name === 'Pro' ? <ShieldCheck className="text-indigo-400" /> : null} {plan.name}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 84 / button | Mensal | `onClick={() => setBillingCycle('MONTHLY')}` | `—` |
| A002 | 90 / button | Anual -10% | `onClick={() => setBillingCycle('YEARLY')}` | `—` |
| A003 | 191 / button | Começar Agora | `onClick={() => handleSelectPlan(plan.id)}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 106 / input | `type="range"; value={seatQuantity}` |

Chamadas reconhecidas: `api.request`.

Funções existentes: `PlanosPage`, `fetchPlans`.

### apps/web/app/[tenant]/clientes/layout.tsx

Origem: arquivo local.

Títulos: 17: Portal do Cliente.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 19 / Link | Sair | `href="/login"` | `—` |

Funções existentes: `ClientesLayout`.

### apps/web/app/[tenant]/clientes/page.tsx

Origem: arquivo local.

Títulos: 13: Portal do Cliente.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 16 / button | Abrir Chamado | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |

Funções existentes: `ClientesPage`.

### apps/web/app/[tenant]/dashboard/_components/dashboard-home-cards.tsx

Origem: arquivo local.

Títulos: 51: {value}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 100 / Link | {title} {description} {badge} | `href={href}` | `—` |

Funções existentes: `StatCard`, `ActivityItem`, `QuickAccessCard`.

### apps/web/app/[tenant]/dashboard/_components/dashboard-sidebar.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 72 / Link | {item.label} {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />} | `onClick={onClose}; href={ˋ/${tenant}${item.href}ˋ}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 78 / UserIdentityCard | `name={user?.name}` |

Legendas/opções encontradas em configurações: `Dashboard`, `Funcionários`, `Escalas`, `Férias`, `Gestão`, `Usuários`, `Configurações`, `Suporte`, `Vagas`, `Plataforma`.

Chamadas reconhecidas: `api.companies.me`.

Funções existentes: `canSeeItem`, `isActive`, `DashboardSidebar`, `UserIdentityCard`.

### apps/web/app/[tenant]/dashboard/_components/dashboard-topbar.tsx

Origem: Git HEAD (alterações locais preservadas).

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 56 / button | "Abrir menu" | `onClick={onMenu}` | `type="button"` |
| A002 | 84 / button | "NotificaÃ§Ãµes" | `onClick={() => goTo('/dashboard/notifications')}` | `type="button"` |
| A003 | 95 / button | "Abrir perfil" | `onClick={() => setProfileOpen((v) => !v)}` | `type="button"` |
| A004 | 118 / button | "Fechar menu" | `onClick={() => setProfileOpen(false)}` | `type="button"` |
| A005 | 142 / button | ConfiguraÃ§Ãµes | `onClick={() => goTo('/dashboard/settings')}` | `type="button"` |
| A006 | 152 / button | Sair | `onClick={handleLogout}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 73 / input | `type="search"; aria-label="Buscar"; placeholder="Buscar pessoas, escalas, fÃ©rias..."` |

Funções existentes: `DashboardTopbar`, `goTo`, `handleLogout`.

### apps/web/app/[tenant]/dashboard/_components/employee-dashboard.tsx

Origem: arquivo local.

Títulos: 58: Ola, {firstName} . Sua jornada em um so lugar.; 75: Banco de horas; 103: Aniversariantes; 122: Jornadas recentes.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 61 / Link | Bater ponto | `href={ˋ/${tenant}/dashboard/time-track/clock-inˋ}` | `—` |
| A002 | 123 / Link | Ver todos | `href={ˋ/${tenant}/dashboard/time-trackˋ}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 66 / StatCard | `label="Banco de horas"; value={formatMinutes(summary?.totalTimeBalance ?? 0)}` |
| C002 | 67 / StatCard | `label="Trabalhado no mes"; value={formatMinutes(worked)}` |
| C003 | 68 / StatCard | `label="Horas positivas"; value={formatMinutes(credits)}` |
| C004 | 69 / StatCard | `label="Horas negativas"; value={formatMinutes(debits)}` |

Funções existentes: `EmployeeDashboard`, `StatCard`, `BalancePill`, `BalanceTooltip`.

### apps/web/app/[tenant]/dashboard/_components/notification-bell.tsx

Origem: arquivo local.

Títulos: 83: Notificações.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 67 / button | "Notificações" | `onClick={() => setOpen(!open)}` | `type="button"` |
| A002 | 88 / button | Marcar todas | `onClick={() => markAllReadMut.mutate()}` | `type="button"` |
| A003 | 96 / button | (ícone/controle sem legenda estática) | `onClick={() => setOpen(false)}` | `type="button"` |
| A004 | 120 / button | Copiar | `onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(n.extraJson.resetCode); alert('Código copiado!'); }}` | `—` |
| A005 | 138 / button | Marcar lida | `onClick={() => markReadMut.mutate(n.id)}` | `type="button"; disabled={markReadMut.loading}` |
| A006 | 148 / Link | Abrir | `onClick={() => setOpen(false)}; href={n.targetUrl}` | `—` |
| A007 | 162 / Link | Ver todas as notificações | `onClick={() => setOpen(false)}; href={ˋ/${tenant}/dashboard/notificationsˋ}` | `—` |

Chamadas reconhecidas: `api.notifications.dashboardWidget`, `api.notifications.markAsRead`, `api.notifications.markAllAsRead`.

Funções existentes: `NotificationBell`.

### apps/web/app/[tenant]/dashboard/_components/password-change-gate.tsx

Origem: arquivo local.

Títulos: 39: Troque sua senha.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 51 / button | Sair | `onClick={logout}` | `—` |
| A002 | 52 / button | {saving ? 'Salvando...' : 'Trocar senha'} | `onClick={submit}` | `disabled={!valid \|\| saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 60 / input | `type="password"; value={value}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 45 / PasswordField | `label="Senha atual"; value={currentPassword}` |
| C002 | 46 / PasswordField | `label="Nova senha"; value={newPassword}` |
| C003 | 47 / PasswordField | `label="Confirmar nova senha"; value={confirmPassword}` |

Funções existentes: `PasswordChangeGate`, `submit`, `PasswordField`.

### apps/web/app/[tenant]/dashboard/_components/pending-notifications-gate.tsx

Origem: arquivo local.

Títulos: 52: {docTitle}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 118 / button | RECUSAR ASSINATURA | `onClick={() => handleAction('REFUSE')}` | `type="button"; disabled={submitting}` |
| A002 | 129 / button | ASSINAR E ACEITAR TERMOS | `onClick={() => handleAction('ACCEPT')}` | `type="button"; disabled={submitting}` |
| A003 | 139 / button | ESTOU CIENTE | `onClick={() => handleAction('ACKNOWLEDGE')}` | `type="button"; disabled={submitting}` |

Chamadas reconhecidas: `api.notifications.dashboardWidget`, `api.notifications.respond`.

Funções existentes: `PendingNotificationsGate`.

### apps/web/app/[tenant]/dashboard/_components/privacy-consent-gate.tsx

Origem: arquivo local.

Títulos: 227: Termos de Uso e Política de Privacidade; 246: Identificação do Colaborador Assinante; 256: {section.title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 283 / button | {saving ? 'Processando...' : 'Aceitar termos'} | `onClick={handleInitiateAccept}` | `disabled={!checked \|\| saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 272 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 237 / InfoLine | `label="Controladora"; value="A empresa cliente detém o controle dos dados de seus colaboradores."` |
| C002 | 238 / InfoLine | `label="Operadora e IA"; value="Innovation RH System operado sob tecnologia da Innovation System e consultoria."` |
| C003 | 239 / InfoLine | `label="Finalidade Base"; value={status.purpose \|\| FALLBACK_PURPOSE}` |
| C004 | 240 / InfoLine | `label="Versão Contratual"; value={status.termVersion \|\| TERMS_VERSION}` |

Legendas/opções encontradas em configurações: `1. Finalidade do sistema e Segurança`, `2. Ferramentas de IA da Innovation System e consultoria`, `3. Papéis na LGPD`, `4. Dados tratados e Dados Sensíveis`, `5. Bases legais e Prazos de Retenção`, `6. Responsabilidades do usuário do Painel`, `7. Direitos dos titulares dos dados`.

Funções existentes: `PrivacyConsentGate`, `fetchEmployee`, `loadStatus`, `InfoLine`, `getApiBaseUrl`.

### apps/web/app/[tenant]/dashboard/_components/proposal-gate.tsx

Origem: arquivo local.

Títulos: 82: Proposta Comercial: {pendingProposal.title}; 97: Termos e Condições.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 70 / button | Revisar e Assinar | `onClick={() => setModalOpen(true)}` | `—` |
| A002 | 128 / button | Cancelar | `onClick={() => setModalOpen(false)}` | `—` |
| A003 | 129 / button | {loading ? 'Processando...' : 'Assinar e Ir para Pagamento'} | `onClick={handleSign}` | `disabled={loading \|\| !acceptedTerms}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 106 / input | `value={signedByName}` |
| F002 | 110 / input | `value={signedByEmail}` |
| F003 | 115 / input | `type="checkbox"; id="acceptTerms"` |

Chamadas reconhecidas: `api.proposals.getCompanyProposals`, `api.proposals.acceptTerms`.

Funções existentes: `ProposalGate`.

### apps/web/app/[tenant]/dashboard/_components/role-dashboards/commercial-dashboard.tsx

Origem: arquivo local.

Títulos: 14: Meu Painel (Comercial); 39: Últimas Vendas.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 40 / button | Ver Histórico | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |

Funções existentes: `CommercialDashboard`.

### apps/web/app/[tenant]/dashboard/_components/shell-v2/mobile-bottom-nav.tsx

Origem: Git HEAD (alterações locais preservadas).

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 32 / Link | {item.label} | `href={ˋ/${tenant}${item.href}ˋ}` | `—` |
| A002 | 46 / button | Mais | `onClick={onMenu}` | `type="button"` |

Legendas/opções encontradas em configurações: `InÃ­cio`, `Equipe`, `Escalas`, `FÃ©rias`.

Funções existentes: `MobileBottomNav`.

### apps/web/app/[tenant]/dashboard/_components/shell-v2/sidebar.tsx

Origem: Git HEAD (alterações locais preservadas).

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 41 / button | "Fechar menu" | `onClick={onClose}` | `—` |
| A002 | 63 / Link | {company.data?.logoUrl ? ( <img src={company.data.logoUrl} alt="Logo" className="h-full w-full object-contain bg-white" /> ) : 'IR'} {normalizeDisplayName(company.data?.name) \|\| 'Innovation RH'} People Platform | `onClick={onClose}; href={ˋ/${tenant}/dashboardˋ}` | `—` |
| A003 | 82 / button | "Fechar" | `onClick={onClose}` | `—` |
| A004 | 105 / Link | {item.label} {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />} | `onClick={onClose}; href={ˋ/${tenant}${item.href}ˋ}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 128 / UserChip | `name={user?.name}` |

Chamadas reconhecidas: `api.companies.me`.

Funções existentes: `canSeeItem`, `SidebarV2`, `UserChip`.

### apps/web/app/[tenant]/dashboard/_components/shell-v2/topbar.tsx

Origem: Git HEAD (alterações locais preservadas).

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 33 / button | "Abrir menu" | `onClick={onMenu}` | `type="button"` |
| A002 | 42 / button | Buscar pessoas, escalas, fÃ©rias... âŒ˜K | `onClick={() => router.push(ˋ/${tenant}/dashboard/searchˋ)}` | `type="button"` |
| A003 | 55 / button | "Alternar tema" | `onClick={toggleTheme}` | `type="button"` |
| A004 | 64 / button | "NotificaÃ§Ãµes" | `onClick={() => router.push(ˋ/${tenant}/dashboard/notificationsˋ)}` | `type="button"` |
| A005 | 80 / button | {initials} | `onClick={() => setProfileOpen(!profileOpen)}` | `type="button"` |
| A006 | 104 / button | ConfiguraÃ§Ãµes | `onClick={() => { setProfileOpen(false); router.push(ˋ/${tenant}/dashboard/settingsˋ); }}` | `—` |
| A007 | 113 / button | Sair | `onClick={() => { logout(); router.push('/login'); }}` | `—` |

Funções existentes: `TopbarV2`.

### apps/web/app/[tenant]/dashboard/chat/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `ChatPage`.

### apps/web/app/[tenant]/dashboard/colaboradores/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `ColaboradoresPage`.

### apps/web/app/[tenant]/dashboard/employees/import/page.tsx

Origem: arquivo local.

Títulos: 47: "Importação por Excel" — "Use somente o modelo .xlsx, com até 2 MB e 2.000 linhas.".

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 51 / Link | Voltar | `href="./"` | `—` |
| A002 | 57 / button | Baixar modelo Cabeçalhos e aba no formato correto | `onClick={downloadTemplate}` | `—` |
| A003 | 66 / button | Confirmar importação de {result.validRows} funcionários | `onClick={confirm}` | `disabled={busy}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 58 / input | `type="file"` |

Chamadas reconhecidas: `api.employees.validateImport`, `api.employees.confirmImport`.

Funções existentes: `EmployeesImportPage`, `downloadTemplate`, `validate`, `confirm`.

### apps/web/app/[tenant]/dashboard/employees/new/page.tsx

Origem: arquivo local.

Títulos: 439: {isEdit ? 'Editar colaborador' : 'Novo colaborador'} — "Preencha os dados cadastrais do funcionário".

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 443 / Link | Voltar | `href={ˋ/${tenant}/dashboard/employeesˋ}` | `—` |
| A002 | 465 / button | {tab} | `onClick={() => setActiveTab(tab)}` | `type="button"` |
| A003 | 597 / button | (ícone/controle sem legenda estática) | `onClick={() => removeDependent(index)}` | `type="button"` |
| A004 | 613 / button | Adicionar dependente | `onClick={addDependent}` | `type="button"` |
| A005 | 656 / Link | Cancelar | `href={ˋ/${tenant}/dashboard/employeesˋ}` | `—` |
| A006 | 657 / button | {save.loading ? 'Salvando...' : 'Salvar colaborador'} | `onClick={handleSubmit}` | `type="button"; disabled={save.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 502 / input | `type="checkbox"` |
| F002 | 546 / textarea | `value={form.observations ?? ''}` |
| F003 | 677 / input | `type={type}; placeholder={placeholder}; value={value}` |
| F004 | 686 / select | `value={value}` |
| F005 | 697 / select | `value={value}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 479 / Field | `label="Nome completo"; value={form.name}` |
| C002 | 480 / Field | `label="CPF"; value={form.cpf ?? ''}; placeholder="000.000.000-00"` |
| C003 | 481 / Field | `label="Data de nascimento"; type="date"; value={form.birthDate ?? ''}` |
| C004 | 482 / Field | `label="E-mail"; type="email"; value={form.email ?? ''}` |
| C005 | 483 / Field | `label="Data de admissão"; type="date"; value={form.admissionDate ?? ''}` |
| C006 | 484 / Field | `label="Telefone"; value={form.phone ?? ''}; placeholder="+55 11 90000-0000"` |
| C007 | 485 / Field | `label="Telefone Secundário"; value={form.secondaryPhone ?? ''}; placeholder="+55 11 90000-0000"` |
| C008 | 486 / Field | `label="Matrícula"; value={form.registration ?? ''}; placeholder="EMP-0001"` |
| C009 | 487 / Select | `label="Gênero"; value={form.gender ?? ''}; options={GENDER_OPTIONS}` |
| C010 | 488 / Select | `label="Estado Civil"; value={form.maritalStatus ?? ''}; options={MARITAL_STATUS_OPTIONS}` |
| C011 | 489 / Select | `label="Escolaridade"; value={form.education ?? ''}; options={EDUCATION_OPTIONS}` |
| C012 | 490 / Field | `label="Nome da Mãe"; value={form.motherName ?? ''}` |
| C013 | 491 / Field | `label="Nome do Pai"; value={form.fatherName ?? ''}` |
| C014 | 492 / Field | `label="Naturalidade / Cidade natal"; value={form.birthplace ?? ''}` |
| C015 | 493 / Field | `label="Nacionalidade"; value={form.nationality ?? 'Brasileira'}` |
| C016 | 517 / Field | `label="PIS / PASEP / NIT"; value={form.pis ?? ''}; placeholder="000.00000.00-0"` |
| C017 | 519 / Field | `label="RG"; value={form.rg ?? ''}` |
| C018 | 520 / Field | `label="Órgão Emissor"; value={form.rgIssuer ?? ''}; placeholder="SSP"` |
| C019 | 521 / Field | `label="UF Emissão RG"; value={form.rgState ?? ''}; placeholder="SP"` |
| C020 | 522 / Field | `label="Data Emissão RG"; type="date"; value={form.rgIssueDate ?? ''}` |
| C021 | 524 / Field | `label="Número"; value={form.voterTitle ?? ''}` |
| C022 | 525 / Field | `label="Zona"; value={form.voterZone ?? ''}` |
| C023 | 526 / Field | `label="Seção"; value={form.voterSection ?? ''}` |
| C024 | 527 / Field | `label="UF"; value={form.voterState ?? ''}; placeholder="SP"` |
| C025 | 529 / Field | `label="Reservista / Militar"; value={form.reservista ?? ''}` |
| C026 | 537 / Field | `label="CEP"; value={form.cep ?? ''}; placeholder="00000-000"` |
| C027 | 538 / Field | `label="Logradouro"; value={form.street ?? ''}` |
| C028 | 539 / Field | `label="Numero"; value={form.streetNumber ?? ''}` |
| C029 | 540 / Field | `label="Complemento"; value={form.addressComplement ?? ''}` |
| C030 | 541 / Field | `label="Bairro"; value={form.neighborhood ?? ''}` |
| C031 | 542 / Field | `label="Cidade"; value={form.city ?? ''}` |
| C032 | 543 / Field | `label="Estado"; value={form.state ?? ''}` |
| C033 | 554 / Field | `label="Data de admissão"; type="date"; value={form.admissionDate}` |
| C034 | 555 / Select | `label="Status"; value={form.status ?? 'ACTIVE'}; options={STATUS_OPTIONS}` |
| C035 | 556 / Field | `label="Data de demissão"; type="date"; value={form.terminationDate ?? ''}` |
| C036 | 557 / Select | `label="Departamento"; value={form.department}; options={DEPARTMENT_OPTIONS.map((value) => ({ value, label: value }))}` |
| C037 | 558 / Select | `label="Cargo"; value={form.position}; options={POSITION_OPTIONS.map((value) => ({ value, label: value }))}` |
| C038 | 560 / Select | `label="Operação / unidade"; value={form.unit ?? 'Matriz'}; options={UNIT_OPTIONS.map((value) => ({ value, label: value }))}` |
| C039 | 567 / Select | `label="Escala"; value={form.workScale ?? '5X2'}; options={WORK_SCALE_OPTIONS}` |
| C040 | 568 / Field | `label="Descrição da escala"; value={form.customWorkScale ?? ''}` |
| C041 | 569 / Select | `label="Jornada diária padrão"; value={form.dailyWorkload ?? '08:00'}; options={DAILY_WORKLOAD_OPTIONS}` |
| C042 | 570 / Field | `label="Entrada padrão"; type="time"; value={form.standardEntry ?? ''}` |
| C043 | 571 / Field | `label="Saída almoço"; type="time"; value={form.standardLunchStart ?? ''}` |
| C044 | 572 / Field | `label="Retorno almoço"; type="time"; value={form.standardLunchReturn ?? ''}` |
| C045 | 573 / Field | `label="Saída padrão"; type="time"; value={form.standardExit ?? ''}` |
| C046 | 580 / Field | `label="Banco"; value={form.bankName ?? ''}; placeholder="001 - Banco do Brasil"` |
| C047 | 581 / Field | `label="Agência"; value={form.bankAgency ?? ''}; placeholder="0001-2"` |
| C048 | 582 / Field | `label="Conta"; value={form.bankAccount ?? ''}; placeholder="00000-0"` |
| C049 | 583 / Select | `label="Tipo de Conta"; value={form.bankAccountType ?? ''}; options={BANK_ACCOUNT_TYPE_OPTIONS}` |
| C050 | 606 / Field | `label="Nome"; value={dep.nome}` |
| C051 | 607 / Field | `label="CPF"; value={dep.cpf}; placeholder="000.000.000-00"` |
| C052 | 608 / Field | `label="Data de Nascimento"; type="date"; value={dep.dataNascimento}` |
| C053 | 609 / Select | `label="Parentesco"; value={dep.parentesco}; options={PARENTESCO_OPTIONS}` |
| C054 | 627 / Field | `label="Salário (R$)"; type="number"; value={form.salary?.toString() ?? ''}` |
| C055 | 628 / Select | `label="Tipo de contrato"; value={form.contractType ?? 'CLT'}; options={CONTRACT_OPTIONS}` |
| C056 | 630 / Field | `label={form.contractType === 'PJ' ? 'CNPJ' : 'CNPJ da empresa terceira'}; value={form.cnpj ?? ''}; placeholder="00.000.000/0000-00"` |
| C057 | 643 / Field | `label="Razão social"; value={form.legalName ?? ''}` |
| C058 | 644 / Field | `label="Nome fantasia"; value={form.tradeName ?? ''}` |
| C059 | 647 / Select | `label="Permitir acesso ao painel"; value={form.accessEnabled}; options={[{ value: 'NO', label: 'Não' }, { value: 'YES', label: 'Sim' }]}` |
| C060 | 648 / Select | `label="Perfil de acesso"; value={form.accessProfile}; options={[{ value: 'FUNCIONARIO', label: 'Funcionário' }, { value: 'GESTOR', label: 'Gestor' }, { value: 'RH', label: 'RH' }, { value: 'ADMIN', label: 'Administrador' }, { value: 'CONSULTA', label: 'Consulta' }]}` |

Legendas/opções encontradas em configurações: `Ativo`, `Em admissão`, `Férias`, `Afastado`, `Desligado`, `5x2`, `6x1`, `12x36`, `4x2`, `Outro`, `08:00`, `07:20`, `06:00`, `12:00`, `CLT`, `PJ`, `Estágio`, `Temporário`, `Jovem Aprendiz`, `Terceirizado`, `Selecione...`, `Masculino`, `Feminino`, `Solteiro(a)`, `Casado(a)`, `Divorciado(a)`, `Viúvo(a)`, `União Estável`, `Analfabeto`, `Até o 5º ano incompleto do Ensino Fundamental`, `5º ano completo do Ensino Fundamental`, `Do 6º ao 9º ano incompleto do Ensino Fundamental`, `Ensino Fundamental Completo`, `Ensino Médio Incompleto`, `Ensino Médio Completo`, `Educação Superior Incompleta`, `Educação Superior Completa`, `Pós-Graduação Incompleta`, `Pós-Graduação Completa`, `Mestrado Completo`, `Doutorado Completo`, `Conta Corrente`, `Conta Poupança`, `Filho`, `Filha`, `Enteado`, `Enteada`, `Cônjuge`, `Companheiro`, `Companheira`, `Pai`, `Mãe`, ``, `Não`, `Sim`, `Funcionário`, `Gestor`, `RH`, `Administrador`, `Consulta`.

Chamadas reconhecidas: `api.employees.list`, `api.employees`, `api.employees.update`, `api.employees.create`.

Funções existentes: `NewEmployeePage`, `EmployeeForm`, `fetchCnpj`, `set`, `addDependent`, `removeDependent`, `updateDependent`, `handleSubmit`, `Field`, `Select`, `ManagerSelect`, `dateInput`, `isoDate`, `compactPayload`.

### apps/web/app/[tenant]/dashboard/employees/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 134: Cadastro da equipe; 481: {employee ? normalizeDisplayName(employee.name) : 'Carregando...'}; 512: Resumo 360; 530: SaÃƒÂºde ocupacional e ASO; 557: FÃƒÂ©rias recentes; 577: Batidas e ocorrÃƒÂªncias recentes; 595: PolÃƒÂ­tica de exclusÃƒÂ£o segura.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 143 / Link | Importar XLSX | `href={ˋ/${tenant}/dashboard/employees/importˋ}` | `—` |
| A002 | 150 / Link | Novo funcionÃƒÂ¡rio | `href={ˋ/${tenant}/dashboard/employees/newˋ}` | `—` |
| A003 | 248 / IconBtn | "Ficha" | `onClick={() => handleDownloadFicha(employee)}` | `disabled={downloadingId === employee.id}` |
| A004 | 249 / IconBtn | "Folha" | `onClick={() => handleDownloadSheet(employee)}` | `disabled={downloadingId === employee.id}` |
| A005 | 250 / IconBtn | "Ocorr." | `onClick={() => handleDownloadOcorrencias(employee)}` | `disabled={downloadingId === employee.id}` |
| A006 | 254 / IconBtn | "Ponto" | `onClick={() => router.push(ˋ/${tenant}/dashboard/time-track?employeeId=${employee.id}ˋ)}` | `—` |
| A007 | 258 / IconBtn | "DossiÃƒÂª" | `onClick={() => setSelectedEmployeeId(employee.id)}` | `—` |
| A008 | 261 / Link | Editar | `href={ˋ/${tenant}/dashboard/employees/new?id=${employee.id}ˋ}` | `—` |
| A009 | 267 / button | Desligar | `onClick={() => handleTerminate(employee)}` | `disabled={employee.status === 'TERMINATED' \|\| terminate.loading}` |
| A010 | 274 / button | Excluir | `onClick={() => handleSafeDelete(employee)}` | `disabled={remove.loading}` |
| A011 | 335 / button | Cancelar | `onClick={() => setPromptDialog((p) => ({ ...p, open: false }))}` | `—` |
| A012 | 338 / button | Confirmar | `onClick={async () => { await promptDialog.action(); setPromptDialog((p) => ({ ...p, open: false })); }}` | `disabled={promptInput !== promptDialog.expected}` |
| A013 | 361 / button | Entendi | `onClick={() => setAlertDialog((a) => ({ ...a, open: false }))}` | `—` |
| A014 | 412 / button | {label} | `onClick={onClick}` | `disabled={disabled}` |
| A015 | 488 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 176 / input | `placeholder="Digite para filtrar a equipe"; value={search}` |
| F002 | 327 / input | `type="text"; placeholder="Digite o nome..."; value={promptInput}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 195 / LoadingState | `label="Carregando funcionÃƒÂ¡rios..."` |
| C002 | 248 / IconBtn | `disabled={downloadingId === employee.id}; label="Ficha"` |
| C003 | 249 / IconBtn | `disabled={downloadingId === employee.id}; label="Folha"` |
| C004 | 250 / IconBtn | `disabled={downloadingId === employee.id}; label="Ocorr."` |
| C005 | 254 / IconBtn | `label="Ponto"` |
| C006 | 258 / IconBtn | `label="DossiÃƒÂª"` |
| C007 | 498 / LoadingState | `label="Carregando dossiÃƒÂª do funcionÃƒÂ¡rio..."` |
| C008 | 504 / DossierStat | `label="Status"; value={EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status}` |
| C009 | 505 / DossierStat | `label="ASOs"; value={String(asoRecords.length)}` |
| C010 | 506 / DossierStat | `label="FÃƒÂ©rias"; value={String(vacations.length)}` |
| C011 | 507 / DossierStat | `label="OcorrÃƒÂªncias"; value={String(occurrences.length)}` |
| C012 | 518 / InfoLine | `label="CPF"; value={maskCpf(employee.cpf)}` |
| C013 | 519 / InfoLine | `label="E-mail"; value={maskEmail(employee.email)}` |
| C014 | 520 / InfoLine | `label="Telefone"; value={maskPhone(employee.phone)}` |
| C015 | 521 / InfoLine | `label="MatrÃƒÂ­cula"; value={employee.registration \|\| 'Ã¢â‚¬â€'}` |
| C016 | 522 / InfoLine | `label="Cargo"; value={employee.position \|\| 'Ã¢â‚¬â€'}` |
| C017 | 523 / InfoLine | `label="Departamento"; value={employee.department \|\| 'Ã¢â‚¬â€'}` |
| C018 | 524 / InfoLine | `label="AdmissÃƒÂ£o"; value={formatDate(employee.admissionDate)}` |
| C019 | 525 / InfoLine | `label="Desligamento"; value={formatDate(employee.terminationDate)}` |
| C020 | 603 / InfoChip | `label="Ponto"; value={String(impact.timeTracks)}` |
| C021 | 604 / InfoChip | `label="FÃƒÂ©rias"; value={String(impact.vacations)}` |
| C022 | 605 / InfoChip | `label="ASO"; value={String(impact.asoRecords)}` |
| C023 | 606 / InfoChip | `label="OcorrÃƒÂªncias"; value={String(impact.timeOccurrences)}` |

Legendas/opções encontradas em configurações: ``, `Desligar funcionÃƒÂ¡rio`, `Arquivar ou excluir funcionÃƒÂ¡rio`, `FuncionÃƒÂ¡rio Arquivado`, `FuncionÃƒÂ¡rio Removido`, `Erro de Download`, `Ativo`, `Em admissÃƒÂ£o`, `FÃƒÂ©rias`, `Afastado`, `Desligado`, `Sem data definida`, `Vencido`, `PrÃƒÂ³ximo do vencimento`, `VÃƒÂ¡lido`.

Chamadas reconhecidas: `api.employees.list`, `api.employees.terminate`, `api.employees.delete`, `api.employees.dossier`.

Funções existentes: `EmployeesPage`, `handleTerminate`, `handleSafeDelete`, `handleDownloadFicha`, `handleDownloadSheet`, `handleDownloadOcorrencias`, `KpiTile`, `IconBtn`, `AccessBadge`, `StatusBadge`, `EmployeeDossierDrawer`, `DossierStat`, `InfoLine`, `InfoChip`, `fmtDate`, `maskCpf`, `maskEmail`, `maskPhone`, `currentMonth`, `downloadEmployeePdf`, `getAsoAlert`.

### apps/web/app/[tenant]/dashboard/escala/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `EscalaRedirect`.

### apps/web/app/[tenant]/dashboard/escalas/_components/escalas-nav.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 28 / Link | {item.title} | `href={href}` | `—` |

Funções existentes: `EscalasNav`.

### apps/web/app/[tenant]/dashboard/escalas/calendario/page.tsx

Origem: arquivo local.

Títulos: 374: Jornada Programada; 709: {MONTH_NAMES[month - 1]} {year}; 1440: {MONTH_NAMES[month-1]} {year}; 2176: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 376 / Link | ABRIR PONTO | `href={ˋ/${tenant}/dashboard/time-trackˋ}` | `—` |
| A002 | 386 / button | {icon} {label} | `onClick={() => router.push(ˋ?tab=${key}ˋ)}` | `—` |
| A003 | 474 / button | {selected ? ( <> <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm bg-brand" > {getInitials(selected.name \|\| '')} </div> <div className="flex-1 min-w-0"> <p className="text-sm font-semibold text-slate-900 truncate"> {selected.regis… | `onClick={() => setOpen(!open)}` | `—` |
| A004 | 505 / button | (ícone/controle sem legenda estática) | `onClick={(e) => { e.stopPropagation(); onSelect(''); setSearch(''); }}` | `—` |
| A005 | 530 / button | (ícone/controle sem legenda estática) | `onClick={() => setSearch('')}` | `—` |
| A006 | 538 / button | Minha Escala Seus próprios dados {!selectedId && <Check size={14} className="text-slate-700 shrink-0" />} | `onClick={() => { onSelect(''); setOpen(false); setSearch(''); }}` | `—` |
| A007 | 559 / button | {getInitials(e.name \|\| '')} {e.registration ? String(e.registration).padStart(4, '0') : 'S/N'} - {e.name?.toUpperCase()} {e.department} · {e.position} {selectedId === e.id && <Check size={14} className="text-slate-700" />} | `onClick={() => { onSelect(e.id); setOpen(false); setSearch(''); }}` | `—` |
| A008 | 703 / button | (ícone/controle sem legenda estática) | `onClick={onPrev}` | `—` |
| A009 | 712 / button | (ícone/controle sem legenda estática) | `onClick={onNext}` | `—` |
| A010 | 793 / button | {dayNum} {day.scheduled.entry && day.scheduled.exit ? ( <div className="flex flex-col items-center justify-center mt-1.5 gap-1"> <span className={`text-[10px] font-bold ${meta.textColor} leading-none`}> {day.scheduled.entry.slice(0,5)} </span> <span className={`text-[10px] font-bold ${meta.textCo… | `onClick={() => onSelectDay(isSelected ? null : day)}` | `—` |
| A011 | 981 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A012 | 1017 / button | Editar horário | `onClick={() => setIsEditing(true)}` | `—` |
| A013 | 1046 / button | Cancelar | `onClick={() => setIsEditing(false)}` | `—` |
| A014 | 1052 / button | {loading ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Salvar Ajuste | `onClick={handleAjuste}` | `disabled={loading}` |
| A015 | 1078 / button | Ajuste do mês inteiro | `onClick={() => setShowMonthlyAdj(true)}` | `—` |
| A016 | 1095 / button | Lançar Ajuste | `onClick={() => setIsEditingPonto(true)}` | `—` |
| A017 | 1150 / button | Cancelar | `onClick={() => setIsEditingPonto(false)}` | `—` |
| A018 | 1151 / button | {loading ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Salvar Ajuste | `onClick={handleAjustePonto}` | `disabled={loading}` |
| A019 | 1361 / button | {t.icon} {t.label} | `onClick={() => setType(t.value)}` | `—` |
| A020 | 1390 / button | Cancelar | `onClick={onClose}` | `—` |
| A021 | 1391 / button | {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Aplicar Ajuste | `onClick={submit}` | `disabled={loading}` |
| A022 | 1434 / button | (ícone/controle sem legenda estática) | `onClick={onPrev}` | `—` |
| A023 | 1443 / button | (ícone/controle sem legenda estática) | `onClick={onNext}` | `—` |
| A024 | 1451 / button | Atualizar | `onClick={onRefresh}` | `—` |
| A025 | 1458 / button | Lançar Escala | `onClick={onLancar}` | `—` |
| A026 | 1534 / button | {getInitials(employee.name \|\| '')} {employee.registration && ( <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest border border-slate-200 group-hover:border-brand/30 group-hover:text-brand transition-colors"> {String(employee.registration).pad… | `onClick={onSelect}` | `—` |
| A027 | 1609 / button | Atualizar | `onClick={onRefresh}` | `—` |
| A028 | 1615 / button | Nova Solicitação | `onClick={onNovatroca}` | `—` |
| A029 | 1677 / button | Revisar | `onClick={() => onApprove(swap)}` | `—` |
| A030 | 1684 / button | Cancelar | `onClick={() => onCancel(swap.id)}` | `—` |
| A031 | 1792 / button | Cancelar | `onClick={onClose}` | `—` |
| A032 | 1793 / button | {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Enviar | `onClick={submit}` | `disabled={loading}` |
| A033 | 1839 / button | {opt === 'APPROVED' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>} {opt === 'APPROVED' ? 'Aprovar' : 'Rejeitar'} | `onClick={() => setAction(opt)}` | `—` |
| A034 | 1869 / button | Cancelar | `onClick={onClose}` | `—` |
| A035 | 1870 / button | {loading ? <Loader2 size={14} className="animate-spin"/> : action === 'APPROVED' ? <Check size={14}/> : <X size={14}/>} {action === 'APPROVED' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'} | `onClick={submit}` | `disabled={loading}` |
| A036 | 1950 / button | {m === 'assign' ? 'Atribuir Existente' : 'Criar Nova Escala'} | `onClick={() => setMode(m)}` | `—` |
| A037 | 1973 / button | (ícone/controle sem legenda estática) | `onClick={() => toggleEmployee(e.id)}` | `—` |
| A038 | 1996 / button | Nenhum | `onClick={() => selectAction('none')}` | `—` |
| A039 | 2004 / button | Filtrados | `onClick={() => selectAction('filtered')}` | `—` |
| A040 | 2012 / button | Todos | `onClick={() => selectAction('all')}` | `—` |
| A041 | 2046 / button | {isSelected && <Check size={11} strokeWidth={3} className="text-white"/>} {getInitials(e.name \|\| '')} {e.registration ? String(e.registration).padStart(4, '0') : 'S/N'} - {e.name?.toUpperCase()} {e.department?.toUpperCase() \|\| 'SEM DEPTO'} | `onClick={() => toggleEmployee(e.id)}` | `—` |
| A042 | 2155 / button | Cancelar | `onClick={onClose}` | `—` |
| A043 | 2156 / button | {loading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} {mode === 'assign' ? `Atribuir${selectedEmployees.length > 0 ? ` (${selectedEmployees.length})` : ''}` : 'Criar Escala'} | `onClick={mode === 'assign' ? submitAssign : submitCreate}` | `disabled={loading}` |
| A044 | 2177 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 522 / input | `placeholder="Buscar funcionário..."; value={search}` |
| F002 | 1036 / input | `type="time"; value={val}` |
| F003 | 1110 / select | `value={pontoReason}` |
| F004 | 1122 / input | `type="time"; value={pontoEntry}` |
| F005 | 1126 / input | `type="time"; value={pontoExit}` |
| F006 | 1130 / input | `type="time"; value={pontoLunchS}` |
| F007 | 1134 / input | `type="time"; value={pontoLunchR}` |
| F008 | 1140 / input | `type="text"; placeholder="Detalhes adicionais do ajuste..."; value={pontoDetail}` |
| F009 | 1349 / input | `type="month"; value={month}` |
| F010 | 1378 / textarea | `placeholder="Descreva o motivo do ajuste..."; value={observation}` |
| F011 | 1739 / select | `value={targetEmployeeId}` |
| F012 | 1755 / select | `value={swapWithId}` |
| F013 | 1771 / input | `type="date"; value={originalDate}` |
| F014 | 1776 / input | `type="date"; value={targetDate}` |
| F015 | 1782 / textarea | `placeholder="Descreva o motivo da troca..."; value={justification}` |
| F016 | 1858 / textarea | `placeholder="Explique o motivo..."; value={reason}` |
| F017 | 2026 / input | `placeholder="Buscar por nome ou matrícula..."; value={employeeSearch}` |
| F018 | 2084 / select | `value={selectedSchedule}` |
| F019 | 2099 / input | `type="date"; value={startDate}` |
| F020 | 2112 / input | `placeholder="Ex: Administrativo 8h"; value={newName}` |
| F021 | 2121 / select | `value={newType}` |
| F022 | 2141 / input | `type="time"; value={v}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 653 / SummaryCard | `label="Hora Extra"; value={totals.horaExtra > 0 ? formatMin(totals.horaExtra) : '0h00m'}` |
| C002 | 660 / SummaryCard | `label="Faltas"; value={String(totals.faltas)}` |
| C003 | 667 / SummaryCard | `label="Atrasos"; value={totals.lateMinutes > 0 ? formatMin(totals.lateMinutes) : '0h00m'}` |
| C004 | 674 / SummaryCard | `label="Saídas Antecipadas"; value={totals.saidasAntecipadas > 0 ? 'Ocorreram' : '0'}` |
| C005 | 682 / SummaryCard | `label="Saldo do Mês"; value={formatMin(totals.totalBalance)}` |
| C006 | 1064 / TimeDetailRow | `label="Entrada"; value={day.scheduled.entry?.slice(0,5) ?? '--:--'}` |
| C007 | 1065 / TimeDetailRow | `label="Início almoço"; value={day.scheduled.lunchStart?.slice(0,5) ?? '--:--'}` |
| C008 | 1066 / TimeDetailRow | `label="Fim almoço"; value={day.scheduled.lunchReturn?.slice(0,5) ?? '--:--'}` |
| C009 | 1067 / TimeDetailRow | `label="Saída"; value={day.scheduled.exit?.slice(0,5) ?? '--:--'}` |
| C010 | 1160 / TimeDetailRow | `label="Entrada"; value={formatTime(a.entry)}` |
| C011 | 1161 / TimeDetailRow | `label="Início almoço"; value={formatTime(a.lunchStart)}` |
| C012 | 1162 / TimeDetailRow | `label="Fim almoço"; value={formatTime(a.lunchReturn)}` |
| C013 | 1163 / TimeDetailRow | `label="Saída"; value={formatTime(a.exit)}` |
| C014 | 1165 / TimeDetailRow | `label="Total trabalhado"; value={formatMin(a.totalWorked)}` |
| C015 | 1166 / TimeDetailRow | `label="Saldo do dia"; value={formatMin(a.dailyBalance)}` |
| C016 | 1192 / OccurrenceBadge | `label={ˋAtraso: ${formatMin(a.lateMinutes)}ˋ}` |
| C017 | 1193 / OccurrenceBadge | `label={ˋSaída antecipada: ${formatMin(a.earlyLeaveMinutes ?? a.absenceMinutes)}ˋ}` |
| C018 | 1196 / OccurrenceBadge | `label={ˋAtraso: ${formatMin(a.lateMinutes)}ˋ}` |
| C019 | 1199 / OccurrenceBadge | `label={ˋSaída antecipada: ${formatMin(a.earlyLeaveMinutes ?? a.absenceMinutes)}ˋ}` |
| C020 | 1202 / OccurrenceBadge | `label={ˋFalta: ${formatMin(a.absenceMinutes)} ausênciaˋ}` |
| C021 | 1205 / OccurrenceBadge | `label={ˋHE 50%: ${formatMin(a.overtime50Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}ˋ}` |
| C022 | 1212 / OccurrenceBadge | `label={ˋHE 100%: ${formatMin(a.overtime100Minutes)} ${a.overtimeApprovalStatus === 'PENDING' ? '(aguard. aprov.)' : ''}ˋ}` |
| C023 | 1219 / OccurrenceBadge | `label={ˋNoturno: ${formatMin(a.nightShiftMinutes)}ˋ}` |
| C024 | 1222 / OccurrenceBadge | `label={resolved === 'ATESTADO' ? 'Atestado Integral' : 'Atestado (horas)'}` |
| C025 | 1225 / OccurrenceBadge | `label="Suspensão"` |
| C026 | 1228 / OccurrenceBadge | `label={ˋFeriado${day.holiday ? ': ' + day.holiday.name : ''}ˋ}` |
| C027 | 1231 / OccurrenceBadge | `label={getMeta(resolved).label}` |
| C028 | 1234 / OccurrenceBadge | `label={ˋLocal: ${a.locationAddress}ˋ}` |
| C029 | 1237 / OccurrenceBadge | `label="Sem biometria facial"` |
| C030 | 1241 / OccurrenceBadge | `label="Sem ocorrências"` |

Legendas/opções encontradas em configurações: `Trabalho`, `Folga`, `Folga DSR`, `Folga Banco`, `Feriado`, `Feriado Local`, `Atestado`, `Atestado (h)`, `Suspensão`, `Atraso`, `Saída Antec.`, `Falta`, `Revogado`, `Sem Escala`, `Compensação`, `Ajuste Escala`, `Minha Jornada`, `Escala de Equipe`, `Trocas`, `AJUSTE - PONTO INCOMPLETO`, `ATESTADO INTEGRAL`, `FERIADO`, `ABONO - ATESTADO DE HORAS`, `FOLGA`, `ABONO - FOLGA (BANCO)`, `ABONO - BANCO SAÍDA ANTECIPADA`, `ABONO - ATRASO`, `SUSPENSÃO`, `Entrada`, `Saída`, ``, `Ajuste de Horário`.

Chamadas reconhecidas: `api.employees.list`, `api.schedules.employeeCalendar`, `api.schedules.myCalendar`, `api.schedules.teamSchedule`, `api.scheduleSwaps.list`, `api.schedules.list`, `api.scheduleSwaps.cancel`, `api.schedules.createException`, `api.timeTrack.manual`, `api.schedules`, `api.employees.swapCandidates`, `api.scheduleSwaps.create`, `api.scheduleSwaps.review`, `api.schedules.assign`, `api.schedules.create`.

Funções existentes: `stringToHsl`, `getInitials`, `resolveDayType`, `getMeta`, `formatTime`, `formatMin`, `toMonthString`, `parseMonth`, `calcMonthlyTotals`, `EscalaPage`, `EmployeeCombobox`, `MinhaEscalaTab`, `SummaryCard`, `toIso`, `DayDetailPanel`, `ModalAjusteMensal`, `TimeDetailRow`, `OccurrenceBadge`, `EscalaEquipeTab`, `EmployeeTeamCard`, `TrocarEscalaTab`, `SwapCard`, `ModalSolicitarTroca`, `ModalAprovarTroca`, `ModalLancarEscala`, `Modal`, `EmptyState`.

### apps/web/app/[tenant]/dashboard/escalas/documentos/page.tsx

Origem: arquivo local.

Títulos: 68: Documentos e Relatórios; 142: Gerar Fechamento Coletivo.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 72 / button | Gerar Fechamento Coletivo | `onClick={() => setIsModalOpen(true)}` | `—` |
| A002 | 115 / button | "Baixar PDF" | `onClick={() => handleDownload(doc)}` | `—` |
| A003 | 143 / button | (ícone/controle sem legenda estática) | `onClick={() => setIsModalOpen(false)}` | `—` |
| A004 | 147 / form | Isso irá consolidar o espelho de ponto de todos os colaboradores ativos para o mês e ano selecionados. Mês {Array.from({ length: 12 }, (_, i) => i + 1).map(m => ( <option key={m} value={m}>{m.toString().padStart(2, '0')}</option> ))} Ano {[2024, 2025, 2026].map(y => ( <option key={y} value={y}>{y… | `onSubmit={handleGenerate}` | `—` |
| A005 | 184 / button | Cancelar | `onClick={() => setIsModalOpen(false)}` | `type="button"` |
| A006 | 185 / button | {generateMutation.loading ? 'Gerando...' : 'Confirmar'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={generateMutation.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 157 / select | `value={generateForm.month}` |
| F002 | 170 / select | `value={generateForm.year}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 61 / LoadingState | `label="Carregando documentos..."` |

Chamadas reconhecidas: `api.documents.list`, `api.documents.generate`, `api.documents.downloadIndividual`, `api.documents.downloadCollective`.

Funções existentes: `DocumentosPage`.

### apps/web/app/[tenant]/dashboard/escalas/equipe/page.tsx

Origem: arquivo local.

Títulos: 116: Equipe e Escalas; 133: Modelos de Escala; 149: {schedule.name}; 198: Atribuições da Equipe; 280: {editingSchedule ? 'Editar Escala' : 'Novo Modelo de Escala'}; 376: Atribuir Escala - {selectedEmployeeForAssign?.name}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 119 / button | Nova Escala | `onClick={() => { setEditingSchedule(null); setNewScheduleForm({ name: '', description: '', workDays: [], entryTime: '', exitTime: '' }); setIsNewScheduleModalOpen(true); }}` | `—` |
| A002 | 151 / button | "Editar" | `onClick={() => { setEditingSchedule(schedule); setNewScheduleForm({ name: schedule.name, description: schedule.description \|\| '', workDays: schedule.workDays \|\| [], entryTime: schedule.entryTime \|\| '', exitTime: schedule.exitTime \|\| '' }); setIsNewScheduleModalOpen(true); }}` | `—` |
| A003 | 168 / button | "Arquivar" | `onClick={() => archiveMutation.mutate(schedule.id)}` | `—` |
| A004 | 250 / button | Atribuir Escala | `onClick={() => { setSelectedEmployeeForAssign(assignment.employee); setIsAssignModalOpen(true); }}` | `—` |
| A005 | 281 / button | (ícone/controle sem legenda estática) | `onClick={() => { setIsNewScheduleModalOpen(false); setEditingSchedule(null); }}` | `—` |
| A006 | 285 / form | Nome do Modelo Descrição Dias de Trabalho {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => ( <button key={day} type="button" onClick={() => toggleWorkDay(day)} className={`px-3 py-1 text-sm rounded-full border transition-colors ${ newScheduleForm.workDays.includes(day) ? 'bg-brand te… | `onSubmit={handleCreateSchedule}` | `—` |
| A007 | 311 / button | {day} | `onClick={() => toggleWorkDay(day)}` | `type="button"` |
| A008 | 350 / button | Cancelar | `onClick={() => { setIsNewScheduleModalOpen(false); setEditingSchedule(null); }}` | `type="button"` |
| A009 | 351 / button | {createScheduleMutation.loading ? 'Salvando...' : 'Salvar Modelo'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={createScheduleMutation.loading}` |
| A010 | 377 / button | (ícone/controle sem legenda estática) | `onClick={() => setIsAssignModalOpen(false)}` | `—` |
| A011 | 389 / form | Modelo de Escala Selecione uma escala... {schedules.map((s: any) => { if (!s) return null; return ( <option key={s.id} value={s.id}>{s.name} ({Array.isArray(s.workDays) ? s.workDays.join(', ') : 'N/A'})</option> )})} Início da Vigência Fim (Opcional) Cancelar {assignMutation.loading ? 'Processand… | `onSubmit={handleAssign}` | `—` |
| A012 | 430 / button | Cancelar | `onClick={() => setIsAssignModalOpen(false)}` | `type="button"` |
| A013 | 431 / button | {assignMutation.loading ? 'Processando...' : 'Confirmar Atribuição'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={assignMutation.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 200 / input | `type="month"; value={currentMonth}` |
| F002 | 288 / input | `type="text"; placeholder="Ex: Comercial 5x2"; value={newScheduleForm.name}` |
| F003 | 299 / input | `type="text"; placeholder="Breve descrição da jornada"; value={newScheduleForm.description}` |
| F004 | 329 / input | `type="time"; value={newScheduleForm.entryTime}` |
| F005 | 339 / input | `type="time"; value={newScheduleForm.exitTime}` |
| F006 | 392 / select | `value={assignForm.scheduleId}` |
| F007 | 410 / input | `type="date"; value={assignForm.startDate}` |
| F008 | 420 / input | `type="date"; value={assignForm.endDate}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 85 / LoadingState | `label="Carregando dados da equipe..."` |

Legendas/opções encontradas em configurações: ``.

Chamadas reconhecidas: `api.schedules.list`, `api.schedules.teamSchedule`, `api.employees.list`, `api.schedules.archive`, `api.schedules.update`, `api.schedules.create`, `api.schedules.assign`.

Funções existentes: `EquipeEscalasPage`.

### apps/web/app/[tenant]/dashboard/escalas/fechamento/page.tsx

Origem: arquivo local.

Títulos: 31: Ajuste Manual; 106: Acesso Restrito; 115: Fechamento Mensal.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 32 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 88 / button | CANCELAR | `onClick={onClose}` | `—` |
| A003 | 89 / button | SALVAR AJUSTE | `onClick={() => onSave(field, value, reason)}` | `disabled={!reason.trim()}` |
| A004 | 239 / button | {generateMut.loading ? 'CALCULANDO...' : 'ADICIONAR / RECALCULAR'} | `onClick={generate}` | `disabled={generateMut.loading}` |
| A005 | 329 / button | {isDownloading === item.id ? 'Gerando...' : 'Folha PDF'} | `onClick={(e) => { e.stopPropagation(); downloadPdf(item); }}` | `disabled={!!isDownloading}` |
| A006 | 334 / button | Ajuste Manual | `onClick={()=>setAdjustItem(item)}` | `—` |
| A007 | 339 / button | Enviar p/ Revisão | `onClick={()=>reviewMut.mutate(item.id)}` | `—` |
| A008 | 340 / button | Aprovar Mês | `onClick={()=>approveMut.mutate(item.id)}` | `—` |
| A009 | 341 / button | Finalizar Folha | `onClick={()=>closeMut.mutate(item.id)}` | `—` |
| A010 | 344 / button | Reabrir Mês | `onClick={()=>{const reason=prompt('Motivo da reabertura:');if(reason?.trim())reopenMut.mutate({id:item.id,reason});}}` | `—` |
| A011 | 350 / button | Excluir | `onClick={()=>window.confirm('Excluir definitivamente este fechamento?')&&deleteMut.mutate(item.id)}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 51 / select | `value={field}` |
| F002 | 67 / input | `type="number"; placeholder="0.00"; value={value}` |
| F003 | 79 / textarea | `placeholder="Descreva o motivo deste ajuste..."; value={reason}` |
| F004 | 234 / input | `type="date"; value={periodStart}` |
| F005 | 237 / input | `type="date"; value={periodEnd}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 214 / LoadingState | `label="Carregando fechamentos..."` |

Legendas/opções encontradas em configurações: `Salário Base (R$)`, `Hora Extra 50% (Horas)`, `Hora Extra 100% (Horas)`, `Adicional Noturno (Horas)`, `Desconto de Faltas (Minutos)`, `Atrasos (Minutos)`, `Saídas Antecipadas (Minutos)`.

Chamadas reconhecidas: `api.companies.me`, `api.timeClosing.list`, `api.timeClosing.generate`, `api.timeClosing.submitReview`, `api.timeClosing.approve`, `api.timeClosing.close`, `api.timeClosing.reopen`, `api.timeClosing.delete`, `api.timeClosing.adjust`, `api.documents.downloadIndividual`.

Funções existentes: `AdjustmentModal`, `FechamentoPage`, `ClosingTab`.

### apps/web/app/[tenant]/dashboard/escalas/layout.tsx

Origem: arquivo local.

Títulos: 28: Escalas.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 16 / LoadingState | `label="Carregando módulo de escalas..."` |

Funções existentes: `EscalasLayout`.

### apps/web/app/[tenant]/dashboard/escalas/ocorrencias/page.tsx

Origem: arquivo local.

Títulos: 110: Ocorrências; 236: Lançar Nova Ocorrência.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 113 / button | Nova Ocorrência | `onClick={() => setIsModalOpen(true)}` | `—` |
| A002 | 138 / button | Todas | `onClick={() => setFilter('ALL')}` | `—` |
| A003 | 144 / button | Pendentes | `onClick={() => setFilter('PENDING')}` | `—` |
| A004 | 150 / button | Aprovadas | `onClick={() => setFilter('APPROVED')}` | `—` |
| A005 | 156 / button | Recusadas | `onClick={() => setFilter('REJECTED')}` | `—` |
| A006 | 203 / button | Aprovar | `onClick={() => approveMutation.mutate(occ.id)}` | `disabled={approveMutation.loading}` |
| A007 | 210 / button | Recusar | `onClick={() => rejectMutation.mutate(occ.id)}` | `disabled={rejectMutation.loading}` |
| A008 | 237 / button | (ícone/controle sem legenda estática) | `onClick={() => setIsModalOpen(false)}` | `—` |
| A009 | 241 / form | {isAdminOrRhOrGestor && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label> <select required className="form-control w-full" value={form.employeeId} onChange={e => setForm(prev => ({ ...prev, employeeId: e.target.value }))} > <option value="">Selecione...</… | `onSubmit={handleSubmit}` | `—` |
| A010 | 327 / button | Cancelar | `onClick={() => setIsModalOpen(false)}` | `type="button"` |
| A011 | 328 / button | {createMutation.loading ? 'Enviando...' : 'Registrar Ocorrência'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={createMutation.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 245 / select | `value={form.employeeId}` |
| F002 | 262 / input | `type="date"; value={form.date}` |
| F003 | 272 / select | `value={form.type}` |
| F004 | 287 / input | `type="checkbox"; id="isPartial"` |
| F005 | 302 / input | `type="number"; placeholder="Ex: 180 para 3 horas"; value={form.durationMinutes}` |
| F006 | 316 / textarea | `placeholder="Descreva o motivo da ocorrência ou atestado..."; value={form.reason}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 86 / LoadingState | `label="Carregando ocorrências..."` |

Chamadas reconhecidas: `api.employees.list`, `api.timeOccurrences.list`, `api.timeOccurrences.listByEmployee`, `api.timeOccurrences.approve`, `api.timeOccurrences.reject`, `api.timeOccurrences.create`.

Funções existentes: `OcorrenciasPage`.

### apps/web/app/[tenant]/dashboard/escalas/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 159: Progresso do fechamento; 208: Lista de atenÃƒÂ§ÃƒÂ£o.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 131 / button | {ctaText} | `onClick={() => router.push(ctaLink)}` | `—` |
| A002 | 211 / Link | Ver tudo Ã¢â€ â€™ | `href={ˋ/${tenant}/dashboard/escalas/ocorrenciasˋ}` | `—` |
| A003 | 249 / Link | Resolver | `href={item.link}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 116 / LoadingState | `label="Carregando visÃƒÂ£o geral..."` |

Legendas/opções encontradas em configurações: `ApuraÃƒÂ§ÃƒÂ£o`, `Rascunho`, `Tratamento`, `RevisÃƒÂ£o`, `AprovaÃƒÂ§ÃƒÂ£o`, `Fechado`, `OcorrÃƒÂªncia pendente`, `Troca de escala`, `Aguardando aprovaÃƒÂ§ÃƒÂ£o do gestor`, `Ponto pendente`, `Requer aprovaÃƒÂ§ÃƒÂ£o`.

Chamadas reconhecidas: `api.employees.list`, `api.timeTrack.list`, `api.timeOccurrences.list`, `api.scheduleSwaps.list`, `api.timeClosing.list`, `api.timeTrack.listPending`.

Funções existentes: `EscalasOverviewPage`, `KpiTile`.

### apps/web/app/[tenant]/dashboard/escalas/ponto/page.tsx

Origem: arquivo local.

Títulos: 344: {isDetailView && isFunc ? 'Meu Ponto' : 'Folha de Ponto'}; 404: Colaboradores; 658: {track?.id ? 'Editar Ponto' : 'Lançar Ponto Manual'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 350 / button | {isDownloading ? 'Gerando...' : 'Imprimir Relatório'} | `onClick={() => handleDownloadPdf()}` | `disabled={isDownloading}` |
| A002 | 353 / button | Ajuste Manual | `onClick={() => { setEditingTrack(null); setIsManualModalOpen(true); }}` | `—` |
| A003 | 358 / Link | Bater Ponto | `href={ˋ/${tenant}/dashboard/time-track/clock-inˋ}` | `—` |
| A004 | 366 / button | (ícone/controle sem legenda estática) | `onClick={handlePrevMonth}` | `—` |
| A005 | 372 / button | (ícone/controle sem legenda estática) | `onClick={handleNextMonth}` | `—` |
| A006 | 446 / button | VER FOLHA | `onClick={(e) => { e.stopPropagation(); setSelectedEmployeeId(emp.id); }}` | `—` |
| A007 | 448 / button | PDF | `onClick={(e) => { e.stopPropagation(); handleDownloadPdf(emp.id); }}` | `disabled={isDownloading}` |
| A008 | 581 / button | (ícone/controle sem legenda estática) | `onClick={() => onEdit(t \|\| { employeeId: employee.id, date: day.key, entry: null, lunchStart: null, lunchReturn: null, exit: null } as any)}` | `—` |
| A009 | 586 / button | (ícone/controle sem legenda estática) | `onClick={() => onApprove(t.id, true)}` | `—` |
| A010 | 591 / button | (ícone/controle sem legenda estática) | `onClick={() => onDelete(t)}` | `—` |
| A011 | 659 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A012 | 716 / button | Cancelar | `onClick={onClose}` | `—` |
| A013 | 717 / button | {save.loading ? 'Salvando...' : 'Salvar Registro'} | `onClick={()=>ok && save.mutate().catch(()=>{})}` | `disabled={!ok \|\| save.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 380 / select | `value={selectedEmployeeId}` |
| F002 | 667 / select | `disabled={!!track?.id}; value={empId}` |
| F003 | 676 / input | `type="date"; disabled={!!track?.id}; value={date}` |
| F004 | 681 / select | `value={reason}` |
| F005 | 692 / input | `type="time"; value={entry}` |
| F006 | 696 / input | `type="time"; value={exit}` |
| F007 | 700 / input | `type="time"; value={lunchS}` |
| F008 | 704 / input | `type="time"; value={lunchR}` |
| F009 | 711 / input | `placeholder="Motivo do ajuste..."; value={detail}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 336 / LoadingState | `label="Carregando folha de ponto..."` |

Legendas/opções encontradas em configurações: `AJUSTE - MARCAÇÃO INCOMPLETA`, `ATESTADO INTEGRAL`, `FERIADO`, `ABONO - ATESTADO DE HORAS`, `FOLGA`, `ABONO - FOLGA (BANCO)`, `ABONO - BANCO SAÍDA ANTECIPADA`, `ABONO - ATRASO`, `SUSPENSÃO`.

Chamadas reconhecidas: `api.documents.downloadCollective`, `api.employees.list`, `api.timeTrack.list`, `api.schedules.teamSchedule`, `api.companies.me`, `api.companies.getHolidays`, `api.timeTrack.listPending`, `api.timeTrack.approve`, `api.timeTrack.delete`, `api.timeTrack.update`, `api.timeTrack.manual`.

Funções existentes: `getLocalToday`, `toDateKey`, `fmtTime`, `fmtLunch`, `fmtWorked`, `fmtBalance`, `fmtDateFull`, `isRestDay`, `isCycle`, `isAntesAdmissao`, `isDepoisDemissao`, `buildGrid`, `dayStatus`, `isFalta`, `getEffectiveStatsFromGrid`, `StatusBadge`, `PontoPage`, `MonthGridView`, `TimeTrackModal`, `toIso`.

### apps/web/app/[tenant]/dashboard/escalas/regras/page.tsx

Origem: arquivo local.

Títulos: 143: Regras e Configurações; 184: {rule.name}; 223: Configurações Gerais de Folha; 227: Horas Extras; 243: Banco de Horas & Ciclo; 286: {holiday.name}; 324: {editingRule ? 'Editar Regra' : 'Nova Regra de Jornada'}; 398: {editingHoliday ? 'Editar Feriado' : 'Cadastrar Feriado'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 147 / button | Novo | `onClick={() => { if (activeTab === 'JORNADAS') { setEditingRule(null); setRuleForm({ name: '', weeklyHours: 44, toleranceMinutes: 10, intervalMinutes: 60 }); setIsRuleModalOpen(true); } else { setEditingHoliday(null); setHolidayForm({ name: '', date: '', type: 'NACIONAL', scope: 'Geral' }); setIsHolidayModalOpen(true); } }}` | `—` |
| A002 | 167 / button | Jornadas | `onClick={() => setActiveTab('JORNADAS')}` | `—` |
| A003 | 170 / button | Globais (Extras / Ciclo) | `onClick={() => setActiveTab('EXTRAS')}` | `—` |
| A004 | 173 / button | Feriados | `onClick={() => setActiveTab('FERIADOS')}` | `—` |
| A005 | 193 / button | (ícone/controle sem legenda estática) | `onClick={() => { setEditingRule(rule); setRuleForm({ name: rule.name, weeklyHours: rule.weeklyHours \|\| 44, toleranceMinutes: rule.toleranceMinutes \|\| 10, intervalMinutes: rule.intervalMinutes \|\| 60 }); setIsRuleModalOpen(true); }}` | `—` |
| A006 | 206 / button | (ícone/controle sem legenda estática) | `onClick={() => archiveMutation.mutate(rule.id)}` | `—` |
| A007 | 210 / button | (ícone/controle sem legenda estática) | `onClick={() => activateMutation.mutate(rule.id)}` | `—` |
| A008 | 222 / form | Configurações Gerais de Folha Horas Extras Hora Extra Dia Útil (%) Hora Extra DSR/Feriado (%) Adicional Noturno (%) Banco de Horas & Ciclo Habilitar Banco de Horas Compensação de horas permitida Dia Inicial do Fechamento Dia Final Ex: do dia 21 ao dia 20 do mês seguinte. {updateCompanyMutation.lo… | `onSubmit={handleSaveExtras}` | `—` |
| A009 | 269 / button | {updateCompanyMutation.loading ? 'Salvando...' : 'Salvar Configurações'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={updateCompanyMutation.loading}` |
| A010 | 292 / button | (ícone/controle sem legenda estática) | `onClick={() => { setEditingHoliday(holiday); setHolidayForm({ name: holiday.name, date: holiday.date ? holiday.date.split('T')[0] : '', type: holiday.type \|\| 'NACIONAL', scope: holiday.scope \|\| 'Geral' }); setIsHolidayModalOpen(true); }}` | `—` |
| A011 | 304 / button | (ícone/controle sem legenda estática) | `onClick={() => handleDeleteHoliday(holiday.id)}` | `—` |
| A012 | 325 / button | (ícone/controle sem legenda estática) | `onClick={() => { setIsRuleModalOpen(false); setEditingRule(null); }}` | `—` |
| A013 | 329 / form | Nome da Jornada Carga Horária Semanal Tolerância (minutos) Intervalo Padrão (minutos) Tempo de almoço deduzido da jornada diária. Cancelar {createRuleMutation.loading ? 'Salvando...' : 'Salvar Regra'} | `onSubmit={handleCreateRule}` | `—` |
| A014 | 376 / button | Cancelar | `onClick={() => { setIsRuleModalOpen(false); setEditingRule(null); }}` | `type="button"` |
| A015 | 377 / button | {createRuleMutation.loading ? 'Salvando...' : 'Salvar Regra'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={createRuleMutation.loading}` |
| A016 | 399 / button | (ícone/controle sem legenda estática) | `onClick={() => { setIsHolidayModalOpen(false); setEditingHoliday(null); }}` | `—` |
| A017 | 403 / form | Nome do Feriado Data Tipo Nacional Estadual Municipal Escopo Cancelar {updateHolidaysMutation.loading ? 'Salvando...' : 'Salvar Feriado'} | `onSubmit={handleAddHoliday}` | `—` |
| A018 | 451 / button | Cancelar | `onClick={() => { setIsHolidayModalOpen(false); setEditingHoliday(null); }}` | `type="button"` |
| A019 | 452 / button | {updateHolidaysMutation.loading ? 'Salvando...' : 'Salvar Feriado'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={updateHolidaysMutation.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 230 / input | `type="number"; value={extrasForm.overtimeMultiplier}` |
| F002 | 234 / input | `type="number"; value={extrasForm.holidayMultiplier}` |
| F003 | 238 / input | `type="number"; value={extrasForm.nightShiftMultiplier}` |
| F004 | 246 / input | `type="checkbox"` |
| F005 | 257 / input | `type="number"; value={extrasForm.closingCycleStartDay}` |
| F006 | 261 / input | `type="number"; value={extrasForm.closingCycleEndDay}` |
| F007 | 332 / input | `type="text"; placeholder="Ex: Comercial 44h"; value={ruleForm.name}` |
| F008 | 344 / input | `type="number"; value={ruleForm.weeklyHours}` |
| F009 | 354 / input | `type="number"; value={ruleForm.toleranceMinutes}` |
| F010 | 364 / input | `type="number"; value={ruleForm.intervalMinutes}` |
| F011 | 406 / input | `type="text"; placeholder="Ex: Consciência Negra"; value={holidayForm.name}` |
| F012 | 417 / input | `type="date"; value={holidayForm.date}` |
| F013 | 428 / select | `value={holidayForm.type}` |
| F014 | 440 / input | `type="text"; placeholder="Ex: Geral ou TI"; value={holidayForm.scope}` |

Legendas/opções encontradas em configurações: ``.

Chamadas reconhecidas: `api.workScheduleRules.list`, `api.companies.getHolidays`, `api.companies.me`, `api.workScheduleRules.archive`, `api.workScheduleRules.activate`, `api.workScheduleRules.update`, `api.workScheduleRules.create`, `api.companies.update`, `api.companies.updateHolidays`.

Funções existentes: `RegrasPage`.

### apps/web/app/[tenant]/dashboard/escalas/trocas/page.tsx

Origem: arquivo local.

Títulos: 50: Trocas e Exceções; 77: Nova Solicitação de Troca; 131: {swap.requesterName}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 54 / button | Solicitar Troca | `onClick={() => setShowRequestForm(!showRequestForm)}` | `—` |
| A002 | 63 / button | {status === 'ALL' ? 'Todas' : status === 'PENDING' ? 'Pendentes' : status === 'APPROVED' ? 'Aprovadas' : status === 'REJECTED' ? 'Recusadas' : 'Canceladas'} | `onClick={() => setFilter(status)}` | `—` |
| A003 | 108 / button | Cancelar | `onClick={() => setShowRequestForm(false)}` | `type="button"` |
| A004 | 109 / button | {createMutation.loading ? 'Enviando...' : 'Enviar Solicitação'} | `onClick={() => createMutation.mutate(formData)}` | `disabled={createMutation.loading}` |
| A005 | 151 / button | (ícone/controle sem legenda estática) | `onClick={() => reviewMutation.mutate({ id: swap.id, action: 'APPROVED', reason: reviewReason })}` | `disabled={reviewMutation.loading}` |
| A006 | 158 / button | (ícone/controle sem legenda estática) | `onClick={() => reviewMutation.mutate({ id: swap.id, action: 'REJECTED', reason: reviewReason })}` | `disabled={reviewMutation.loading}` |
| A007 | 168 / button | {cancelMutation.loading ? 'Cancelando...' : 'Cancelar'} | `onClick={() => cancelMutation.mutate(swap.id)}` | `disabled={cancelMutation.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 81 / input | `type="date"; value={formData.originalDate}` |
| F002 | 90 / input | `type="date"; value={formData.targetDate}` |
| F003 | 99 / textarea | `value={formData.justification}` |
| F004 | 144 / input | `type="text"; placeholder="Motivo (opcional)"; value={reviewReason}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 41 / LoadingState | `label="Carregando trocas de escala..."` |

Chamadas reconhecidas: `api.scheduleSwaps.list`, `api.scheduleSwaps.create`, `api.scheduleSwaps.review`, `api.scheduleSwaps.cancel`.

Funções existentes: `TrocasPage`.

### apps/web/app/[tenant]/dashboard/finance/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `FinancePage`.

### apps/web/app/[tenant]/dashboard/jobs/[jobId]/page.tsx

Origem: arquivo local.

Títulos: 107: Acesso restrito ao funil; 238: {job.title}; 318: {column.label}; 376: Iniciar admissão?; 438: {candidate.name}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 220 / Link | Voltar para vagas | `href={ˋ/${tenant}/dashboard/jobsˋ}` | `—` |
| A002 | 233 / Link | "Voltar para vagas" | `href={ˋ/${tenant}/dashboard/jobsˋ}` | `—` |
| A003 | 246 / button | Copiar link público | `onClick={copyLink}` | `type="button"` |
| A004 | 249 / button | Atualizar | `onClick={refresh}` | `type="button"` |
| A005 | 278 / button | {col.label} | `onClick={() => handleBulkStatusChange(col.status)}` | `disabled={bulkUpdating}` |
| A006 | 288 / button | Cancelar | `onClick={() => setSelectedIds(new Set())}` | `—` |
| A007 | 379 / button | Cancelar | `onClick={() => setCandidateToHire(null)}` | `type="button"; disabled={Boolean(hiringId)}` |
| A008 | 380 / button | Confirmar admissão | `onClick={() => { const candidate = candidateToHire; setCandidateToHire(null); void hire(candidate); }}` | `type="button"; disabled={Boolean(hiringId)}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 420 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 215 / LoadingState | `label="Carregando funil da vaga..."` |

Legendas/opções encontradas em configurações: `Inscritos`, `Novas candidaturas`, `Em análise`, `Triagem do RH`, `Entrevista`, `Etapa de conversa`, `Proposta`, `Oferta enviada`, `Contratados`, `Prontos para admissão`, `Reprovados`, `Fora do processo`.

Funções existentes: `publicJobUrl`, `JobPipelinePage`, `CandidateCard`.

### apps/web/app/[tenant]/dashboard/jobs/candidate-drawer.tsx

Origem: arquivo local.

Títulos: 98: {candidate.name}; 146: Contato; 163: Candidatura; 182: Triagem inteligente; 232: Currículo; 258: Apresentação; 268: Ponte para admissão.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 71 / button | "Fechar detalhes" | `onClick={onClose}` | `type="button"` |
| A002 | 104 / button | "Fechar" | `onClick={onClose}` | `type="button"` |
| A003 | 239 / button | {downloadingResume ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {downloadingResume ? 'Baixando...' : 'Baixar currículo'} | `onClick={onDownloadResume}` | `type="button"; disabled={downloadingResume}` |
| A004 | 279 / button | {hiring ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} {hiring ? 'Criando colaborador em onboarding...' : 'Contratar e iniciar admissão'} | `onClick={onHire}` | `type="button"; disabled={hiring \|\| updating}` |
| A005 | 314 / a | {value} | `href={href}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 122 / select | `disabled={updating \|\| hiring}; value={currentStatus}` |

Legendas/opções encontradas em configurações: `Inscrito`, `Em análise`, `Entrevista`, `Proposta enviada`, `Reprovado`.

Funções existentes: `dateTime`, `CandidateDrawer`, `ContactLine`.

### apps/web/app/[tenant]/dashboard/jobs/job-form-modal.tsx

Origem: arquivo local.

Títulos: 103: {job ? 'Editar vaga' : 'Criar nova vaga'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 111 / button | "Fechar" | `onClick={onClose}` | `type="button"; disabled={saving}` |
| A002 | 122 / form | Título da vaga * Localização Tipo de contratação CLT Pessoa jurídica Estágio Temporário Jovem aprendiz Faixa salarial Publicação Aberta e publicada Rascunho Fechada Descrição da vaga * {form.description.length} /6000 Benefícios Separe os benefícios por vírgula. {error && ( <p className="rounded-v… | `onSubmit={submit}` | `—` |
| A003 | 239 / button | Cancelar | `onClick={onClose}` | `type="button"; disabled={saving}` |
| A004 | 242 / button | {saving ? <Loader2 size={14} className="animate-spin" /> : null} {saving ? 'Salvando...' : job ? 'Salvar alterações' : 'Criar vaga'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 128 / input | `placeholder="Ex.: Analista de Recursos Humanos"; value={form.title}` |
| F002 | 143 / input | `placeholder="São Paulo, SP ou Remoto"; value={form.location}` |
| F003 | 156 / select | `value={form.employmentType}` |
| F004 | 173 / input | `placeholder="Ex.: R$ 3.500 a R$ 4.500"; value={form.salaryRange}` |
| F005 | 186 / select | `value={form.status}` |
| F006 | 203 / textarea | `placeholder="Descreva responsabilidades, requisitos e diferenciais..."; value={form.description}` |
| F007 | 220 / input | `placeholder="Vale-refeição, Plano de saúde, Auxílio home office"; value={benefitsText}` |

Legendas/opções encontradas em configurações: ``.

Funções existentes: `JobFormModal`.

### apps/web/app/[tenant]/dashboard/jobs/page.tsx

Origem: arquivo local.

Títulos: 118: Acesso restrito ao recrutamento; 176: Vagas & talentos; 209: Suas oportunidades; 227: Excluir esta vaga?.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 179 / button | Nova vaga | `onClick={openCreate}` | `type="button"` |
| A002 | 194 / Link | Abrir funil | `href={ˋ/${tenant}/dashboard/jobs/${attentionJob.id}ˋ}` | `—` |
| A003 | 194 / button | Criar oportunidade | `onClick={openCreate}` | `type="button"` |
| A004 | 201 / button | Limpar filtros | `onClick={() => { setSearch(''); setStatus(''); }}` | `type="button"` |
| A005 | 207 / button | {rows.length ? <><X size={14} /> Limpar filtros</> : <><Plus size={14} /> Criar primeira vaga</>} | `onClick={rows.length ? () => { setSearch(''); setStatus(''); } : openCreate}` | `type="button"` |
| A006 | 213 / Link | {job.title} | `href={ˋ/${tenant}/dashboard/jobs/${job.id}ˋ}` | `—` |
| A007 | 215 / Link | {getApplicationCount(job)} | `href={ˋ/${tenant}/dashboard/jobs/${job.id}ˋ}` | `—` |
| A008 | 218 / button | {`Ações da vaga ${job.title}`} | `onClick={() => setOpenMenuId((current) => current === job.id ? null : job.id)}` | `type="button"; disabled={busyId === job.id}` |
| A009 | 218 / Link | Abrir funil | `onClick={() => setOpenMenuId(null)}; href={ˋ/${tenant}/dashboard/jobs/${job.id}ˋ}` | `—` |
| A010 | 218 / button | Editar vaga | `onClick={() => openEdit(job)}` | `type="button"` |
| A011 | 218 / button | Copiar link público | `onClick={() => copyPublicLink(job)}` | `type="button"` |
| A012 | 218 / a | Visualizar publicação | `onClick={() => setOpenMenuId(null)}; href={publicUrl}` | `—` |
| A013 | 218 / button | {job.status === 'OPEN' ? 'Fechar vaga' : 'Publicar vaga'} | `onClick={() => toggleJob(job)}` | `type="button"` |
| A014 | 218 / button | Excluir vaga | `onClick={() => { setJobToDelete(job); setOpenMenuId(null); }}` | `type="button"` |
| A015 | 227 / button | Cancelar | `onClick={() => setJobToDelete(null)}` | `type="button"; disabled={busyId === jobToDelete.id}` |
| A016 | 227 / button | {busyId === jobToDelete.id ? 'Excluindo...' : 'Excluir vaga'} | `onClick={removeJob}` | `type="button"; disabled={busyId === jobToDelete.id}` |
| A017 | 240 / button | {label} {count} | `onClick={onClick}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 200 / input | `placeholder="Buscar por cargo, local, contrato ou benefício..."; value={search}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 183 / LoadingState | `label="Carregando vagas..."` |
| C002 | 186 / MetricCard | `label="Portfólio total"; value={totals.total}` |
| C003 | 187 / MetricCard | `label="Publicadas agora"; value={totals.open}` |
| C004 | 188 / MetricCard | `label="Candidaturas"; value={totals.candidates}` |
| C005 | 189 / MetricCard | `label="Rascunhos"; value={totals.drafts}` |
| C006 | 203 / StatusTab | `label="Todas"` |
| C007 | 203 / StatusTab | `label="Abertas"` |
| C008 | 203 / StatusTab | `label="Rascunhos"` |
| C009 | 203 / StatusTab | `label="Fechadas"` |

Funções existentes: `date`, `fullDate`, `publicJobUrl`, `statusTone`, `statusDescription`, `JobsPage`, `MetricCard`, `StatusTab`.

### apps/web/app/[tenant]/dashboard/layout.tsx

Origem: Git HEAD (alterações locais preservadas).

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `DashboardLayout`.

### apps/web/app/[tenant]/dashboard/management/agenda/page.tsx

Origem: arquivo local.

Títulos: 252: {monthName}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 223 / button | + NOVO COMPROMISSO | `onClick={() => onOpenForm(undefined)}` | `disabled={saving}` |
| A002 | 228 / button | CALENDÁRIO | `onClick={() => setViewMode('calendar')}` | `—` |
| A003 | 231 / button | KANBAN | `onClick={() => setViewMode('kanban')}` | `—` |
| A004 | 254 / button | &lt; | `onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}` | `—` |
| A005 | 257 / button | &gt; | `onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}` | `—` |
| A006 | 317 / button | Editar | `onClick={() => onOpenForm(ev)}` | `disabled={saving}` |
| A007 | 319 / button | Concluir | `onClick={() => onSave({ status: 'CONCLUIDO' }, ev.id)}` | `disabled={saving}` |
| A008 | 321 / button | (ícone/controle sem legenda estática) | `onClick={() => onDelete(ev.id)}` | `disabled={saving}` |
| A009 | 426 / button | Cancelar | `onClick={onClose}` | `—` |
| A010 | 427 / button | {saving ? 'Salvando...' : 'Salvar Compromisso'} | `onClick={save}` | `disabled={!ok \|\| saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 238 / select | `value={filterStatus}` |
| F002 | 241 / select | `value={filterType}` |
| F003 | 244 / select | `value={filterEmp}` |
| F004 | 385 / input | `value={title}` |
| F005 | 389 / select | `value={eventType}` |
| F006 | 395 / select | `value={status}` |
| F007 | 401 / select | `value={priority}` |
| F008 | 407 / input | `type="datetime-local"; value={start}` |
| F009 | 411 / input | `type="datetime-local"; value={end}` |
| F010 | 415 / select | `value={employeeId}` |
| F011 | 422 / textarea | `value={desc}` |

Legendas/opções encontradas em configurações: `Reunião`, `Ligação`, `Tarefa interna`, `Prazo administrativo`, `Retorno ao colaborador`, `Documento pendente`, `Outros`, `Pendente`, `Em andamento`, `Concluído`, `Cancelado`, `Baixa`, `Média`, `Alta`, `Urgente`.

Chamadas reconhecidas: `api.management.events.kanban`, `api.employees.list`, `api.management.events.update`, `api.management.events.create`, `api.management.events.delete`.

Funções existentes: `fmtDateTime`, `getStatusBadge`, `AgendaPage`, `AgendaKanban`, `EventModal`.

### apps/web/app/[tenant]/dashboard/management/aso/page.tsx

Origem: arquivo local.

Títulos: 153: CONTROLE DE ASO; 196: Nenhum ASO registrado; 278: {record ? 'Editar ASO' : 'Agendar ASO'}; 287: 1 Identificação; 334: 2 Clínica.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 157 / button | + NOVO ASO | `onClick={() => onOpenForm(undefined)}` | `disabled={saving}` |
| A002 | 214 / button | {pdfId === r.id ? 'Gerando...' : 'PDF'} | `onClick={() => handleGenerateAsoPdf(r)}` | `disabled={pdfId === r.id}` |
| A003 | 215 / button | Editar | `onClick={() => onOpenForm(r)}` | `disabled={saving}` |
| A004 | 216 / button | (ícone/controle sem legenda estática) | `onClick={() => onSave({ status: 'CANCELLED' }, r.id)}` | `disabled={saving}` |
| A005 | 217 / button | X | `onClick={() => { if (window.confirm('Excluir?')) onDelete(r.id); }}` | `disabled={saving}` |
| A006 | 282 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A007 | 360 / button | Cancelar | `onClick={onClose}` | `—` |
| A008 | 361 / button | {saving ? 'Salvando...' : 'Salvar ASO'} | `onClick={save}` | `disabled={!ok \|\| saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 164 / select | `value={filterType}` |
| F002 | 167 / select | `value={filterStatus}` |
| F003 | 170 / select | `value={filterEmp}` |
| F004 | 292 / select | `value={employeeId}` |
| F005 | 300 / select | `value={asoType}` |
| F006 | 306 / select | `value={status}` |
| F007 | 314 / select | `value={result}` |
| F008 | 324 / input | `type="datetime-local"; value={examDate}` |
| F009 | 328 / input | `type="date"; value={dueDate}` |
| F010 | 339 / input | `placeholder="Clínica..."; value={clinicName}` |
| F011 | 343 / input | `placeholder="Endereço..."; value={clinicAddress}` |
| F012 | 347 / input | `placeholder="Dr. ..."; value={doctorName}` |
| F013 | 355 / textarea | `value={observation}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 71 / LoadingState | `label="Carregando ASOs..."` |

Legendas/opções encontradas em configurações: `Admissional`, `Demissional`, `Periódico / Rotina`, `Retorno ao trabalho`, `Mudança de função`, `Complementar`, `Pendente`, `Agendado`, `Concluído`, `Cancelado`, `Vencido`, `Aguardando doc`, `Exame extra`, `Sem data definida`, `Próximo do vencimento`, `Válido`.

Chamadas reconhecidas: `api.management.aso.list`, `api.employees.list`, `api.management.aso.update`, `api.management.aso.create`, `api.management.aso.delete`.

Funções existentes: `fmtDate`, `getAsoAlert`, `AsoPage`, `AsoTab`, `AsoModal`.

### apps/web/app/[tenant]/dashboard/management/layout.tsx

Origem: arquivo local.

Títulos: 32: Gestão de pessoas e jornada.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 42 / Link | {tab.name} | `href={tab.href}` | `—` |

Legendas/opções encontradas em configurações: `Agenda`, `ASO`, `Notificações`, `Onboarding`, `Jornada e fechamento`.

Funções existentes: `ManagementLayout`.

### apps/web/app/[tenant]/dashboard/management/notifications/page.tsx

Origem: arquivo local.

Títulos: 77: NOTIFICAÇÕES / COMUNICADOS; 180: Enviar Notificação.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 81 / button | {showForm ? 'FECHAR' : '+ NOVA NOTIFICAÇÃO'} | `onClick={() => setShowForm(!showForm)}` | `—` |
| A002 | 130 / button | {pdfId === n.id ? 'Gerando...' : 'Baixar PDF Legal'} | `onClick={() => handleGenerateTermoPdf(n.id)}` | `disabled={pdfId === n.id}` |
| A003 | 179 / form | Enviar Notificação Título * Tipo * Comunicado Geral / Simples Promoção / Mérito Advertência Suspensão Destinatário Todos os funcionários (Mural) {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)} Conteúdo * Exigir ciente (O funcionário precisa clicar em … | `onSubmit={save}` | `—` |
| A004 | 219 / button | {createMut.loading ? 'Enviando...' : 'Enviar Notificação'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={createMut.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 90 / select | `value={filterType}` |
| F002 | 98 / select | `value={filterStatus}` |
| F003 | 184 / input | `value={title}` |
| F004 | 188 / select | `value={type}` |
| F005 | 197 / select | `value={empId}` |
| F006 | 204 / textarea | `value={content}` |
| F007 | 209 / input | `type="checkbox"` |
| F008 | 213 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 70 / LoadingState | `label="Carregando notificações..."` |

Legendas/opções encontradas em configurações: `Lida`, `Não lida`, `Pendente resposta`, `Ciente`, `Aceita`, `Recusada`.

Chamadas reconhecidas: `api.notifications.list`, `api.employees.list`, `api.notifications.respond`, `api.notifications.createAdminNotice`.

Funções existentes: `fmtDateTime`, `getStatusBadge`, `NotificationsPage`, `empName`, `CreateNotificationForm`.

### apps/web/app/[tenant]/dashboard/management/onboarding/page.tsx

Origem: arquivo local.

Títulos: 12: Onboarding digital.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 15 / button | Novo onboarding | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="button"` |

Funções existentes: `OnboardingPage`.

### apps/web/app/[tenant]/dashboard/management/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `ManagementRedirect`.

### apps/web/app/[tenant]/dashboard/management/payroll/page.tsx

Origem: arquivo local.

Títulos: 99: Acesso restrito à folha de pagamento; 155: Folha de Pagamento; 427: Calcular Folha.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 160 / button | Calcular Folha | `onClick={() => setCalcModalOpen(true)}` | `type="button"` |
| A002 | 216 / button | Calcular primeira folha | `onClick={() => setCalcModalOpen(true)}` | `type="button"` |
| A003 | 296 / button | Aprovar | `onClick={() => handleApprove(item)}` | `type="button"; disabled={busyId === item.id}` |
| A004 | 306 / button | Marcar Pago | `onClick={() => handleMarkAsPaid(item)}` | `type="button"; disabled={busyId === item.id}` |
| A005 | 316 / button | Excluir | `onClick={() => handleDelete(item)}` | `type="button"; disabled={busyId === item.id}` |
| A006 | 431 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `type="button"; disabled={saving}` |
| A007 | 441 / form | Funcionário * {loadingEmployees ? 'Carregando funcionários...' : 'Selecione um funcionário...'} {employees.map((emp) => ( <option key={emp.id} value={emp.id}> {emp.name} {emp.position ? ` — ${emp.position}` : ''} </option> ))} Mês * {MONTHS.map((name, idx) => ( <option key={name} value={idx + 1}>… | `onSubmit={handleSubmit}` | `—` |
| A008 | 496 / button | Cancelar | `onClick={onClose}` | `type="button"; disabled={saving}` |
| A009 | 499 / button | {saving ? ( <>Calculando...</> ) : ( <><Calculator size={14} /> Calcular</> )} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={!valid \|\| saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 184 / select | `value={filterYear}` |
| F002 | 196 / select | `value={filterMonth}` |
| F003 | 445 / select | `disabled={saving \|\| loadingEmployees}; value={employeeId}` |
| F004 | 468 / select | `disabled={saving}; value={month}` |
| F005 | 481 / select | `disabled={saving}; value={year}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 166 / LoadingState | `label="Carregando folha de pagamento..."` |
| C002 | 173 / SummaryCard | `label="Total de Funcionários"; value={totals.employees}` |
| C003 | 174 / SummaryCard | `label="Total Bruto"; value={brl(totals.gross)}` |
| C004 | 175 / SummaryCard | `label="Total Líquido"; value={brl(totals.net)}` |
| C005 | 176 / SummaryCard | `label="Folhas Aprovadas"; value={totals.approved}` |

Chamadas reconhecidas: `payrollApi.list`, `api.employees.list`, `payrollApi.approve`, `payrollApi.markAsPaid`, `payrollApi.remove`, `payrollApi.create`.

Funções existentes: `brl`, `statusClasses`, `PayrollPage`, `handleApprove`, `handleMarkAsPaid`, `handleDelete`, `SummaryCard`, `CalcPayrollModal`, `handleSubmit`.

### apps/web/app/[tenant]/dashboard/media/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `MediaPage`.

### apps/web/app/[tenant]/dashboard/notifications/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `NotificationsPage`.

### apps/web/app/[tenant]/dashboard/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 236: {presentation.title}; 260: Visão Comercial; 277: {presentation.title}; 488: Central de notificaÃ§Ãµes; 531: Datas importantes; 718: {title}; 786: PendÃªncias; 837: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 247 / Link | {s.label} | `href={s.href}` | `—` |
| A002 | 288 / Link | {s.label} | `href={s.href}` | `—` |
| A003 | 493 / Link | Ver todas â†’ | `href={ˋ/${tenant}/dashboard/notificationsˋ}` | `—` |
| A004 | 574 / Link | Ver â†’ | `href={ˋ/${tenant}/dashboard/time-track?employeeId=${row.employeeId}ˋ}` | `—` |
| A005 | 794 / Link | {item.label} {item.value} | `href={item.href}` | `—` |
| A006 | 872 / Link | {footerLabel} â†’ | `href={footerHref}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 308 / input | `type="month"; value={dashMonth}` |
| F002 | 319 / select | `value={dashDept}` |

Legendas/opções encontradas em configurações: `Ativos`, `Em admissÃ£o`, `Inativos`, `Desligados`, `VisÃ£o global da plataforma`, `Empresas, acessos, faturamento e saÃºde operacional em um sÃ³ lugar.`, `Controle completo da empresa`, `Pessoas, usuÃ¡rios, jornada e fechamento sob sua administraÃ§Ã£o.`, `GestÃ£o de pessoas em tempo real`, `Cadastros, fÃ©rias, ocorrÃªncias e fechamento para o time de RH.`, `Sua equipe em tempo real`, `Escala, ponto, banco de horas e pendÃªncias da equipe sob sua gestÃ£o.`, `Indicadores da operaÃ§Ã£o`, `Acompanhamento em modo de consulta, sem alteraÃ§Ãµes operacionais.`, `VisÃ£o comercial da plataforma`, `Acompanhe empresas, propostas, planos e a operaÃ§Ã£o comercial em um sÃ³ lugar.`, `Plataforma`, `Financeiro`, `UsuÃ¡rios`, `FuncionÃ¡rios`, `Fechamento`, `Novo funcionÃ¡rio`, `FÃ©rias`, `GestÃ£o`, `Minha equipe`, `Escala`, `Ponto`, `Propostas`, `Empresas`, `admissÃµes no mÃªs`, `ASOs vencidos`, `ASOs a vencer`, `ASO admissional pend.`, `Inaptos`, `Pontos manuais`, `FÃ©rias pendentes`, `Sem gestor`, `Sem acesso`.

Chamadas reconhecidas: `api.dashboard.summary`, `api.dashboard.insights`, `api.dashboard.rhAlerts`, `api.notifications.dashboardWidget`, `api.timeTrack.list`, `api.vacations.list`, `api.employees.list`.

Funções existentes: `DashboardHome`, `DashboardContent`, `KpiCard`, `ChartBlock`, `ChartTooltip`, `EmptyChart`, `PendencyCard`, `DataTableCard`.

### apps/web/app/[tenant]/dashboard/partners/page.tsx

Origem: arquivo local.

Títulos: 10: Parceiros e Fornecedores.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 15 / Link | Adicionar Parceiro | `href="partners/new"` | `—` |

Funções existentes: `PartnersPage`.

### apps/web/app/[tenant]/dashboard/performance/page.tsx

Origem: arquivo local.

Títulos: 62: Avaliação de Desempenho.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 63 / Button | Nova Avaliação | `(sem handler/destino neste elemento; verificar componente/contexto)` | `variant="primary"` |
| A002 | 96 / Button | {ev.status === 'completed' ? 'Ver Detalhes' : 'Continuar Avaliação'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `variant="outline"` |

Funções existentes: `PerformancePage`.

### apps/web/app/[tenant]/dashboard/platform/[companyId]/page.tsx

Origem: arquivo local.

Títulos: 141: {item.name}; 178: Dados da empresa; 181: Integração Asaas (Somente Leitura); 193: Gestão de Licenciamento & Assinatura; 226: Contratos da Empresa; 236: Tickets de Suporte da Empresa; 266: Nova Cobrança Avulsa.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 139 / Link | Voltar para empresas | `href={ˋ/${params.tenant}/dashboard/platformˋ}` | `—` |
| A002 | 149 / button | Nova Cobrança Manual | `onClick={() => setIsInvoiceModalOpen(true)}` | `—` |
| A003 | 150 / button | {creatingCheckout ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Gerar checkout auto | `onClick={checkout}` | `disabled={creatingCheckout}` |
| A004 | 173 / button | {label} | `onClick={() => setTab(id)}` | `—` |
| A005 | 213 / Link | Ver Planos e Preços | `href={ˋ/${params.tenant}/dashboard/platform/plansˋ}` | `—` |
| A006 | 227 / Link | Gerenciar Contratos | `href={ˋ/${params.tenant}/dashboard/platform/contracts?companyId=${params.companyId}ˋ}` | `—` |
| A007 | 237 / Link | Painel Completo de Suporte | `href={ˋ/${params.tenant}/dashboard/platform/support?companyId=${params.companyId}ˋ}` | `—` |
| A008 | 251 / button | "Copiar link" | `onClick={() => copyLink(invoice)}` | `—` |
| A009 | 251 / a | "Abrir" | `href={invoice.invoiceUrl}` | `—` |
| A010 | 267 / button | (ícone/controle sem legenda estática) | `onClick={() => setIsInvoiceModalOpen(false)}` | `—` |
| A011 | 269 / form | Valor (R$) Vencimento Descrição da Cobrança Cancelar {creatingManualInvoice ? <Loader2 size={16} className="animate-spin" /> : 'Gerar e Enviar para Asaas'} | `onSubmit={createManualInvoice}` | `—` |
| A012 | 285 / button | Cancelar | `onClick={() => setIsInvoiceModalOpen(false)}` | `type="button"` |
| A013 | 286 / button | {creatingManualInvoice ? <Loader2 size={16} className="animate-spin" /> : 'Gerar e Enviar para Asaas'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={creatingManualInvoice}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 273 / input | `type="number"; placeholder="Ex: 99.90"; value={invoiceForm.amount}` |
| F002 | 277 / input | `type="date"; value={invoiceForm.dueDate}` |
| F003 | 281 / input | `type="text"; placeholder="Ex: Fatura Negociada - Mensalidade"; value={invoiceForm.description}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 78 / LoadingState | `label="Carregando empresa..."` |
| C002 | 178 / Info | `label="Nome"; value={item.name}` |
| C003 | 178 / Info | `label="Documento"; value={item.document \|\| '-'}` |
| C004 | 178 / Info | `label="Criada em"; value={date(item.createdAt)}` |
| C005 | 178 / Info | `label="Plano"; value={item.plan \|\| 'FREE'}` |
| C006 | 178 / Info | `label="Status financeiro"; value={item.billingStatus \|\| 'TRIAL'}` |
| C007 | 178 / Info | `label="Motivo bloqueio"; value={item.suspensionReason \|\| '-'}` |
| C008 | 184 / InfoDark | `label="Customer ID (Imutável no console)"; value={item.asaasCustomerId \|\| 'Ainda não vinculado'}` |
| C009 | 184 / InfoDark | `label="Subscription ID (Imutável no console)"; value={item.asaasSubscriptionId \|\| 'Ainda não gerada'}` |
| C010 | 229 / LoadingState | `label="Carregando contratos..."` |
| C011 | 239 / LoadingState | `label="Carregando chamados..."` |
| C012 | 245 / LoadingState | `label="Carregando usuarios..."` |
| C013 | 251 / LoadingState | `label="Carregando faturas..."` |
| C014 | 257 / LoadingState | `label="Carregando historico..."` |

Legendas/opções encontradas em configurações: ``, `Usuarios`, `Colaboradores`, `Faturas`, `Asaas`.

Chamadas reconhecidas: `api.platform.getCompany`, `api.platform.listCompanyUsers`, `api.platform.finance.listCompany`, `api.platform.getCompanyAuditLogs`, `api.platform.listManualContracts`, `api.platformSupport.list`, `api.platform.finance.checkoutCompany`, `api.platform.finance.create`.

Funções existentes: `parseMoney`, `money`, `date`, `CompanyDetailPage`, `checkout`, `createManualInvoice`, `copyLink`, `Info`, `InfoDark`.

### apps/web/app/[tenant]/dashboard/platform/_components/company-action-menu.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 54 / button | (ícone/controle sem legenda estática) | `onClick={() => setOpen(!open)}` | `—` |
| A002 | 64 / Link | Detalhes & Resumo | `onClick={() => setOpen(false)}; href={ˋ/${tenant}/dashboard/platform/${company.id}?tab=generalˋ}` | `—` |
| A003 | 73 / button | Editar empresa | `onClick={() => { setOpen(false); onEdit(); }}` | `type="button"` |
| A004 | 83 / Link | Usuários da Empresa | `onClick={() => setOpen(false)}; href={ˋ/${tenant}/dashboard/platform/${company.id}?tab=usersˋ}` | `—` |
| A005 | 94 / Link | Assinatura & Plano | `onClick={() => setOpen(false)}; href={ˋ/${tenant}/dashboard/platform/${company.id}?tab=subscriptionˋ}` | `—` |
| A006 | 107 / Link | Acessar como cliente | `onClick={() => setOpen(false)}; href={ˋ/auth/ghost-init?companyId=${company.id}ˋ}` | `—` |
| A007 | 116 / button | {status === 'ACTIVE' ? 'Suspender' : 'Ativar'} | `onClick={() => { setOpen(false); onToggleStatus(); }}` | `disabled={loadingToggle}` |
| A008 | 125 / button | Arquivar (Soft Cancel) | `onClick={() => { setOpen(false); onDelete(); }}` | `disabled={loadingDelete}` |
| A009 | 135 / button | Deletar definitivamente | `onClick={() => { setOpen(false); onPurge(); }}` | `disabled={loadingPurge}` |

Funções existentes: `CompanyActionMenu`, `handleClickOutside`.

### apps/web/app/[tenant]/dashboard/platform/_components/company-edit-modal.tsx

Origem: arquivo local.

Títulos: 89: Editar empresa; 139: Modulos ativos.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 91 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 179 / button | Cancelar | `onClick={onClose}` | `type="button"` |
| A003 | 182 / button | {save.loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar empresa | `onClick={() => save.mutate()}` | `type="button"; disabled={save.loading \|\| !isDirty}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 22 / input | `type={type}; value={value}` |
| F002 | 106 / select | `value={form.platformPlanId}` |
| F003 | 119 / select | `value={form.status}` |
| F004 | 127 / select | `value={form.billingStatus}` |
| F005 | 145 / input | `type="checkbox"` |
| F006 | 154 / textarea | `placeholder="Contexto comercial, bloqueio, negociacao ou observacao interna"; value={form.internalNotes}` |
| F007 | 165 / select | `value={form.suspensionReason}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 100 / Field | `label="Nome da empresa"; value={form.name}` |
| C002 | 101 / Field | `label="CNPJ"; value={form.document}` |
| C003 | 102 / Field | `label="Max. usuarios"; type="number"; value={form.maxUsers}` |
| C004 | 103 / Field | `label="Max. funcionarios"; type="number"; value={form.maxEmployees}` |
| C005 | 134 / Field | `label="Fim do trial"; type="date"; value={form.trialEndsAt}` |

Legendas/opções encontradas em configurações: `Funcionarios`, `Controle de Ponto`, `Ferias`, `Gestao`, `Suporte`.

Chamadas reconhecidas: `api.platform.listPlans`, `api.platform.updateCompany`.

Funções existentes: `Field`, `CompanyEditModal`, `toggleModule`.

### apps/web/app/[tenant]/dashboard/platform/_components/company-manage-modal.tsx

Origem: arquivo local.

Títulos: 88: Gerenciar {normalizeDisplayName(company.name)}; 234: Integração Asaas.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 91 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 102 / button | {t.icon} {t.label} | `onClick={() => setActiveTab(t.id as any)}` | `—` |
| A003 | 191 / button | {generatingContract ? 'Gerando contrato...' : 'Gerar Contrato (PDF)'} | `onClick={handleGeneratePdf}` | `disabled={generatingContract}` |
| A004 | 253 / a | Abrir Cliente no Asaas | `href={ˋhttps://www.asaas.com/customer/view/${asaasCustomerId}ˋ}` | `—` |
| A005 | 259 / a | Abrir Assinatura no Asaas | `href={ˋhttps://www.asaas.com/subscription/view/${asaasSubscriptionId}ˋ}` | `—` |
| A006 | 293 / button | Cancelar | `onClick={onClose}` | `—` |
| A007 | 294 / button | {loading ? 'Salvando...' : 'Salvar Empresa'} | `onClick={() => valid && changed && onSave({ name, document: cnpj, maxUsers, maxEmployees, plan, billingStatus, trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined, activeModules, asaasCustomerId, asaasSubscriptionId, internalNotes })}` | `disabled={!valid \|\| !changed \|\| loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 122 / input | `type="text"; placeholder="Razão social ou nome fantasia"; value={name}` |
| F002 | 133 / input | `type="text"; placeholder="00.000.000/0000-00"; value={cnpj}` |
| F003 | 152 / input | `type="number"; value={maxUsers}` |
| F004 | 163 / input | `type="number"; value={maxEmployees}` |
| F005 | 172 / select | `value={plan}` |
| F006 | 181 / select | `value={billingStatus}` |
| F007 | 215 / input | `type="checkbox"` |
| F008 | 242 / input | `type="text"; placeholder="cus_00000..."; value={asaasCustomerId}` |
| F009 | 246 / input | `type="text"; placeholder="sub_00000..."; value={asaasSubscriptionId}` |
| F010 | 272 / textarea | `placeholder="Registre aqui o histórico de negociação, alinhamentos e observações técnicas sobre o cliente..."; value={internalNotes}` |

Legendas/opções encontradas em configurações: `Planos e Limites`, `Permissões`, `Financeiro`, `CRM / Notas`, `Funcionários`, `Controle de Ponto`, `Gestão de Férias`, `Painel de Gestão`, `Integração WhatsApp`.

Chamadas reconhecidas: `api.platform.listPlans`, `api.manualContracts.create`, `api.manualContracts.downloadPdf`.

Funções existentes: `safeIsoDate`, `CompanyManageModal`.

### apps/web/app/[tenant]/dashboard/platform/_components/company-users-modal.tsx

Origem: arquivo local.

Títulos: 40: Usuários de {normalizeDisplayName(company.name)}; 126: {user ? 'Editar usuario' : 'Novo usuario'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 43 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 46 / button | Novo usuario | `onClick={() => setOpenNew(true)}` | `—` |
| A003 | 81 / button | Editar | `onClick={() => setEditing(u)}` | `—` |
| A004 | 82 / button | Remover | `onClick={() => handleDelete(u)}` | `—` |
| A005 | 127 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A006 | 148 / button | Cancelar | `onClick={onClose}` | `—` |
| A007 | 149 / button | {save.loading ? 'Salvando...' : 'Salvar'} | `onClick={() => valid && save.mutate().catch(() => {})}` | `disabled={!valid \|\| save.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 18 / input | `type={type}; value={value}` |
| F002 | 136 / select | `value={form.role}` |
| F003 | 142 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 51 / LoadingState | `label="Carregando usuarios..."` |
| C002 | 131 / F | `label="Nome"; value={form.name}` |
| C003 | 132 / F | `label="E-mail"; type="email"; value={form.email}` |
| C004 | 133 / F | `label={user ? 'Nova senha (opcional)' : 'Senha padrao (min. 8 chars)'}; type="password"; value={form.password}` |

Chamadas reconhecidas: `api.platform.listCompanyUsers`, `api.platform.getOnlineUsers`, `api.platform.deleteCompanyUser`, `api.platform.updateCompanyUser`, `api.platform.createCompanyUser`.

Funções existentes: `F`, `CompanyUsersModal`, `handleDelete`, `CompanyUserFormModal`.

### apps/web/app/[tenant]/dashboard/platform/_components/new-company-modal.tsx

Origem: arquivo local.

Títulos: 56: Nova empresa.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 57 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 66 / button | Buscar | `onClick={async () => { if (!form.document \|\| form.document.length < 14) return alert('Digite um CNPJ válido'); try { const res = await api.platform.getReceitaCnpj(form.document.replace(/\D/g, '')); if (res.nome) set('name', res.nome); if (res.email) set('adminEmail', res.email); } catch (e: any) { alert(e.message \|\| 'Erro ao buscar CNPJ'); } }}` | `type="button"` |
| A003 | 115 / button | Cancelar | `onClick={onClose}` | `—` |
| A004 | 116 / button | {create.loading ? 'Criando...' : 'Criar empresa'} | `onClick={() => valid && create.mutate().catch(() => {})}` | `disabled={!valid \|\| create.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 14 / input | `type={type}; value={value}` |
| F002 | 65 / input | `type="text"; value={form.document ?? ''}` |
| F003 | 86 / select | `value={form.planId \|\| ''}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 61 / F | `label="Nome da empresa"; value={form.name}` |
| C002 | 103 / F | `label="Max. usuarios"; type="number"; value={String(form.maxUsers)}` |
| C003 | 104 / F | `label="Max. funcionarios"; type="number"; value={String(form.maxEmployees)}` |
| C004 | 108 / F | `label="Nome"; value={form.adminName}` |
| C005 | 109 / F | `label="E-mail"; type="email"; value={form.adminEmail}` |
| C006 | 111 / F | `label="Senha (min. 8 chars)"; type="password"; value={form.adminPassword}` |

Legendas/opções encontradas em configurações: ``.

Chamadas reconhecidas: `api.platform.listPlans`, `api.platform.createCompany`, `api.platform.getReceitaCnpj`.

Funções existentes: `F`, `NewCompanyModal`, `set`.

### apps/web/app/[tenant]/dashboard/platform/_components/platform-nav.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 17 / Link | {group.label} {group.description} | `href={ˋ${base}${group.href}ˋ}` | `—` |

Funções existentes: `PlatformNav`.

### apps/web/app/[tenant]/dashboard/platform/access/page.tsx

Origem: arquivo local.

Títulos: 48: {item.name \|\| item.email}.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 35 / input | `placeholder="Buscar usuario, empresa ou perfil"; value={search}` |

Funções existentes: `isMobileUserAgent`, `AccessPage`.

### apps/web/app/[tenant]/dashboard/platform/accounting/page.tsx

Origem: arquivo local.

Títulos: 57: Contabilidade; 80: Fila de revisão por empresa; 83: O que precisa de atenção; 93: Acesso restrito; 101: {company.name}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 62 / button | Atualizar | `onClick={refresh}` | `type="button"` |
| A002 | 97 / button | {company.name} {company.document \|\| 'Documento não informado'} | `onClick={() => onSelect(company.id)}` | `type="button"` |
| A003 | 99 / button | {label} {value} | `onClick={onClick}` | `type="button"` |
| A004 | 101 / button | {label} | `onClick={() => setTab(key)}` | `type="button"` |
| A005 | 101 / a | Abrir Financeiro | `href="../finance"` | `—` |
| A006 | 103 / button | Corrigir | `onClick={() => onEdit(item)}` | `type="button"` |
| A007 | 104 / button | Corrigir | `onClick={() => onEdit(item)}` | `type="button"` |
| A008 | 107 / form | Campo {[['salaryBase', 'Salário base'], ['overtime50', 'Hora extra 50%'], ['overtime100', 'Hora extra 100%'], ['nightShift', 'Adicional noturno'], ['absenceMinutes', 'Faltas (minutos)'], ['lateMinutes', 'Atrasos (minutos)'], ['earlyLeaveMinutes', 'Saídas antecipadas (minutos)']].map(([key, label]… | `onSubmit={save}` | `—` |
| A009 | 107 / ModalActions | (ícone/controle sem legenda estática) | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A010 | 109 / form | Valor {[['baseSalary', 'Salário base'], ['grossSalary', 'Salário bruto'], ['netSalary', 'Valor líquido a pagar'], ['inssAmount', 'INSS'], ['irrfAmount', 'IRRF'], ['fgtsAmount', 'FGTS'], ['overtimeAmount', 'Horas extras'], ['nightShiftAmount', 'Adicional noturno']].map(([key, label]) => <option ke… | `onSubmit={save}` | `—` |
| A011 | 109 / ModalActions | (ícone/controle sem legenda estática) | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A012 | 111 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `type="button"` |
| A013 | 112 / button | Cancelar | `onClick={onClose}` | `type="button"; disabled={saving}` |
| A014 | 112 / button | {saving ? 'Salvando...' : <><CheckCircle2 size={14} /> Salvar correção</>} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 61 / input | `type="month"; value={month}` |
| F002 | 80 / input | `placeholder="Buscar empresa"; value={search}` |
| F003 | 107 / select | `value={field}` |
| F004 | 107 / input | `type="number"; value={value}` |
| F005 | 107 / textarea | `placeholder="Explique o documento ou conferência que originou o ajuste."; value={reason}` |
| F006 | 109 / select | `value={field}` |
| F007 | 109 / input | `type="number"; value={value}` |
| F008 | 109 / textarea | `placeholder="Informe a origem da correção."; value={reason}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 68 / Metric | `label="Empresas monitoradas"; value={overview.data?.metrics.companies}; hint="Escopo global"` |
| C002 | 69 / Metric | `label="Correções de ponto"; value={overview.data?.metrics.closingsInReview}; hint={ˋ${overview.data?.metrics.closings ?? 0} fechamentos no períodoˋ}` |
| C003 | 70 / Metric | `label="Folhas pendentes"; value={overview.data?.metrics.payrollsPending}; hint={ˋ${overview.data?.metrics.payrolls ?? 0} folhas calculadasˋ}` |
| C004 | 71 / Metric | `label="Sem nota fiscal"; value={overview.data?.metrics.invoicesWithoutFiscalNumber}; hint={ˋ${money(overview.data?.metrics.invoiceTotal)} em cobrançasˋ}` |
| C005 | 83 / Focus | `label="Folhas de ponto em revisão"; value={overview.data?.metrics.closingsInReview ?? 0}` |
| C006 | 83 / Focus | `label="Folhas aguardando validação"; value={overview.data?.metrics.payrollsPending ?? 0}` |
| C007 | 83 / Focus | `label="Cobranças sem número fiscal"; value={overview.data?.metrics.invoicesWithoutFiscalNumber ?? 0}` |
| C008 | 97 / Badge | `value={company.closingsInReview}; label="ponto"` |
| C009 | 97 / Badge | `value={company.payrollsPending}; label="folha"` |
| C010 | 97 / Badge | `value={company.invoicesOverdue}; label="vencidas"` |

Chamadas reconhecidas: `api.platform.accounting.overview`, `api.platform.accounting.closings`, `api.platform.accounting.payroll`, `api.platform.accounting.adjustClosing`, `api.platform.accounting.correctPayroll`.

Funções existentes: `AccountingPage`, `selectCompany`, `refresh`, `Restricted`, `Metric`, `CompanyRow`, `Badge`, `Focus`, `CompanyWorkspace`, `ClosingList`, `PayrollList`, `Empty`, `ClosingCorrection`, `save`, `PayrollCorrection`, `save`, `Modal`, `ModalActions`.

### apps/web/app/[tenant]/dashboard/platform/audit/page.tsx

Origem: arquivo local.

Títulos: 148: Linha do tempo de acessos e eventos.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 215 / button | "Exportar dados visíveis como CSV" | `onClick={() => exportCsv(filteredLogs)}` | `—` |
| A002 | 242 / button | Tentar novamente | `onClick={() => loadLogs(companyId)}` | `—` |
| A003 | 335 / button | (ícone/controle sem legenda estática) | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | `disabled={safeCurrentPage === 1}` |
| A004 | 346 / button | {pg} | `onClick={() => setPage(pg)}` | `—` |
| A005 | 359 / button | (ícone/controle sem legenda estática) | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | `disabled={safeCurrentPage === totalPages}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 180 / input | `placeholder="Buscar por nome, evento, IP ou dispositivo"; value={search}` |
| F002 | 188 / select | `value={type}` |
| F003 | 201 / select | `value={companyId}` |

Legendas/opções encontradas em configurações: `Total de eventos`, `Falhas`, `Trocas de senha`, `Termos aceitos`, `Celular`.

Funções existentes: `translateAction`, `formatActor`, `formatIp`, `isMobile`, `exportCsv`, `AuditPage`.

### apps/web/app/[tenant]/dashboard/platform/companies/page.tsx

Origem: arquivo local.

Títulos: 106: Empresas.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 109 / button | Nova empresa | `onClick={() => setOpen(true)}` | `—` |
| A002 | 190 / CompanyActionMenu | (ícone/controle sem legenda estática) | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A003 | 228 / button | (ícone/controle sem legenda estática) | `onClick={() => setPage(p => Math.max(1, p - 1))}` | `disabled={page === 1}` |
| A004 | 236 / button | (ícone/controle sem legenda estática) | `onClick={() => setPage(p => p + 1)}` | `disabled={page * limit >= companies.data.total}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 135 / input | `type="text"; placeholder="Buscar por nome ou CNPJ..."; value={search}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 123 / LoadingState | `label="Carregando empresas..."` |

Chamadas reconhecidas: `api.platform.stats`, `api.platform.listCompanies`, `api.platform.listPlans`, `api.platform.updateCompany`, `api.platform.deleteCompany`, `api.platform.purgeCompany`.

Funções existentes: `CompaniesPage`, `canManageCompanyUsers`, `canManageLicenses`, `handleToggle`, `handleDelete`, `handlePurge`.

### apps/web/app/[tenant]/dashboard/platform/configuration/page.tsx

Origem: arquivo local.

Títulos: 224: Configuracao indisponivel; 248: Configuracao central, sem duplicacao.; 345: Fila administrativa; 416: {title}; 434: {item.title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 226 / button | Tentar novamente | `onClick={() => void loadConfiguration()}` | `type="button"` |
| A002 | 261 / button | {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Atualizar | `onClick={() => void loadConfiguration(true)}` | `type="button"; disabled={refreshing}` |
| A003 | 421 / Link | {item.meta} {item.title} {item.description} {item.action} | `href={item.href}` | `—` |
| A004 | 459 / Link | {title} {count} {description} Resolver | `href={href}` | `—` |

Legendas/opções encontradas em configurações: `Empresas`, `Cadastro, limites, situacao de acesso e dados operacionais de cada cliente.`, `Planos e limites`, `Precos, quantidade de usuarios, modulos e regras comerciais disponiveis.`, `Permissoes globais`, `Politicas por perfil para controlar visualizacao e operacoes sensiveis.`, `Assinaturas`, `Vinculos entre empresas, planos e cobranca recorrente no Asaas.`, `Acessos DEV`, `Acessos tecnicos e sessoes de suporte que exigem controle administrativo.`, `Integracoes e comunicacao`, `Configuracao e acompanhamento dos canais de comunicacao da plataforma.`, `Auditoria`, `Historico de alteracoes por empresa, autor, entidade e data.`, `Empresas ativas`, `Planos cadastrados`, `Perfis configurados`, `Pendencias`.

Chamadas reconhecidas: `api.platform.listCompanies`, `api.platform.listPlans`.

Funções existentes: `formatTime`, `ConfigurationSkeleton`, `PlatformConfigurationPage`, `loadConfiguration`, `ConfigurationGroup`, `PendingItem`.

### apps/web/app/[tenant]/dashboard/platform/contracts/page.tsx

Origem: arquivo local.

Títulos: 251: Gestão de contratos; 360: Contratos cadastrados; 448: {selectedContract.company?.name \|\| 'Empresa'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 256 / Link | Voltar | `href={ˋ/${tenant}/dashboard/platformˋ}` | `—` |
| A002 | 259 / button | Atualizar | `onClick={load}` | `type="button"; disabled={loading}` |
| A003 | 262 / button | Novo contrato | `onClick={startCreate}` | `type="button"` |
| A004 | 282 / form | Empresa Selecione a empresa {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)} Plano Sem plano vinculado {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)} Licenças Valor acordado Início Fim (opcional) Pagamento Asaas T… | `onSubmit={submit}` | `—` |
| A005 | 344 / button | {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar contrato manual'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `disabled={saving}` |
| A006 | 349 / button | Limpar edição | `onClick={startCreate}` | `type="button"` |
| A007 | 365 / button | {item === 'ALL' ? 'Todos' : item} | `onClick={() => setStatusFilter(item)}` | `type="button"` |
| A008 | 420 / button | Detalhes | `onClick={() => setSelectedContract(item)}` | `type="button"` |
| A009 | 423 / button | PDF | `onClick={() => exportPdf(item)}` | `type="button"` |
| A010 | 426 / button | Editar | `onClick={() => startEdit(item)}` | `type="button"` |
| A011 | 429 / button | {workingId === item.id ? <Loader2 size={14} className="inline animate-spin" /> : <Trash2 size={14} className="inline" />} Excluir | `onClick={() => remove(item)}` | `type="button"; disabled={workingId === item.id}` |
| A012 | 453 / button | (ícone/controle sem legenda estática) | `onClick={() => setSelectedContract(null)}` | `type="button"` |
| A013 | 485 / button | Editar | `onClick={() => { startEdit(selectedContract); setSelectedContract(null); }}` | `type="button"` |
| A014 | 496 / button | Gerar PDF | `onClick={() => { exportPdf(selectedContract); setSelectedContract(null); }}` | `type="button"` |
| A015 | 508 / a | Abrir documento | `href={selectedContract.documentUrl}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 286 / select | `value={form.companyId}` |
| F002 | 293 / select | `value={form.planId}` |
| F003 | 300 / input | `type="number"; value={form.seatQuantity}` |
| F004 | 304 / input | `type="number"; placeholder="R$ 0,00"; value={form.agreedAmount}` |
| F005 | 308 / input | `type="date"; value={form.startsAt}` |
| F006 | 312 / input | `type="date"; value={form.endsAt}` |
| F007 | 316 / select | `value={form.paymentMethod}` |
| F008 | 324 / select | `value={form.status}` |
| F009 | 332 / input | `placeholder="Contrato Asaas ou documento interno"; value={form.externalContractNumber}` |
| F010 | 336 / input | `placeholder="https://..."; value={form.documentUrl}` |
| F011 | 341 / textarea | `placeholder="Motivo e observações"; value={form.notes}` |

Legendas/opções encontradas em configurações: `Ativos`, `Encerrados`, `Cancelados`, `Receita contratada`.

Chamadas reconhecidas: `api.manualContracts.list`, `api.platform.listCompanies`, `api.platform.listPlans`, `api.manualContracts.update`, `api.manualContracts.create`, `api.manualContracts.delete`, `api.manualContracts.downloadPdf`.

Funções existentes: `parseMoney`, `money`, `date`, `safeIsoDate`, `ContractsPage`, `load`, `startCreate`, `startEdit`, `submit`, `remove`, `exportPdf`.

### apps/web/app/[tenant]/dashboard/platform/coupons/page.tsx

Origem: arquivo local.

Títulos: 112: {editingId ? 'Editar cupom' : 'Novo cupom de trial'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 110 / form | {editingId ? 'Editar cupom' : 'Novo cupom de trial'} {editingId && ( <button type="button" onClick={startCreate} className="text-xs font-bold text-slate-500 hover:text-slate-800"> Limpar </button> )} {editingId ? 'Salvar alteracoes' : 'Criar cupom'} {error && <p className="text-sm text-rose-600">… | `onSubmit={submit}` | `—` |
| A002 | 114 / button | Limpar | `onClick={startCreate}` | `type="button"` |
| A003 | 129 / button | {editingId ? 'Salvar alteracoes' : 'Criar cupom'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A004 | 160 / button | Editar | `onClick={() => startEdit(item)}` | `type="button"` |
| A005 | 163 / button | {item.isActive ? 'Desativar' : 'Ativar'} | `onClick={() => toggle(item)}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 119 / input | `placeholder="Codigo"; value={form.code}` |
| F002 | 120 / input | `placeholder="Descricao"; value={form.description}` |
| F003 | 122 / input | `type="number"; aria-label="Dias de trial"; value={form.trialDays}` |
| F004 | 123 / input | `type="number"; placeholder="Limite"; value={form.maxRedemptions}` |
| F005 | 126 / input | `type="date"; value={form.startsAt}` |
| F006 | 127 / input | `type="date"; value={form.expiresAt}` |

Legendas/opções encontradas em configurações: ``.

Funções existentes: `toFormState`, `formatDate`, `CouponsPage`, `load`, `startCreate`, `startEdit`, `submit`, `toggle`.

### apps/web/app/[tenant]/dashboard/platform/finance/page.tsx

Origem: arquivo local.

Títulos: 325: Gestao da Plataforma; 367: Receita confirmada; 385: Faturado x recebido; 414: Saude da cobranca e integracao; 467: Leitura operacional da pagina; 500: Eventos de integração; 582: Histórico recente; 763: {selectedInvoice.company?.name \|\| 'Empresa'}; 879: {editingInvoice ? 'Editar cobrança' : 'Nova cobrança'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 330 / button | Nova cobrança | `onClick={startCreate}` | `—` |
| A002 | 334 / button | Exportar PDF/HTML | `onClick={exportPdf}` | `—` |
| A003 | 337 / button | Extrato Bancário (CSV) | `onClick={exportCsv}` | `—` |
| A004 | 502 / button | Atualizar | `onClick={() => webhookEvents.refetch()}` | `—` |
| A005 | 560 / button | {retryingWebhookId === event.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reprocessar | `onClick={() => retryWebhook(event)}` | `type="button"; disabled={retryingWebhookId === event.id}` |
| A006 | 584 / button | Atualizar | `onClick={() => billingAuditLogs.refetch()}` | `—` |
| A007 | 652 / button | (ícone/controle sem legenda estática) | `onClick={refresh}` | `—` |
| A008 | 696 / button | "Ver detalhes" | `onClick={() => setSelectedInvoice(invoice)}` | `type="button"` |
| A009 | 706 / button | "Copiar link" | `onClick={() => navigator.clipboard.writeText(invoice.invoiceUrl \|\| '').then(() => toast.success('Link copiado.'))}` | `type="button"` |
| A010 | 709 / a | "Abrir" | `href={invoice.invoiceUrl}` | `—` |
| A011 | 716 / button | "Editar" | `onClick={() => startEdit(invoice)}` | `type="button"` |
| A012 | 720 / button | "Cancelar / Excluir" | `onClick={() => removeInvoice(invoice)}` | `type="button"; disabled={workingId === invoice.id}` |
| A013 | 725 / button | "Reembolsar (Estorno 7 dias)" | `onClick={() => refundInvoice(invoice)}` | `type="button"; disabled={workingId === invoice.id}` |
| A014 | 732 / button | "Sincronizar Asaas" | `onClick={() => sync(invoice)}` | `type="button"; disabled={workingId === invoice.id}` |
| A015 | 749 / button | Anterior | `onClick={() => setPage((current) => current - 1)}` | `disabled={page <= 1}` |
| A016 | 751 / button | Proxima | `onClick={() => setPage((current) => current + 1)}` | `disabled={page >= invoices.data.pagination.pages}` |
| A017 | 766 / button | (ícone/controle sem legenda estática) | `onClick={() => setSelectedInvoice(null)}` | `type="button"` |
| A018 | 789 / button | Editar | `onClick={() => { startEdit(selectedInvoice); setSelectedInvoice(null); }}` | `type="button"` |
| A019 | 800 / button | Reembolsar | `onClick={async () => { if (await refundInvoice(selectedInvoice)) { setSelectedInvoice(null); } }}` | `type="button"; disabled={selectedInvoice.status !== 'PAID'}` |
| A020 | 813 / button | Sincronizar | `onClick={async () => { if (await sync(selectedInvoice)) { setSelectedInvoice(null); } }}` | `type="button"; disabled={!selectedInvoice.asaasPaymentId}` |
| A021 | 827 / a | Abrir cobrança | `href={selectedInvoice.invoiceUrl}` | `—` |
| A022 | 882 / button | (ícone/controle sem legenda estática) | `onClick={() => { setShowModal(false); setEditingInvoice(null); setForm(EMPTY_FORM); }}` | `—` |
| A023 | 886 / form | {!editingInvoice && ( <label className="block text-xs font-bold text-slate-600"> Empresa <select required value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slat… | `onSubmit={submitInvoice}` | `—` |
| A024 | 942 / button | Cancelar | `onClick={() => { setShowModal(false); setEditingInvoice(null); setForm(EMPTY_FORM); }}` | `type="button"` |
| A025 | 945 / button | {saving ? <Loader2 size={16} className="animate-spin" /> : null} {editingInvoice ? 'Salvar alterações' : 'Gerar cobrança'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={saving}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 629 / input | `placeholder="Buscar empresa ou CNPJ..."; value={search}` |
| F002 | 639 / select | `value={status}` |
| F003 | 650 / input | `type="date"; value={from}` |
| F004 | 651 / input | `type="date"; value={to}` |
| F005 | 890 / select | `value={form.companyId}` |
| F006 | 906 / input | `type="number"; value={form.amount}` |
| F007 | 910 / input | `type="date"; value={form.dueDate}` |
| F008 | 915 / input | `placeholder="Mensalidade, taxa extra..."; value={form.description}` |
| F009 | 920 / select | `value={form.billingType}` |
| F010 | 929 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 343 / LoadingState | `label="Carregando financeiro..."` |
| C002 | 521 / LoadingState | `label="Carregando eventos do Asaas..."` |
| C003 | 591 / LoadingState | `label="Carregando auditoria financeira..."` |
| C004 | 658 / LoadingState | `label="Carregando financeiro..."` |

Legendas/opções encontradas em configurações: `Em aberto`, `Pago`, `Vencido`, `Cancelado`, ``, `MRR Contratado`, `Faturado`, `Recebido`, `A receber`, `Em atraso`, `Asaas`, `Locais`, `Pagas`, `Cobranças enviadas ao Asaas`, `Cobranças locais`, `Cobranças em revisão`, `Cobranças em atraso`, `Pendentes`, `Falhas`, `Processados`.

Chamadas reconhecidas: `api.platform.finance.summary`, `api.platform.finance.list`, `api.platform.finance.webhookEvents`, `api.platform.finance.billingAuditLogs`, `api.platform.listCompanies`, `api.platform.finance.update`, `api.platform.finance.create`, `api.platform.finance.delete`, `api.platform.finance.refund`, `api.platform.finance.sync`, `api.platform.finance.downloadStatementPdf`, `api.platform.finance.retryWebhookEvent`.

Funções existentes: `parseMoney`, `money`, `date`, `dateTime`, `monthLabel`, `toIsoDate`, `FinancePage`, `refresh`, `startCreate`, `startEdit`, `submitInvoice`, `removeInvoice`, `refundInvoice`, `sync`, `exportPdf`, `retryWebhook`, `exportCsv`.

### apps/web/app/[tenant]/dashboard/platform/intelligence/page.tsx

Origem: arquivo local.

Títulos: 67: Análise de Risco IA & Preditiva.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 72 / button | Atualizar Dados | `onClick={() => companies.refetch()}` | `—` |
| A002 | 146 / Link | {c.name} | `href={ˋ/${params.tenant}/dashboard/platform/${c.id}?tab=generalˋ}` | `—` |
| A003 | 178 / button | {isAnalyzing ? ( <> <RefreshCw size={13} className="animate-spin text-indigo-600" /> Analisando com IA... </> ) : ( <> <Cpu size={14} className="text-indigo-600" /> {risk ? 'Reanalisar Risco' : 'Rodar IA Análise'} </> )} | `onClick={() => runAiRisk(c)}` | `disabled={isAnalyzing}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 122 / input | `type="text"; placeholder="Pesquisar empresa por nome ou CNPJ..."; value={search}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 55 / LoadingState | `label="Carregando inteligência operacional da frota..."` |

Chamadas reconhecidas: `api.platform.listCompanies`, `api.ai.platform.companyRisk`, `api.ai.platform.companySummary`.

Funções existentes: `IntelligencePage`, `runAiRisk`.

### apps/web/app/[tenant]/dashboard/platform/layout.tsx

Origem: arquivo local.

Títulos: 18: Acesso restrito à Plataforma; 33: Plataforma Innovation RH.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `PlatformLayout`.

### apps/web/app/[tenant]/dashboard/platform/page.tsx

Origem: arquivo local.

Títulos: 51: O pulso da sua plataforma; 73: Mapa de operação; 80: Ritmo operacional.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 54 / button | Nova empresa | `onClick={() => router.push(ˋ/${tenant}/dashboard/platform/companiesˋ)}` | `type="button"` |
| A002 | 69 / Link | {attentionCount ? 'Revisar pendências' : 'Ver empresas'} | `href={ˋ/${tenant}/dashboard/platform/${attentionCount ? 'finance' : 'companies'}ˋ}` | `—` |
| A003 | 75 / Link | {item.title} {item.description} | `href={ˋ/${tenant}/dashboard/platform${item.href}ˋ}` | `—` |
| A004 | 80 / Link | Abrir auditoria | `href={ˋ/${tenant}/dashboard/platform/auditˋ}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 81 / Signal | `label="Clientes ativos"; value={data?.activeCompanies ?? 0}` |
| C002 | 81 / Signal | `label="Atenção financeira"; value={data?.pastDueCompanies ?? 0}` |
| C003 | 81 / Signal | `label="Saúde de acesso"; value={data?.suspendedCompanies ?? 0}` |

Legendas/opções encontradas em configurações: `Empresas clientes`, `Cadastros, limites e situação de acesso`, `Inteligência operacional`, `Riscos, anomalias e sinais de churn`, `Financeiro`, `Receita, Asaas, cobrança e recebíveis`, `Contratos e propostas`, `Negociação, documentos e renovações`, `Assinaturas e planos`, `Recorrência, produtos e limites`, `Suporte operacional`, `Fila de chamados, SLA e atendimento`, `Configuração administrativa`, `Permissões, integrações e governança`, `Auditoria e logs`, `Rastreabilidade de ações sensíveis`, `Empresas`, `Ativas`, `Usuários`, `Funcionários`, `Suspensas`, `Inadimplentes`.

Chamadas reconhecidas: `api.platform.stats`.

Funções existentes: `PlatformDashboard`, `Signal`.

### apps/web/app/[tenant]/dashboard/platform/permissions/page.tsx

Origem: arquivo local.

Títulos: 180: Permissoes globais; 230: {ROLE_LABELS[selectedRole]}; 286: {group.title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 191 / button | {save.loading ? 'Salvando...' : 'Salvar alteracoes'} | `onClick={() => save.mutate(activePermissions)}` | `type="button"; disabled={!isDirty \|\| save.loading}` |
| A002 | 206 / button | {ROLE_LABELS[role]} {dirty && <span className={`rounded-full px-2 py-0.5 text-[10px] ${selectedRole === role ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700'}`}>rascunho</span>} {permissions.length} | `onClick={() => selectRole(role)}` | `type="button"` |
| A003 | 237 / button | Marcar todas | `onClick={selectAll}` | `type="button"` |
| A004 | 241 / button | Limpar | `onClick={clearAll}` | `type="button"` |
| A005 | 245 / button | Restaurar padrao | `onClick={restoreDefaults}` | `type="button"` |
| A006 | 249 / button | Cancelar rascunho | `onClick={clearChanges}` | `type="button"; disabled={!isDirty}` |
| A007 | 324 / button | {save.loading ? 'Salvando...' : 'Salvar perfil'} | `onClick={() => save.mutate(activePermissions)}` | `type="button"; disabled={!isDirty \|\| save.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 258 / input | `placeholder="Buscar permissao, grupo ou codigo..."; value={search}` |
| F002 | 303 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 165 / LoadingState | `label="Carregando permissoes globais..."` |

Legendas/opções encontradas em configurações: `Administracao`, `Permissoes que controlam o acesso mais sensivel da plataforma.`, `Ponto e jornada`, `Controle de batida, visao de equipe e aprovacao manual.`, `RH e documentos`, `Acesso a cadastro, arquivos e calculos operacionais.`, `Ajustes gerais`, `Acessos basicos para configuracoes e navegacao da plataforma.`.

Funções existentes: `GlobalPermissionsPage`, `selectRole`, `setDraft`, `togglePermission`, `restoreDefaults`, `clearAll`, `selectAll`, `clearChanges`.

### apps/web/app/[tenant]/dashboard/platform/plans/page.tsx

Origem: arquivo local.

Títulos: 90: {plan ? 'Editar Plano' : 'Novo Plano'}; 278: {plan.name}; 419: Planos organizados para crescer com a empresa; 462: Como a precificacao funciona; 491: Checklist do plano.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 91 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 223 / button | Cancelar | `onClick={onClose}` | `type="button"` |
| A003 | 224 / button | {save.loading ? 'Salvando...' : 'Salvar Plano'} | `onClick={() => save.mutate()}` | `type="button"; disabled={save.loading \|\| !isValid}` |
| A004 | 316 / button | Editar | `onClick={onEdit}` | `—` |
| A005 | 322 / button | "Desativar plano" | `onClick={onDeactivate}` | `—` |
| A006 | 332 / button | Reativar | `onClick={onReactivate}` | `—` |
| A007 | 338 / button | "Excluir permanentemente" | `onClick={onDelete}` | `—` |
| A008 | 425 / Link | Ver assinaturas | `href={ˋ/${tenant}/dashboard/platform/subscriptionsˋ}` | `—` |
| A009 | 432 / button | Novo Plano | `onClick={() => setIsCreating(true)}` | `—` |
| A010 | 518 / button | {showInactive ? <EyeOff size={12} /> : <Eye size={12} />} {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'} | `onClick={() => setShowInactive(v => !v)}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 101 / input | `type="text"; placeholder="Ex: Pro, Básico, Enterprise..."; value={form.name}` |
| F002 | 112 / textarea | `placeholder="Descreva o que está incluído no plano..."; value={form.description}` |
| F003 | 124 / input | `type="text"; disabled={form.isFree}; placeholder="199,90"; value={form.price}` |
| F004 | 136 / select | `value={form.cycle}` |
| F005 | 151 / input | `type="number"; value={form.maxUsers}` |
| F006 | 161 / input | `type="number"; value={form.maxEmployees}` |
| F007 | 174 / input | `type="checkbox"` |
| F008 | 184 / input | `type="checkbox"` |
| F009 | 208 / input | `type="checkbox"` |
| F010 | 467 / input | `placeholder="Buscar plano..."; value={search}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 541 / LoadingState | `label="Carregando planos..."` |

Legendas/opções encontradas em configurações: `Funcionários`, `Controle de Ponto`, `Férias`, `Painel de Gestão`, `Ativos`, `Gratuitos`, `Ocultos`, `Base mensal ativa`, `Valor base`, `Adicional por usuario`, `Gratuito / oculto`, `Vinculo com assinatura`.

Funções existentes: `parseMoney`, `formatBRL`, `normalizeText`, `PlanModal`, `toggleModule`, `PlanCard`, `PlansPage`, `handleDeactivate`, `handleReactivate`, `handleDeletePermanent`.

### apps/web/app/[tenant]/dashboard/platform/proposals/[id]/page.tsx

Origem: arquivo local.

Títulos: 53: Proposta {proposal.proposalNumber}; 68: Detalhes da Oferta; 92: Status da Assinatura.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 50 / button | (ícone/controle sem legenda estática) | `onClick={() => router.push(ˋ/${tenant}/dashboard/platform/proposalsˋ)}` | `—` |
| A002 | 58 / button | {loading ? 'Enviando...' : 'Enviar para Cliente'} | `onClick={handleSend}` | `disabled={loading}` |
| A003 | 111 / a | Abrir Link de Pagamento (Asaas) | `href={proposal.asaasPaymentLink}` | `—` |

Chamadas reconhecidas: `api.proposals.getStatus`, `api.proposals.send`.

Funções existentes: `ProposalDetailsPage`.

### apps/web/app/[tenant]/dashboard/platform/proposals/new/page.tsx

Origem: arquivo local.

Títulos: 68: Criar Nova Proposta.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 65 / button | (ícone/controle sem legenda estática) | `onClick={() => router.push(ˋ/${tenant}/dashboard/platform/proposalsˋ)}` | `—` |
| A002 | 72 / form | Empresa Cliente Selecione... {companies.map(c => ( <option key={c.id} value={c.id}>{c.name} ({c.document})</option> ))} Título da Proposta Data de Início Descrição Opcional Plano / SKU Startup Pro Enterprise Valor Mensal (R$) Limite de Usuários Admin Limite de Colaboradores {loading ? 'Salvando..… | `onSubmit={handleSubmit}` | `—` |
| A003 | 136 / button | {loading ? 'Salvando...' : 'Criar Proposta'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 76 / select | `value={formData.companyId}` |
| F002 | 92 / input | `value={formData.title}` |
| F003 | 96 / input | `type="date"; value={formData.startDate}` |
| F004 | 102 / input | `value={formData.description}` |
| F005 | 108 / select | `value={formData.planType}` |
| F006 | 120 / input | `type="number"; value={formData.monthlyPrice}` |
| F007 | 127 / input | `type="number"; value={formData.usersLimit}` |
| F008 | 131 / input | `type="number"; value={formData.employeesLimit}` |

Legendas/opções encontradas em configurações: `Proposta Comercial - Innovation RH`, `Serviços de RH e Ponto Eletrônico`.

Chamadas reconhecidas: `api.platform.listCompanies`, `api.proposals.create`.

Funções existentes: `NewProposalPage`.

### apps/web/app/[tenant]/dashboard/platform/proposals/page.tsx

Origem: arquivo local.

Títulos: 37: Propostas comerciais.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 39 / button | Atualizar | `onClick={loadProposals}` | `type="button"; disabled={loading}` |
| A002 | 40 / Link | Nova Proposta | `href={ˋ/${tenant}/dashboard/platform/proposals/newˋ}` | `—` |
| A003 | 47 / button | Tentar novamente | `onClick={loadProposals}` | `type="button"` |
| A004 | 79 / Link | Abrir | `href={ˋ/${tenant}/dashboard/platform/proposals/${p.id}ˋ}` | `—` |

Chamadas reconhecidas: `api.proposals.list`.

Funções existentes: `ProposalsPage`.

### apps/web/app/[tenant]/dashboard/platform/subscriptions/page.tsx

Origem: arquivo local.

Títulos: 229: Conta criada. Pagamento liberado. Renovacao auditada.; 284: Fluxo operacional da assinatura; 467: Auditoria pesada; 521: Como a assinatura cresce; 559: {selectedCompany.name}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 236 / button | Atualizar contexto | `onClick={load}` | `type="button"` |
| A002 | 244 / Link | Ir para empresas | `href={ˋ/${tenant}/dashboard/platform/companiesˋ}` | `—` |
| A003 | 325 / button | Limpar filtros | `onClick={() => { setSearch(''); setStatusFilter('ALL'); }}` | `type="button"` |
| A004 | 423 / button | Detalhes | `onClick={() => setSelectedCompanyId(company.id)}` | `type="button"` |
| A005 | 432 / a | Asaas | `href={ˋhttps://www.asaas.com/customer/view/${company.asaasCustomerId}ˋ}` | `—` |
| A006 | 442 / Link | Empresa | `href={ˋ/${tenant}/dashboard/platform/companies?search=${encodeURIComponent(company.name)}ˋ}` | `—` |
| A007 | 564 / button | Fechar | `onClick={() => setSelectedCompanyId(null)}` | `type="button"` |
| A008 | 614 / Link | Ver financeiro | `href={ˋ/${tenant}/dashboard/platform/finance?search=${encodeURIComponent(selectedCompany.name)}ˋ}` | `—` |
| A009 | 621 / Link | Abrir empresa | `href={ˋ/${tenant}/dashboard/platform/companies?search=${encodeURIComponent(selectedCompany.name)}ˋ}` | `—` |
| A010 | 629 / button | {workingCheckoutId === selectedCompany.id ? 'Gerando...' : 'Gerar cobrança'} | `onClick={() => runCheckout(selectedCompany)}` | `type="button"; disabled={workingCheckoutId === selectedCompany.id}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 309 / input | `placeholder="Buscar por empresa, plano ou contexto..."; value={search}` |
| F002 | 316 / select | `value={statusFilter}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 337 / LoadingState | `label="Carregando assinaturas, planos e auditoria..."` |

Legendas/opções encontradas em configurações: `Todos`, `Ativas`, `Trial`, `Aguardando pagamento`, `Em atraso`, `Canceladas`, `MRR real`, `Assinaturas ativas`, `Primeiro pagamento pendente`, `Inadimplentes`.

Chamadas reconhecidas: `api.platform.listCompanies`, `api.platform.listPlans`, `api.platform.finance.summary`, `api.platform.finance.billingAuditLogs`, `api.platform.finance.checkoutCompany`.

Funções existentes: `money`, `dateLabel`, `plainDate`, `normalizeText`, `formatAction`, `auditTone`, `statusTone`, `lifecycleLabel`, `planPricing`, `SubscriptionsPage`, `load`, `runCheckout`.

### apps/web/app/[tenant]/dashboard/platform/support/page.tsx

Origem: arquivo local.

Títulos: 350: Central de Suporte Operacional; 486: {ticket.subject \|\| ticket.title \|\| 'Chamado sem titulo'}; 559: {selectedTicket.subject \|\| selectedTicket.title}; 739: Acoes rapidas; 797: Empresa / Cliente {selectedTicket.company?.id && ( <Link href={`/dashboard/platform/companies/${selectedTicket.company.id}`} className="inline-flex items-center gap-0.5 text-[11px] font-bold text-purple-600 hover:text-purple-700" > Abrir <ArrowUpRight size={12} /> </Link> )}; 819: Solicitante; 836: Prazos SLA.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 362 / button | Atualizar | `onClick={loadTickets}` | `type="button"` |
| A002 | 382 / button | {tab.label} {tab.count} | `onClick={() => setActiveTab(tab.id)}` | `type="button"` |
| A003 | 442 / button | Tentar novamente | `onClick={loadTickets}` | `type="button"` |
| A004 | 461 / button | {ticket.ticketNumber \|\| ticket.id} {getStatusBadge(ticket.status)} {ticket.priority === 'CRITICAL' && ( <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white animate-pulse"> <ShieldAlert size={12} /> Crítico 2… | `onClick={() => void handleSelectTicket(ticket)}` | `type="button"` |
| A005 | 547 / button | (ícone/controle sem legenda estática) | `onClick={() => setSelectedTicket(null)}` | `type="button"` |
| A006 | 592 / button | {attachment.originalName} {formatFileSize(Number(attachment.sizeBytes \|\| 0))} · {attachment.status === 'CLEAN' ? 'Verificado' : attachment.status === 'QUARANTINED' ? 'Em verificacao' : 'Bloqueado'} | `onClick={() => void handleDownloadAttachment(attachment)}` | `type="button"; disabled={attachment.status === 'REJECTED'}` |
| A007 | 667 / button | Resposta publica | `onClick={() => setIsInternalNote(false)}` | `type="button"` |
| A008 | 680 / button | Nota interna DEV | `onClick={() => setIsInternalNote(true)}` | `type="button"` |
| A009 | 719 / button | {sendingReply ? 'Enviando...' : isInternalNote ? 'Salvar nota interna' : 'Enviar resposta publica'} | `onClick={handleSendReply}` | `type="button"; disabled={sendingReply \|\| !replyText.trim()}` |
| A010 | 742 / button | Assumir este chamado | `onClick={handleAssignToMe}` | `type="button"; disabled={updatingStatus}` |
| A011 | 774 / button | Resolver | `onClick={handleResolveTicket}` | `type="button"; disabled={updatingStatus \|\| selectedTicket.status === 'RESOLVED' \|\| selectedTicket.status === 'CLOSED'}` |
| A012 | 782 / button | Reabrir | `onClick={() => void handleUpdateStatus('REOPENED')}` | `type="button"; disabled={updatingStatus \|\| !['RESOLVED', 'CLOSED'].includes(selectedTicket.status)}` |
| A013 | 800 / Link | Abrir | `href={ˋ/dashboard/platform/companies/${selectedTicket.company.id}ˋ}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 419 / input | `type="text"; placeholder="Buscar por numero do chamado, assunto ou empresa..."; value={search}` |
| F002 | 577 / input | `type="file"` |
| F003 | 701 / textarea | `placeholder={ isInternalNote ? 'Digite uma anotacao tecnica interna para a equipe DEV...' : 'Digite a resposta oficial que sera enviada por e-mail e exibida ao cliente...' }; value={replyText}` |
| F004 | 761 / select | `disabled={updatingStatus}; value={selectedTicket.status}` |

Legendas/opções encontradas em configurações: `Novo`, `Em triagem`, `Em atendimento`, `Aguardando cliente`, `Aguardando deploy`, `Resolvido`, `Fechado`, `Reaberto`, `Todos`, `Sem responsável`, `Críticos / altos`, `SLA em risco`, `Reabertos`.

Chamadas reconhecidas: `api.platformSupport.list`, `api.platformSupport.get`, `api.platformSupport.internalNote`, `api.platformSupport.reply`, `api.platformSupport.assign`, `api.platformSupport.updateStatus`, `api.platformSupport.resolve`, `api.support.uploadAttachment`, `api.support.downloadAttachment`.

Funções existentes: `formatFileSize`, `PlatformSupportPage`.

### apps/web/app/[tenant]/dashboard/platform/whatsapp/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

### apps/web/app/[tenant]/dashboard/ponto/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `PontoPage`.

### apps/web/app/[tenant]/dashboard/reports/page.tsx

Origem: arquivo local.

Títulos: 11: Relatórios e BI; 54: Preview do Relatório.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 14 / button | Exportar CSV | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="button"` |

Funções existentes: `ReportsPage`.

### apps/web/app/[tenant]/dashboard/rh/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `RhPage`.

### apps/web/app/[tenant]/dashboard/settings/_components/company-finance-section.tsx

Origem: arquivo local.

Títulos: 90: Gestão Financeira; 112: {billing.plan?.name \|\| 'Carregando...'}; 213: Escolha seu novo plano; 233: {plan.name}; 286: Confirmar alteração de plano?; 299: Histórico de Pagamentos e Notas Fiscais.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 154 / button | Pagar Fatura Aberta | `onClick={payInvoice}` | `type="button"` |
| A002 | 162 / button | {isChangingPlan ? 'Cancelar Troca' : 'Alterar Plano'} | `onClick={() => setIsChangingPlan(!isChangingPlan)}` | `type="button"` |
| A003 | 263 / button | {billing.plan?.id === plan.id ? 'Seu Plano' : (changePlan.loading ? 'Processando...' : 'Mudar para este')} | `onClick={() => setPendingPlanId(plan.id)}` | `type="button"; disabled={billing.plan?.id === plan.id \|\| changePlan.loading}` |
| A004 | 289 / button | Cancelar | `onClick={() => setPendingPlanId(null)}` | `type="button"; disabled={changePlan.loading}` |
| A005 | 290 / button | {changePlan.loading ? 'Processando...' : 'Confirmar alteração'} | `onClick={() => { const planId = pendingPlanId; setPendingPlanId(null); changePlan.mutate(planId); }}` | `type="button"; disabled={changePlan.loading}` |
| A006 | 337 / a | Ver Fatura | `href={invoice.invoiceUrl}` | `—` |
| A007 | 347 / a | NF (PDF) | `href={invoice.fiscalPdfUrl}` | `—` |
| A008 | 357 / a | NF (XML) | `href={invoice.fiscalXmlUrl}` | `—` |

Chamadas reconhecidas: `api.request`.

Funções existentes: `CompanyFinanceSection`, `payInvoice`.

### apps/web/app/[tenant]/dashboard/settings/_components/employee-password-reset-section.tsx

Origem: arquivo local.

Títulos: 153: Redefinir senha de funcionário.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 205 / button | {employee.name} Matrícula: {employee.registration \|\| 'Não informada'} {employee.position ? ` • ${employee.position}` : ''} | `onClick={() => { setSelected(employee); setResults([]); }}` | `type="button"` |
| A002 | 295 / button | {saving ? 'Redefinindo...' : 'Redefinir senha do funcionário'} | `onClick={resetPassword}` | `type="button"; disabled={!valid \|\| saving}` |
| A003 | 306 / button | Cancelar | `onClick={() => { setSelected(null); setSearch(''); setNewPassword(''); setConfirmPassword(''); }}` | `type="button"` |
| A004 | 358 / button | {show ? <EyeOff size={16} /> : <Eye size={16} />} | `onClick={onToggle}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 184 / input | `placeholder="Digite o nome ou a matrícula..."; value={search}` |
| F002 | 351 / input | `type={show ? 'text' : 'password'}; value={value}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 252 / PasswordField | `label="Senha temporária"; value={newPassword}` |
| C002 | 262 / PasswordField | `label="Confirmar senha"; value={confirmPassword}` |

Chamadas reconhecidas: `api.auth.searchEmployeesForPasswordReset`, `api.auth.resetEmployeePassword`.

Funções existentes: `EmployeePasswordResetSection`, `resetPassword`, `PasswordField`.

### apps/web/app/[tenant]/dashboard/settings/_components/platform-plans-section.tsx

Origem: arquivo local.

Títulos: 18: Gestão dos planos da plataforma.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 42 / Link | Gerenciar planos | `href={ˋ/${tenant}/dashboard/platform/plansˋ}` | `—` |

Funções existentes: `PlatformPlansSection`.

### apps/web/app/[tenant]/dashboard/settings/page.tsx

Origem: arquivo local.

Títulos: 69: {pageTitle} — "Gerencie apenas as opções permitidas para o seu perfil."; 164: Segurança da conta; 374: Dados cadastrais e contratuais; 432: Endereço Completo; 467: Representante Legal; 624: Importar / Exportar dados.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 78 / button | {tab.label} | `onClick={() => setActiveTab(tab.id)}` | `—` |
| A002 | 178 / button | {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />} | `onClick={() => setShowPasswords(!showPasswords)}` | `type="button"` |
| A003 | 215 / button | {loading ? 'Salvando...' : 'Alterar senha'} | `onClick={handleSubmit}` | `type="button"; disabled={!valid \|\| loading}` |
| A004 | 394 / button | Remover logo | `onClick={() => setRemoveLogo(true)}` | `type="button"` |
| A005 | 525 / button | {save.loading ? 'Salvando...' : 'Salvar configurações'} | `onClick={() => !logoError && save.mutate().catch(() => {})}` | `type="button"; disabled={Boolean(logoError) \|\| save.loading \|\| company.loading \|\| !hasChanges}` |
| A006 | 634 / ExportButton | "Funcionários" | `onClick={() => handleExport('employees')}` | `—` |
| A007 | 635 / ExportButton | "Pontos" | `onClick={() => handleExport('time-track')}` | `—` |
| A008 | 636 / ExportButton | "Férias" | `onClick={() => handleExport('vacations')}` | `—` |
| A009 | 637 / ExportButton | "Usuários" | `onClick={() => handleExport('users')}` | `—` |
| A010 | 645 / a | Baixar Modelo XLSX | `href={ˋ${process.env.NEXT_PUBLIC_API_URL \|\| '/api'}/employees/import/templateˋ}` | `—` |
| A011 | 675 / button | {importing ? 'Importando...' : <><Upload size={14} strokeWidth={2.5} /> Importar</>} | `onClick={handleImport}` | `disabled={!importFile \|\| importing}` |
| A012 | 714 / button | {label} | `onClick={onClick}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 177 / input | `type={showPasswords ? 'text' : 'password'}; value={currentPassword}` |
| F002 | 186 / input | `type={showPasswords ? 'text' : 'password'}; value={newPassword}` |
| F003 | 207 / input | `type={showPasswords ? 'text' : 'password'}; value={confirmPassword}` |
| F004 | 403 / input | `disabled={company.loading}; value={name}` |
| F005 | 407 / input | `disabled={company.loading}; value={legalName}` |
| F006 | 411 / input | `disabled={company.loading}; placeholder="00.000.000/0000-00"; value={document}` |
| F007 | 415 / input | `disabled={company.loading}; placeholder="+55 11 90000-0000"; value={phone}` |
| F008 | 419 / input | `type="email"; disabled={company.loading}; placeholder="contato@empresa.com"; value={email}` |
| F009 | 423 / input | `disabled={company.loading}; value={stateRegistration}` |
| F010 | 427 / input | `disabled={company.loading}; value={municipalRegistration}` |
| F011 | 436 / input | `disabled={company.loading}; value={zipCode}` |
| F012 | 440 / input | `disabled={company.loading}; value={street}` |
| F013 | 444 / input | `disabled={company.loading}; value={streetNumber}` |
| F014 | 448 / input | `disabled={company.loading}; value={addressComplement}` |
| F015 | 452 / input | `disabled={company.loading}; value={neighborhood}` |
| F016 | 456 / input | `disabled={company.loading}; value={city}` |
| F017 | 460 / input | `disabled={company.loading}; value={state}` |
| F018 | 471 / input | `disabled={company.loading}; value={legalRepresentativeName}` |
| F019 | 475 / input | `disabled={company.loading}; value={legalRepresentativeCpf}` |
| F020 | 479 / input | `disabled={company.loading}; value={legalRepresentativeRole}` |
| F021 | 483 / input | `type="email"; disabled={company.loading}; value={legalRepresentativeEmail}` |
| F022 | 487 / input | `disabled={company.loading}; value={legalRepresentativePhone}` |
| F023 | 497 / input | `type="file"` |
| F024 | 516 / input | `disabled={company.loading}; placeholder="https://seudominio.com/logo.png ou faça o upload..."; value={removeLogo ? '' : logoUrl}` |
| F025 | 668 / input | `type="file"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 634 / ExportButton | `label="Funcionários"` |
| C002 | 635 / ExportButton | `label="Pontos"` |
| C003 | 636 / ExportButton | `label="Férias"` |
| C004 | 637 / ExportButton | `label="Usuários"` |

Legendas/opções encontradas em configurações: `Segurança & Acesso`, `Acessos de Funcionários`, `Financeiro e Faturamento`, `Planos e Limites`, `Configurações da Empresa`, `Importação e Exportação`.

Chamadas reconhecidas: `api.companies.me`, `api.companies.update`, `api.employees.list`, `api.timeTrack.list`, `api.vacations.list`, `api.request`.

Funções existentes: `SettingsPage`, `PasswordChangeSection`, `handleSubmit`, `CompanySettings`, `ImportExportSection`, `handleExport`, `handleImport`, `ExportButton`, `downloadCSV`, `formatCnpj`, `validateLogoUrl`.

### apps/web/app/[tenant]/dashboard/support/_components/ticket-wizard-slideover.tsx

Origem: arquivo local.

Títulos: 59: Novo chamado; 70: 1. Qual é o motivo do chamado?; 87: 2. Qual o impacto para sua operação?; 109: 3. Conte o que aconteceu; 135: 4. Adicione evidências (opcional).

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 62 / button | "Fechar novo chamado" | `onClick={onClose}` | `—` |
| A002 | 72 / button | {cat.label} | `onClick={() => setCategory(cat.value)}` | `—` |
| A003 | 94 / button | {pri.label} | `onClick={() => setPriority(pri.value)}` | `—` |
| A004 | 158 / button | {`Remover ${file.name}`} | `onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}` | `—` |
| A005 | 175 / ButtonSecondary | Voltar | `onClick={prevStep}` | `type="button"; disabled={creating}` |
| A006 | 183 / ButtonPrimary | Avançar | `onClick={nextStep}` | `type="button"` |
| A007 | 187 / ButtonPrimary | {creating ? 'Registrando...' : 'Finalizar e Abrir'} | `onClick={handleSubmit}` | `type="button"; disabled={creating}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 112 / input | `type="text"; placeholder="Ex: Erro ao gerar espelho de ponto"; value={title}` |
| F002 | 122 / textarea | `placeholder="Descreva o problema com o máximo de detalhes possível..."; value={description}` |
| F003 | 140 / input | `type="file"` |

Legendas/opções encontradas em configurações: `Acesso e senha`, `Erro ou instabilidade`, `Financeiro e assinatura`, `Sugestão de melhoria`, `Outra dúvida`, `Baixa (Pode esperar)`, `Normal (Dúvida comum)`, `Alta (Impacta meu trabalho)`, `Crítica (Sistema parado)`.

Funções existentes: `TicketWizardSlideover`.

### apps/web/app/[tenant]/dashboard/support/page.tsx

Origem: arquivo local.

Títulos: 264: Central de Suporte ao Cliente; 367: {ticket.title \|\| ticket.subject}; 409: {selectedTicket.title \|\| selectedTicket.subject}; 504: Histórico de respostas; 639: Encerrar este chamado?.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 278 / button | Atualizar | `onClick={loadTickets}` | `—` |
| A002 | 285 / button | Abrir novo chamado | `onClick={() => setShowModal(true)}` | `—` |
| A003 | 348 / button | {ticket.ticketNumber \|\| ticket.id} {getStatusBadge(ticket.status)} {ticket.priority === 'CRITICAL' && ( <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700"> Urgência máxima </span> )} {ticket.title \|\| ticket.subject} Solicitado por: … | `onClick={() => void loadTicketDetail(ticket)}` | `type="button"` |
| A004 | 401 / button | (ícone/controle sem legenda estática) | `onClick={() => setSelectedTicket(null)}` | `—` |
| A005 | 414 / button | "Fechar detalhes do chamado" | `onClick={() => setSelectedTicket(null)}` | `—` |
| A006 | 478 / button | {attachment.originalName} {(Number(attachment.sizeBytes \|\| 0) / 1024).toFixed(1)} KB · {' '} {attachment.status === 'CLEAN' ? 'Verificado' : attachment.status === 'QUARANTINED' ? 'Em verificação' : 'Bloqueado'} | `onClick={() => void handleDownloadAttachment(attachment.id)}` | `type="button"; disabled={attachment.status === 'REJECTED'}` |
| A007 | 557 / button | {sendingReply ? 'Enviando...' : 'Enviar resposta'} | `onClick={handleSendReply}` | `type="button"; disabled={sendingReply \|\| !replyText.trim()}` |
| A008 | 568 / button | Encerrar chamado | `onClick={() => setShowCloseConfirm(true)}` | `type="button"` |
| A009 | 575 / button | Abrir novo chamado | `onClick={() => setShowModal(true)}` | `type="button"` |
| A010 | 587 / button | Reabrir chamado | `onClick={handleReopenTicket}` | `type="button"` |
| A011 | 594 / button | Abrir novo chamado | `onClick={() => setShowModal(true)}` | `type="button"` |
| A012 | 642 / button | Continuar atendendo | `onClick={() => setShowCloseConfirm(false)}` | `type="button"` |
| A013 | 643 / button | Encerrar chamado | `onClick={() => void handleCloseTicket()}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 309 / input | `type="text"; placeholder="Buscar por código, assunto, empresa ou responsável..."; value={search}` |
| F002 | 323 / select | `value={statusFilter}` |
| F003 | 548 / textarea | `placeholder="Escreva sua mensagem aqui..."; value={replyText}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 340 / LoadingState | `label="Carregando seus chamados..."` |

Legendas/opções encontradas em configurações: `Aberto`, `Triagem`, `Em andamento`, `Cliente`, `Resolvido`, `Fechado`, `Quem abriu`, `Empresa`, `Responsável`, `Categoria`.

Chamadas reconhecidas: `api.support.list`, `api.support.stats`, `api.support.get`, `api.support.create`, `api.support.uploadAttachment`, `api.support.reply`, `api.support.close`, `api.support.reopen`, `api.support.downloadAttachment`.

Funções existentes: `getStatusBadge`, `CustomerSupportPage`, `SupportPage`.

### apps/web/app/[tenant]/dashboard/time-track/clock-in/page.tsx

Origem: arquivo local.

Títulos: 265: Este perfil não bate ponto; 280: {success}; 291: Bater ponto; 335: {isBiometricRequired ? <><Camera size={16} className="text-brand"/> Bater Ponto com Facial</> : <><CameraOff size={16} className="text-slate-400"/> Bater Ponto Simples</>}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 267 / button | Voltar | `onClick={() => router.push(ˋ/${tenant}/dashboard/escalas/pontoˋ)}` | `—` |
| A002 | 302 / button | (ícone/controle sem legenda estática) | `onClick={() => updateCompanyMut.mutate(!isBiometricRequired)}` | `disabled={updateCompanyMut.loading}` |
| A003 | 347 / button | {nextPunchLabel[nextPunchType]} | `onClick={() => handlePunch(nextPunchType)}` | `disabled={punch.loading \|\| enroll.loading}` |
| A004 | 372 / button | Lançamento manual {showManual ? 'Fechar' : 'Abrir'} | `onClick={() => setShowManual(!showManual)}` | `—` |
| A005 | 406 / button | Enviar Registro | `onClick={handleManualPunch}` | `disabled={!manualTime \|\| punch.loading}` |
| A006 | 416 / button | Voltar para a folha de ponto | `onClick={() => router.push(ˋ/${tenant}/dashboard/escalas/pontoˋ)}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 383 / select | `value={manualType}` |
| F002 | 392 / select | `value={manualReason}` |
| F003 | 398 / input | `type="date"; value={manualDate}` |
| F004 | 402 / input | `type="time"; value={manualTime}` |

Legendas/opções encontradas em configurações: `Esquecimento de registro`, `Problema no sistema`, `Trabalho externo`, `Outro motivo`.

Chamadas reconhecidas: `api.companies.me`, `api.companies.update`, `api.employees.list`, `api.timeTrack.listEmployeeMonth`, `api.timeTrack.enrollFacial`, `api.timeTrack.manual`, `api.timeTrack.register`, `api.timeTrack.clockInFacial`.

Funções existentes: `useGeolocation`, `MapView`, `ClockDisplay`, `ClockInPage`.

### apps/web/app/[tenant]/dashboard/time-track/closing/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `TimeClosingRedirect`.

### apps/web/app/[tenant]/dashboard/time-track/occurrences/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `TimeOccurrencesRedirect`.

### apps/web/app/[tenant]/dashboard/time-track/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `TimeTrackRedirectPage`.

### apps/web/app/[tenant]/dashboard/time-track/rules/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `WorkScheduleRulesRedirect`.

### apps/web/app/[tenant]/dashboard/time-tracking/page.tsx

Origem: arquivo local.

Títulos: 9: Batida de Ponto.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 23 / Button | Bater Ponto | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |

Funções existentes: `TimeTrackingPage`.

### apps/web/app/[tenant]/dashboard/users/_components/user-actions-menu.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 53 / button | Editar | `onClick={() => onEdit(user)}` | `—` |
| A002 | 61 / button | {`Mais ações para ${user.name}`} | `onClick={() => setOpen(!open)}` | `—` |
| A003 | 71 / button | Redefinir senha | `onClick={() => { setOpen(false); onResetPassword(user); }}` | `—` |
| A004 | 81 / button | {isBlocked ? ( <> <CheckCircle2 size={14} /> Desbloquear acesso </> ) : ( <> <Ban size={14} /> Bloquear acesso </> )} | `onClick={() => { setOpen(false); onToggleBlock(user); }}` | `—` |
| A005 | 99 / button | Baixar termo | `onClick={() => { setOpen(false); onDownloadTerm(user); }}` | `—` |
| A006 | 109 / button | Ver histórico | `onClick={() => { setOpen(false); onHistory(user); }}` | `—` |
| A007 | 121 / button | Excluir acesso | `onClick={() => { setOpen(false); onDelete(user); }}` | `—` |

Funções existentes: `UserActionsMenu`, `handleClickOutside`.

### apps/web/app/[tenant]/dashboard/users/_components/user-create-modal.tsx

Origem: arquivo local.

Títulos: 150: Usuário criado com sucesso!; 185: Novo usuario.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 161 / button | Fechar | `onClick={handleClose}` | `—` |
| A002 | 164 / button | Criar outro | `onClick={() => { resetForm(); }}` | `—` |
| A003 | 188 / button | "Fechar cadastro de usuário" | `onClick={handleClose}` | `—` |
| A004 | 197 / form | Resumo do novo acesso {selectedCompany ? `Empresa: ${selectedCompany.name}. ` : 'Empresa sera definida no envio. '} O acesso sera criado com senha temporaria e obrigara troca no primeiro login. {shouldShowCompanySelect && ( <div> <label className="mb-1 block text-xs font-bold text-slate-700">Empr… | `onSubmit={handleSubmit}` | `—` |
| A005 | 330 / button | Cancelar | `onClick={handleClose}` | `type="button"; disabled={loading}` |
| A006 | 338 / button | {loading ? 'Criando...' : 'Criar usuario'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 210 / select | `value={companyId}` |
| F002 | 226 / input | `type="hidden"; value={defaultCompanyId}` |
| F003 | 231 / input | `type="text"; value={name}` |
| F004 | 242 / input | `type="email"; value={email}` |
| F005 | 262 / select | `value={role}` |
| F006 | 283 / input | `type="radio"` |
| F007 | 289 / input | `type="password"; placeholder="Senha temporaria"; value={password}` |
| F008 | 300 / input | `type="password"; placeholder="Confirmar senha"; value={confirmPassword}` |

Funções existentes: `PasswordStrengthBar`, `UserCreateModal`.

### apps/web/app/[tenant]/dashboard/users/_components/user-drawer.tsx

Origem: arquivo local.

Títulos: 174: Detalhes do usuário.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 168 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A002 | 177 / button | "Fechar detalhes do usuário" | `onClick={onClose}` | `—` |
| A003 | 188 / button | {tab.label} | `onClick={() => { setActiveTab(tab.id as TabType); setFeedback(null); }}` | `—` |
| A004 | 280 / button | {isSaving ? 'Salvando...' : 'Salvar alterações'} | `onClick={handleSaveGeneral}` | `type="button"; disabled={isSaving \|\| !geralDirty}` |
| A005 | 363 / button | Restaurar padrão | `onClick={() => { setIsCustomPerms(false); setCustomPerms(getDefaultPermissions(user.role)); }}` | `—` |
| A006 | 373 / button | {isSaving ? 'Salvando...' : 'Salvar permissões'} | `onClick={handleSavePerms}` | `disabled={isSaving \|\| !permsDirty}` |
| A007 | 426 / button | Redefinir senha temporária | `onClick={onResetPassword}` | `—` |
| A008 | 432 / button | {user.isActive === false ? 'Desbloquear acesso da conta' : 'Bloquear acesso da conta'} | `onClick={onToggleBlock}` | `—` |
| A009 | 486 / button | Abrir cadastro do funcionário | `onClick={() => { if (tenant && user.employee?.id) { router.push(ˋ/${tenant}/dashboard/employeesˋ); onClose(); } }}` | `—` |
| A010 | 509 / button | Ir para Funcionários | `onClick={() => { router.push(ˋ/${tenant}/dashboard/employeesˋ); onClose(); }}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 213 / input | `type="text"; value={name}` |
| F002 | 222 / input | `type="email"; value={email}` |
| F003 | 231 / select | `value={role}` |
| F004 | 247 / input | `type="text"; disabled=(true); value={user.company?.name ?? '-'}` |
| F005 | 254 / input | `type="text"; disabled=(true); value={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('pt-BR') : 'Nunca acessou'}` |
| F006 | 263 / input | `type="text"; disabled=(true); value={user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '-'}` |
| F007 | 306 / input | `type="radio"` |
| F008 | 318 / input | `type="radio"` |
| F009 | 339 / input | `type="checkbox"; disabled={!isCustomPerms}` |

Legendas/opções encontradas em configurações: `Geral`, `Permissões`, `Segurança`, `Vínculo`.

Funções existentes: `UserDrawer`.

### apps/web/app/[tenant]/dashboard/users/_components/user-filters.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 123 / button | Limpar | `onClick={clearFilters}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 50 / input | `type="text"; placeholder="Buscar por nome ou e-mail..."; value={filters.search}` |
| F002 | 62 / select | `value={filters.company}` |
| F003 | 81 / select | `value={filters.role}` |
| F004 | 97 / select | `value={filters.status}` |
| F005 | 111 / select | `value={filters.link}` |

Funções existentes: `UserFilters`.

### apps/web/app/[tenant]/dashboard/users/_components/user-password-reset-modal.tsx

Origem: arquivo local.

Títulos: 60: Redefinir senha.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 61 / button | "Fechar redefinição de senha" | `onClick={onClose}` | `—` |
| A002 | 81 / button | {showPassword ? 'Ocultar senha' : 'Mostrar senha'} | `onClick={() => setShowPassword(!showPassword)}` | `type="button"` |
| A003 | 98 / button | Cancelar | `onClick={onClose}` | `—` |
| A004 | 101 / button | {loading ? 'Redefinindo...' : 'Confirmar'} | `onClick={handleReset}` | `disabled={loading \|\| !passwordIsStrong}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 74 / input | `type={showPassword ? 'text' : 'password'}; placeholder="Mínimo 10 caracteres"; value={newPassword}` |

Funções existentes: `UserPasswordResetModal`, `handleReset`.

### apps/web/app/[tenant]/dashboard/users/_components/users-table.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 155 / UserActionsMenu | (ícone/controle sem legenda estática) | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |

Funções existentes: `getInitials`, `formatLastActive`, `UsersTable`.

### apps/web/app/[tenant]/dashboard/users/page.tsx

Origem: arquivo local.

Títulos: 40: {title}; 282: Usuários e acessos.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 45 / button | Cancelar | `onClick={onCancel}` | `disabled={loading}` |
| A002 | 48 / button | {loading ? 'Aguarde...' : confirmLabel} | `onClick={onConfirm}` | `disabled={loading}` |
| A003 | 286 / button | Novo usuário | `onClick={() => setCreateOpen(true)}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 293 / LoadingState | `label="Carregando usuários..."` |

Chamadas reconhecidas: `api.users.list`, `api.users.usage`, `api.platform.listCompanies`, `api.users.delete`, `api.users.update`, `api.users.create`, `api.users.resetPassword`.

Funções existentes: `ConfirmModal`, `getAvailableRoles`, `canManageRow`, `UsersPage`.

### apps/web/app/[tenant]/dashboard/vacations/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 263: {isGestor ? 'FÃƒÂ©rias da equipe' : 'SolicitaÃƒÂ§ÃƒÂµes'}; 314: Avisos de FÃƒÆ’Ã‚Â©rias ObrigatÃƒÆ’Ã‚Â³rias (CLT); 676: Nova solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de fÃƒÆ’Ã‚Â©rias.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 269 / button | Nova solicitaÃƒÂ§ÃƒÂ£o | `onClick={() => setOpen(true)}` | `—` |
| A002 | 290 / button | Ativas ( {activeRows.length} ) | `onClick={() => setTab('active')}` | `—` |
| A003 | 291 / button | Recusadas ( {rejectedRows.length} ) | `onClick={() => setTab('rejected')}` | `—` |
| A004 | 292 / button | HistÃƒÆ’Ã‚Â³rico ( {historyRows.length} ) | `onClick={() => setTab('history')}` | `—` |
| A005 | 294 / button | Avisos ( {alertEmployees.length} ) | `onClick={() => setTab('alerts')}` | `—` |
| A006 | 302 / button | Aprovar {selectedRows.length} selecionada(s) | `onClick={handleBulkApprove}` | `—` |
| A007 | 494 / button | Aprovar | `onClick={() => updateStatus.mutate({ id: row.id, status: 'APPROVED' }).catch(() => {})}` | `—` |
| A008 | 501 / button | Rejeitar | `onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' }).catch(() => {})}` | `—` |
| A009 | 513 / button | {receiptDownloadingId === row.id ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} strokeWidth={2.5} />} {receiptDownloadingId === row.id ? 'Emitindo...' : 'Recibo oficial'} | `onClick={() => handleDownloadReceipt(row)}` | `disabled={receiptDownloadingId === row.id}` |
| A010 | 554 / button | (ícone/controle sem legenda estática) | `onClick={() => setReceiptError(null)}` | `—` |
| A011 | 677 / button | (ícone/controle sem legenda estática) | `onClick={onClose}` | `—` |
| A012 | 880 / button | Cancelar | `onClick={onClose}` | `—` |
| A013 | 881 / button | {create.loading ? 'Enviando...' : 'Solicitar'} | `onClick={() => valid && create.mutate().catch(() => {})}` | `disabled={!valid \|\| create.loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 400 / input | `type="checkbox"; disabled={activeRows.length === 0}; aria-label="Selecionar fÃ©rias pendentes"` |
| F002 | 431 / input | `type="checkbox"; disabled={row.status !== 'PENDING'}` |
| F003 | 687 / select | `value={form.employeeId}` |
| F004 | 779 / input | `value={form.acquisitionPeriod}` |
| F005 | 789 / input | `type="date"; value={form.startDate}` |
| F006 | 799 / input | `type="date"; value={form.endDate}` |
| F007 | 855 / input | `type="checkbox"` |
| F008 | 870 / input | `placeholder="Motivo ou informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar"; value={observation}` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 276 / StatCard | `label="Pendentes"; value={pendingCount}` |
| C002 | 277 / StatCard | `label="Aprovadas"; value={approvedCount}` |
| C003 | 278 / StatCard | `label="ConcluÃƒÆ’Ã‚Â­das"; value={completedCount}` |
| C004 | 279 / StatCard | `label="Rejeitadas"; value={rejectedCount}` |
| C005 | 389 / LoadingState | `label="Carregando solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes..."` |

Chamadas reconhecidas: `api.vacations.list`, `api.employees.list`, `api.vacations.updateStatus`, `api.vacations.create`.

Funções existentes: `monthDiff`, `calcEligibility`, `VacationsPage`, `hasConflict`, `handleSelectAll`, `handleSelect`, `handleBulkApprove`, `handleDownloadReceipt`, `StatCard`, `diffDays`, `NewVacationModal`, `employeeOptionLabel`.

### apps/web/app/[tenant]/dashboard/whatsapp/page.tsx

Origem: arquivo local.

Títulos: 21: Comunicação WhatsApp; 90: Conectar dispositivo; 122: Como conectar; 133: Após conectar; 202: Conversas.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 26 / button | {disconnect.loading ? <Loader2 className="animaté-spin" size={14} /> : <Power size={14} />} Desconectar | `onClick={() => disconnect.mutate().catch(() => {})}` | `disabled={disconnect.loading}` |
| A002 | 106 / button | {connect.loading ? <Loader2 className="animaté-spin" size={14} /> : <Power size={14} />} Iniciar conexão | `onClick={() => connect.mutate().catch(() => {})}` | `disabled={connect.loading}` |
| A003 | 114 / button | (ícone/controle sem legenda estática) | `onClick={onRefresh}` | `—` |
| A004 | 204 / button | "Atualizar" | `onClick={onRefresh}` | `—` |
| A005 | 225 / button | Tudo | `onClick={() => setFilter('all')}` | `—` |
| A006 | 233 / button | Não lidas | `onClick={() => setFilter('unread')}` | `—` |
| A007 | 241 / button | Grupos | `onClick={() => setFilter('groups')}` | `—` |
| A008 | 262 / button | {chat.avatarUrl ? ( <img src={chat.avatarUrl} alt={chat.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> ) : chat.isGroup ? ( <Users size={24} /> ) : ( <Smartphone size={24} /> )} {chat.name} {chat.time} {cha… | `onClick={() => onSelect(chat.id)}` | `—` |
| A009 | 371 / button | (ícone/controle sem legenda estática) | `onClick={onBack}` | `—` |
| A010 | 450 / button | (ícone/controle sem legenda estática) | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A011 | 453 / button | "Anexar" | `onClick={() => fileInputRef.current?.click()}` | `—` |
| A012 | 467 / button | (ícone/controle sem legenda estática) | `onClick={() => setAttachment(null)}` | `—` |
| A013 | 485 / button | {send.loading ? <Loader2 className="animaté-spin" size={20} /> : <Send size={24} />} | `onClick={handleSend}` | `disabled={send.loading \|\| (!draft.trim() && !attachment)}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 214 / input | `placeholder="Pesquisar ou começar uma nova conversa"; value={search}` |
| F002 | 449 / input | `type="file"` |
| F003 | 472 / input | `placeholder={attachment ? "Adicione uma legenda..." : "Digite uma mensagem"}; value={draft}` |

Chamadas reconhecidas: `api.whatsapp.status`, `api.whatsapp.disconnect`, `api.qrserver.com`, `api.whatsapp.connect`, `api.whatsapp.chats`, `api.whatsapp.chatMessages`, `api.whatsapp.sendMessage`.

Funções existentes: `WhatsappPage`, `ConnectionPill`, `QrImage`, `ConnectionPanel`, `ChatWorkspace`, `ChatList`, `ChatThread`, `handleSend`, `handleFileSelect`.

### apps/web/app/[tenant]/fatura-pendente/page.tsx

Origem: arquivo local.

Títulos: 111: {isAdmin ? 'Regularize para liberar o acesso' : 'Acesso temporariamente bloqueado'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 142 / button | Pagar agora no Asaas | `onClick={() => window.location.assign(invoiceLink)}` | `—` |
| A002 | 146 / button | {creating ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />} Gerar link de pagamento | `onClick={() => generateCheckout()}` | `disabled={creating}` |
| A003 | 151 / button | {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Já paguei, verificar agora | `onClick={() => loadStatus(true)}` | `disabled={checking}` |
| A004 | 160 / button | Sair da conta | `onClick={logout}` | `—` |

Chamadas reconhecidas: `api.companyBilling.status`, `api.companyBilling.checkout`.

Funções existentes: `FaturaPendentePage`, `paymentLinkFrom`, `loadStatus`, `generateCheckout`, `FaturaPendentePageWrapper`.

### apps/web/app/[tenant]/parceiros/layout.tsx

Origem: arquivo local.

Títulos: 17: Portal do Parceiro.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 19 / Link | Sair | `href="/login"` | `—` |

Funções existentes: `ParceirosLayout`.

### apps/web/app/[tenant]/parceiros/page.tsx

Origem: arquivo local.

Títulos: 13: Portal do Parceiro.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 16 / button | Enviar Nota Fiscal | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |

Funções existentes: `ParceirosPage`.

### apps/web/app/[tenant]/portal/documentos/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 8: Meus Documentos.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `DocumentosPage`.

### apps/web/app/[tenant]/portal/ferias/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 8: Minhas FÃ©rias.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `FeriasPage`.

### apps/web/app/[tenant]/portal/holerites/page.tsx

Origem: Git HEAD (alterações locais preservadas).

Títulos: 14: Meus Holerites.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `HoleritesPage`.

### apps/web/app/[tenant]/portal/layout.tsx

Origem: arquivo local.

Títulos: 18: Innovation.ia.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 20 / Link | Início | `href={ˋ/${params.tenant}/portalˋ}` | `—` |
| A002 | 21 / Link | Holerites | `href={ˋ/${params.tenant}/portal/holeritesˋ}` | `—` |
| A003 | 22 / Link | Meu Ponto | `href={ˋ/${params.tenant}/portal/pontoˋ}` | `—` |
| A004 | 23 / Link | Férias | `href={ˋ/${params.tenant}/portal/feriasˋ}` | `—` |
| A005 | 24 / Link | Documentos | `href={ˋ/${params.tenant}/portal/documentosˋ}` | `—` |
| A006 | 28 / Link | Sair | `href="/login"` | `—` |

Funções existentes: `PortalLayout`.

### apps/web/app/[tenant]/portal/page.tsx

Origem: arquivo local.

Títulos: 16: Olá, {user?.name \|\| 'Colaborador'} ! 👋; 28: Comunicados Recentes; 31: Bem-vindo ao novo Portal!; 46: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 42 / Link | {title} {description} | `href={href}` | `—` |

Funções existentes: `PortalHomePage`, `PortalCard`.

### apps/web/app/[tenant]/portal/ponto/page.tsx

Origem: arquivo local.

Títulos: 15: Meu Ponto.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 18 / Link | Bater Ponto Agora | `href={ˋ/${tenant}/dashboard/time-track/clock-inˋ}` | `—` |

Funções existentes: `PontoPage`.

### apps/web/app/_components/pricing-section.tsx

Origem: arquivo local.

Títulos: 220: Planos Flexíveis e Transparentes; 373: {plan.name} {isRec && <ShieldCheck className="text-teal-400 shrink-0" size={24} />}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 229 / button | Mensal | `onClick={() => setSelectedCycle('MONTHLY')}` | `type="button"` |
| A002 | 240 / button | Trimestral 5% OFF | `onClick={() => setSelectedCycle('QUARTERLY')}` | `type="button"` |
| A003 | 251 / button | Semestral 8% OFF | `onClick={() => setSelectedCycle('SEMIANNUALLY')}` | `type="button"` |
| A004 | 262 / button | Anual 10% OFF | `onClick={() => setSelectedCycle('YEARLY')}` | `type="button"` |
| A005 | 326 / button | {shortcut.label} | `onClick={() => { setSeatQuantity(shortcut.val); onSeatQuantityChange?.(shortcut.val); }}` | `type="button"` |
| A006 | 504 / Link | Negociar com Suporte | `href={ˋ/suporte?subject=Negociacao+Enterprise+${seatQuantity}+licencas+Plano+${plan.name}ˋ}` | `—` |
| A007 | 511 / a | 💬 Falar no WhatsApp VIP | `href={ˋhttps://wa.me/5511999999999?text=${encodeURIComponent(ˋOlá! Gostaria de negociar o plano Enterprise (${plan.name}) para uma equipe de ${seatQuantity} colaboradores na Innovation RH.ˋ)}ˋ}` | `—` |
| A008 | 521 / button | {isSelected ? '✓ Plano Selecionado' : 'Escolher Este Plano'} | `onClick={() => onSelectPlan(plan.id)}` | `type="button"` |
| A009 | 535 / Link | Criar Minha Empresa | `href={ˋ/cadastro?planId=${plan.id}&seats=${seatQuantity}&cycle=${selectedCycle}ˋ}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 301 / input | `type="range"; value={seatQuantity}` |

Legendas/opções encontradas em configurações: `Innovation Soluções Sr`, `O ecossistema completo e definitivo para gestão inteligente, RH digital, ASO automático e ponto gamificado.`, `Innovation Soluções`, `Estrutura essencial para empresas em expansão estruturarem processos humanizados com agilidade.`, `5 colab.`, `25 colab.`, `50 colab.`, `100 colab.`, `500 colab.`, `1000+ (Enterprise)`.

Chamadas reconhecidas: `api.auth`, `api.auth.quotePublicPlan`.

Funções existentes: `PricingSection`, `parseMoney`, `getPlanCalculation`.

### apps/web/app/auth/ghost-init/page.tsx

Origem: arquivo local.

Títulos: 97: Acesso negado.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 99 / button | Fechar | `onClick={() => window.close()}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 109 / LoadingState | `label="Iniciando acesso seguro isolado..."` |
| C002 | 116 / LoadingState | `label="Carregando..."` |

Funções existentes: `GhostInitPageContent`, `initGhostMode`, `GhostInitPage`.

### apps/web/app/auth/ghost/page.tsx

Origem: arquivo local.

Títulos: 67: Acesso negado.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 69 / button | Fechar | `onClick={() => window.close()}` | `—` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 79 / LoadingState | `label="Iniciando acesso seguro..."` |
| C002 | 86 / LoadingState | `label="Carregando..."` |

Legendas/opções encontradas em configurações: `Empresa Acessada`.

Funções existentes: `GhostPageContent`, `login`, `GhostPage`.

### apps/web/app/cadastro/page.tsx

Origem: arquivo local.

Títulos: 155: Conta Criada!.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 167 / form | {error && ( <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3"> <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" /> <p className="text-sm font-medium text-rose-800">{error}</p> </div> )} {showPassword ? <EyeOff siz… | `onSubmit={handleSubmit}` | `—` |
| A002 | 292 / button | {showPassword ? <EyeOff size={18} /> : <Eye size={18} />} | `onClick={() => setShowPassword(!showPassword)}` | `type="button"` |
| A003 | 367 / button | {loading ? 'Criando conta...' : 'Cadastrar Empresa'} {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading \|\| !formData.planId}` |
| A004 | 378 / Link | Fazer login | `href="/login"` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 180 / input | `type="text"; disabled={loading}; placeholder="Seu Nome Completo"; value={formData.name}; name="name"` |
| F002 | 196 / input | `type="text"; disabled={loading}; placeholder="Nome da Empresa"; value={formData.companyName}; name="companyName"` |
| F003 | 214 / input | `type="text"; disabled={loading}; placeholder="CNPJ"; value={formData.document}; name="document"` |
| F004 | 238 / input | `type="text"; disabled={loading}; placeholder="Telefone / WhatsApp"; value={formData.phone}; name="phone"` |
| F005 | 263 / input | `type="email"; disabled={loading}; placeholder="Seu melhor e-mail"; value={formData.email}; name="email"` |
| F006 | 279 / input | `type={showPassword ? 'text' : 'password'}; disabled={loading}; placeholder="Crie uma senha forte"; value={formData.password}; name="password"` |
| F007 | 310 / input | `type="radio"; value={plan.id}; name="planId"` |
| F008 | 338 / input | `type="number"; disabled={loading}; placeholder="Quantidade de usuários"; value={formData.seatQuantity}; name="seatQuantity"` |
| F009 | 355 / input | `type="text"; disabled={loading}; placeholder="Cupom promocional (opcional)"; value={formData.couponCode}; name="couponCode"` |

Legendas/opções encontradas em configurações: ``.

Chamadas reconhecidas: `api.auth.publicPlans`, `api.auth.registerCompany`.

Funções existentes: `parseMoney`, `getPlanDisplayPrice`, `CadastroForm`, `CadastroPage`.

### apps/web/app/carreiras/[companyId]/[jobId]/job-details.tsx

Origem: arquivo local.

Títulos: 213: Vaga indisponível; 270: {job.title}; 304: Descrição da vaga; 357: Conheça as etapas deste processo seletivo; 368: Inscrição & Triagem Inteligente (IA); 378: Avaliação por Gente & Gestão (RH); 388: Entrevista ou Desafio Prático; 398: Entrevista Final com Gestores; 408: Aprovação & Onboarding Digital; 433: Candidate-se agora; 447: Candidatura Enviada com Sucesso! 🎉.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 220 / Link | Ver outras vagas | `href={ˋ/carreiras/${encodeURIComponent(companyId)}ˋ}` | `—` |
| A002 | 227 / button | Tentar novamente | `onClick={() => setReloadKey((key) => key + 1)}` | `type="button"` |
| A003 | 252 / Link | Todas as oportunidades | `href={ˋ/carreiras/${encodeURIComponent(companyId)}ˋ}` | `—` |
| A004 | 482 / Link | 🚀 Acompanhar Portal de Vagas | `href="/carreiras"` | `—` |
| A005 | 488 / Link | Ver outras vagas desta empresa | `href={ˋ/carreiras/${encodeURIComponent(companyId)}ˋ}` | `—` |
| A006 | 498 / form | Não preencha este campo Apresentação (opcional) {form.coverLetter.length} /1500 Currículo {resume ? ( <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"> <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-… | `onSubmit={handleSubmit}` | `—` |
| A007 | 632 / button | "Remover currículo" | `onClick={() => { setResume(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}` | `type="button"` |
| A008 | 698 / button | {submitting ? ( <> <Loader2 size={17} className="animate-spin" aria-hidden="true" /> Enviando candidatura... </> ) : ( <> <Send size={16} aria-hidden="true" /> Enviar candidatura </> )} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={submitting}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 504 / input | `type="text"; value={form.website}; name="website"; id="candidate-website"` |
| F002 | 520 / input | `type="text"; placeholder="Como podemos chamar você?"; value={form.name}; name="name"; id="candidate-name"` |
| F003 | 536 / input | `type="email"; placeholder="voce@email.com"; value={form.email}; name="email"; id="candidate-email"` |
| F004 | 551 / input | `type="tel"; placeholder="(00) 00000-0000"; value={form.phone}; name="phone"; id="candidate-phone"` |
| F005 | 568 / input | `type="url"; placeholder="https://linkedin.com/in/seu-perfil"; value={form.linkedinUrl}; name="linkedinUrl"; id="candidate-linkedin"` |
| F006 | 587 / textarea | `placeholder="Conte brevemente por que esta vaga combina com você."; value={form.coverLetter}; name="coverLetter"; id="candidate-cover-letter"` |
| F007 | 609 / input | `type="file"; name="resume"; id="candidate-resume"` |
| F008 | 673 / input | `type="checkbox"` |

| Componente rotulado | Linha/tag | Propriedades (entradas e indicadores) |
| --- | --- | --- |
| C001 | 515 / Field | `label="Nome completo"` |
| C002 | 535 / Field | `label="E-mail"` |
| C003 | 550 / Field | `label="Telefone / WhatsApp"` |
| C004 | 567 / Field | `label="LinkedIn (opcional)"` |

Legendas/opções encontradas em configurações: ``, `Portal de Carreiras`.

Funções existentes: `formatPhone`, `formatFileSize`, `LoadingDetails`, `JobDetails`, `updateField`, `selectResume`, `handleFileChange`, `handleSubmit`, `Field`.

### apps/web/app/carreiras/[companyId]/[jobId]/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Legendas/opções encontradas em configurações: `Detalhes da vaga`, `Confira os detalhes da oportunidade e envie sua candidatura.`.

Funções existentes: `JobDetailsPage`.

### apps/web/app/carreiras/[companyId]/careers-list.tsx

Origem: arquivo local.

Títulos: 192: Seu próximo desafio pode começar aqui.; 269: Encontre seu lugar; 288: Não foi possível carregar as oportunidades; 310: {jobs.length ? 'Nenhuma vaga encontrada' : 'Nenhuma vaga aberta no momento'}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 50 / Link | {job.department && ( <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-700"> {job.department} </span> )} {employmentTypeLabel(job.employmentType)} {job.title} {job.location \|\| 'Local a combinar'} {job.workMode && ( <span className="inli… | `href={ˋ/carreiras/${encodeURIComponent(companyId)}/${encodeURIComponent(job.id)}ˋ}` | `—` |
| A002 | 292 / button | Tentar novamente | `onClick={() => setReloadKey((key) => key + 1)}` | `type="button"` |
| A003 | 319 / button | Limpar filtros | `onClick={() => { setQuery(''); setLocation(''); setEmploymentType(''); }}` | `type="button"` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 213 / input | `type="search"; placeholder="Busque por cargo, área ou palavra-chave"; value={query}` |
| F002 | 228 / select | `value={location}` |
| F003 | 248 / select | `value={employmentType}` |

Legendas/opções encontradas em configurações: `Portal de Carreiras`.

Funções existentes: `searchableText`, `JobCard`, `LoadingJobs`, `CareersList`.

### apps/web/app/carreiras/[companyId]/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Legendas/opções encontradas em configurações: `Vagas abertas`, `Conheça as oportunidades abertas e encontre a próxima etapa da sua carreira.`.

Funções existentes: `CareersPage`.

### apps/web/app/carreiras/_components/careers-brand.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 16 / Link | {`Vagas da ${company.name}`} | `href={ˋ/carreiras/${encodeURIComponent(companyId)}ˋ}` | `—` |

Funções existentes: `CareersBrand`, `CareersFooter`.

### apps/web/app/carreiras/global-careers-hub.tsx

Origem: arquivo local.

Títulos: 149: Seu próximo grande desafio pode começar aqui.; 318: Empresas Parceiras & Clientes Verificados; 354: {comp.name}; 385: {selectedCompanyId !== 'ALL' ? `Vagas em ${companies.find((c) => c.id === selectedCompanyId)?.name \|\| 'Empresa Selecionada'}` : 'Oportunidades Abertas em Todo o Ecossistema'}; 407: Nenhuma vaga encontrada; 471: {job.title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 115 / Link | Innovation Plataforma Portal Oficial de Oportunidades | `href="/carreiras"` | `—` |
| A002 | 133 / Link | Conheça a Plataforma → | `href="/"` | `—` |
| A003 | 208 / button | Limpar | `onClick={() => setSearch('')}` | `—` |
| A004 | 233 / button | Limpar Filtros | `onClick={() => { setSearch(''); setSelectedCompanyId('ALL'); setSelectedLocation('ALL'); }}` | `—` |
| A005 | 252 / button | Todas ( {jobs.length} ) | `onClick={() => setSelectedCompanyId('ALL')}` | `—` |
| A006 | 266 / button | {comp.logoUrl ? ( <img src={comp.logoUrl} alt={comp.name} className="h-5 w-5 rounded-full object-contain bg-slate-950 p-0.5 ring-1 ring-white/10" /> ) : ( <span className="h-4 w-4 rounded-full bg-slate-800 text-teal-300 text-[10px] flex items-center justify-center font-black"> {comp.name.charAt(0… | `onClick={() => setSelectedCompanyId(isSelected ? 'ALL' : comp.id)}` | `—` |
| A007 | 304 / button | Tentar Novamente | `onClick={loadData}` | `—` |
| A008 | 395 / button | ← Ver todas as empresas | `onClick={() => setSelectedCompanyId('ALL')}` | `—` |
| A009 | 411 / button | Limpar Filtros | `onClick={() => { setSearch(''); setSelectedCompanyId('ALL'); setSelectedLocation('ALL'); }}` | `—` |
| A010 | 432 / Link | {comp.logoUrl ? ( <img src={comp.logoUrl} alt={comp.name} className="h-9 w-9 rounded-xl object-contain bg-slate-950 p-1" /> ) : ( <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-teal-300 font-black text-xs" > {comp.name.charAt(0)} </div> )} {comp.name} {emplo… | `href={ˋ/carreiras/${encodeURIComponent(comp.id)}/${encodeURIComponent(job.id)}ˋ}` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 200 / input | `type="text"; placeholder="Busque por cargo, área, tecnologia ou empresa..."; value={search}` |
| F002 | 219 / select | `value={selectedLocation}` |

Legendas/opções encontradas em configurações: `Empresa Cliente`.

Funções existentes: `GlobalCareersHub`.

### apps/web/app/carreiras/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Legendas/opções encontradas em configurações: `Portal de Oportunidades & Carreiras \| Innovation RH Connect`, `Encontre seu próximo desafio em empresas inovadoras de todo o Brasil. Processos seletivos transparentes, triagem inteligente com IA e admissão 100% digital.`, `Explore vagas abertas em diversas empresas clientes do nosso ecossistema oficial. Candidate-se agora!`.

Funções existentes: `GlobalCareersPage`.

### apps/web/app/components/FaceIDOverlay.tsx

Origem: arquivo local.

Títulos: 146: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 211 / button | Tentar Novamente | `onClick={retryCapture}` | `—` |
| A002 | 220 / button | Tirar Foto Agora | `onClick={capturePhoto}` | `—` |
| A003 | 228 / button | Cancelar | `onClick={onCancel}` | `disabled={status === 'captured'}` |

Funções existentes: `FaceIDOverlay`, `startCamera`, `startCountdown`, `capturePhoto`, `retryCapture`.

### apps/web/app/components/LanguageSwitcher.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 25 / button | {`Select Language, currently ${currentLanguage?.name}`} | `onClick={() => setIsOpen(!isOpen)}` | `—` |
| A002 | 42 / button | {lang.flag} {lang.name} | `onClick={() => handleLanguageChange(lang.code)}` | `—` |

Legendas/opções encontradas em configurações: `Português`, `English`, `Español`.

### apps/web/app/components/billing-block-screen.tsx

Origem: arquivo local.

Títulos: 16: Acesso Suspenso.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 25 / a | Pagar Fatura | `href={paymentLink}` | `—` |
| A002 | 42 / button | Sair e voltar ao login | `onClick={() => { localStorage.clear(); window.location.href = '/login'; }}` | `—` |

Funções existentes: `BillingBlockScreen`.

### apps/web/app/components/enterprise/filter-bar.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 21 / input | `placeholder={placeholder}; value={searchValue}` |

Funções existentes: `FilterBar`.

### apps/web/app/components/enterprise/page-header.tsx

Origem: arquivo local.

Títulos: 39: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 28 / Link | {item.label} | `href={item.href}` | `—` |

Funções existentes: `PageHeader`.

### apps/web/app/components/enterprise/table.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 57 / button | {children} | `onClick={onClick}` | `type="button"` |
| A002 | 69 / TableActionButton | (ícone/controle sem legenda estática) | `onClick={onClick}` | `—` |

Funções existentes: `DataTable`, `TableActionButton`, `DownloadPdfButton`.

### apps/web/app/components/platform-ui.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 30 / Button | {children} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `variant="primary"` |
| A002 | 34 / Button | {children} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `variant="secondary"` |

Funções existentes: `GlassCard`, `SolidCard`, `InnerCard`, `PageHeader`, `ButtonPrimary`, `ButtonSecondary`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `LoadingState`.

### apps/web/app/components/ui/button.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 12 / button | {isLoading && ( <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" … | `(sem handler/destino neste elemento; verificar componente/contexto)` | `disabled={disabled \|\| isLoading}` |

### apps/web/app/components/ui/confirm-dialog.tsx

Origem: arquivo local.

Títulos: 40: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 49 / Button | {cancelText} | `onClick={onClose}` | `disabled={isLoading}; variant="outline"` |
| A002 | 56 / Button | {confirmText} | `onClick={handleConfirm}` | `variant={variant}` |

Funções existentes: `ConfirmDialog`.

### apps/web/app/components/ui/data-state.tsx

Origem: arquivo local.

Títulos: 20: {title}; 37: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 23 / Button | Tentar novamente | `onClick={onRetry}` | `variant="danger"` |

Funções existentes: `LoadingState`, `ErrorState`, `EmptyState`.

### apps/web/app/components/ui/drawer.tsx

Origem: arquivo local.

Títulos: 41: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 44 / button | "Fechar drawer" | `onClick={onClose}` | `—` |

Funções existentes: `Drawer`.

### apps/web/app/components/ui/modal.tsx

Origem: arquivo local.

Títulos: 41: {title}.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 44 / button | "Fechar modal" | `onClick={onClose}` | `—` |

Funções existentes: `Modal`.

### apps/web/app/components/ui/tabs.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 53 / button | {children} | `onClick={() => context.onValueChange(value)}` | `type="button"` |

Funções existentes: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

### apps/web/app/criar-conta/page.tsx

Origem: arquivo local.

Sem ações JSX reconhecidas neste arquivo. Pode ser redirecionamento/reexportação, tela estática ou depender de componentes filhos.

Funções existentes: `CriarContaPage`.

### apps/web/app/esqueci-senha/page.tsx

Origem: arquivo local.

Títulos: 28: Verifique seu e-mail.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 32 / Link | ← Voltar para o login | `href="/login"` | `—` |
| A002 | 41 / form | E-mail corporativo Enviar Link de Recuperação → Lembrou a senha? {' '} | `onSubmit={handleSubmit}` | `—` |
| A003 | 52 / button | Enviar Link de Recuperação → | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"` |
| A004 | 63 / Link | Voltar para o login | `href="/login"` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 44 / input | `type="email"; placeholder="voce@empresa.com.br"` |

Funções existentes: `EsqueciSenhaPage`.

### apps/web/app/forgot-password/page.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 35 / form | {message && ( <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3"> <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" /> <p className="text-sm font-medium text-emerald-800">{message}</p> </div> )} Website {loa… | `onSubmit={submit}` | `—` |
| A002 | 65 / button | {loading ? 'Processando...' : 'Solicitar Redefinição'} {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |
| A003 | 75 / Link | Abrir link de teste local para redefinir senha | `href={ˋ/reset-password?token=${encodeURIComponent(resetToken)}ˋ}` | `—` |
| A004 | 81 / Link | Voltar ao login | `href="/login"` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 47 / input | `type="text"; value={website}; name="website"; id="website"` |
| F002 | 54 / input | `type="email"; disabled={loading}; placeholder="E-mail corporativo"; value={email}` |

Chamadas reconhecidas: `api.auth.requestPasswordReset`.

Funções existentes: `ForgotPasswordPage`, `submit`.

### apps/web/app/login/page.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 70 / form | E-mail corporativo Senha {showPassword ? ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0… | `onSubmit={handleSubmit}` | `—` |
| A002 | 95 / button | {showPassword ? ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.1… | `onClick={() => setShowPassword(!showPassword)}` | `type="button"; disabled={loading}` |
| A003 | 115 / Link | Esqueci a senha | `href="/esqueci-senha"` | `—` |
| A004 | 120 / button | {loading ? 'Entrando...' : 'Acessar Plataforma →'} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |
| A005 | 132 / Link | Criar agora | `href="/cadastro"` | `—` |
| A006 | 137 / Link | ← Voltar para o site | `href="/"` | `—` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 73 / input | `type="email"; disabled={loading}; placeholder="voce@empresa.com.br"; value={email}` |
| F002 | 86 / input | `type={showPassword ? "text" : "password"}; disabled={loading}; placeholder="••••••••"; value={password}` |
| F003 | 112 / input | `type="checkbox"` |

Funções existentes: `LoginPage`.

### apps/web/app/not-found.tsx

Origem: arquivo local.

Títulos: 8: Página não encontrada.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 12 / Link | Voltar ao painel | `href="/login"` | `—` |

Funções existentes: `NotFound`.

### apps/web/app/page.tsx

Origem: arquivo local.

Títulos: 117: Feche a folha em minutos, não em dias.; 232: ACME Corp; 233: Stark Ind.; 234: GLOBEX; 235: Soylent; 236: Initech; 243: O RH tradicional custa muito caro .; 259: {pillar.title}; 273: Segurança jurídica em cada batida.; 328: Resultados que impactam o caixa da empresa.; 354: O que dizem os gestores.; 390: Dúvidas Frequentes; 415: Pare de apagar incêndios. Comece a gerir pessoas..

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 90 / Link | (ícone/controle sem legenda estática) | `href="/"` | `—` |
| A002 | 94 / a | Benefícios | `href="#beneficios"` | `—` |
| A003 | 95 / a | A Solução | `href="#solucao"` | `—` |
| A004 | 96 / a | Ver planos | `href="#planos"` | `—` |
| A005 | 97 / a | Perguntas | `href="#faq"` | `—` |
| A006 | 100 / Link | Acessar | `href="/login"` | `—` |
| A007 | 103 / Link | Criar minha empresa | `href="/cadastro"` | `—` |
| A008 | 126 / Link | Criar minha empresa | `href="/cadastro"` | `—` |
| A009 | 130 / a | Como Funciona | `href="#solucao"` | `—` |
| A010 | 317 / button | Autenticar e Bater Ponto | `(sem handler/destino neste elemento; verificar componente/contexto)` | `—` |
| A011 | 394 / button | {faq.q} | `onClick={() => setOpenFaq(openFaq === idx ? null : idx)}` | `—` |
| A012 | 422 / Link | Acessar Plataforma Agora | `href="/login"` | `—` |
| A013 | 435 / Link | Privacidade | `href="/privacidade"` | `—` |
| A014 | 436 / Link | Termos de Uso | `href="/termos"` | `—` |
| A015 | 437 / Link | Suporte | `href="/suporte"` | `—` |

Legendas/opções encontradas em configurações: `Ponto Eletrônico Seguro`, `Geolocalização (GPS) e Biometria Facial integradas. Fim das fraudes e do ponto britânico.`, `Fechamento em Minutos`, `O sistema audita faltas, calcula horas extras (50%, 100%) e banco de horas automaticamente.`, `Férias sem Planilhas`, `Acompanhe períodos aquisitivos, saldos e programe férias da equipe sem erros de cálculo.`, `Alertas Proativos`, `O RH é notificado antes que problemas aconteçam (exames a vencer, funcionários sem gestor).`, `Carolina Mendes`, `Roberto Almeida`, `Fernanda Lima`.

Funções existentes: `Home`.

### apps/web/app/privacidade/page.tsx

Origem: arquivo local.

Títulos: 16: Política de Privacidade; 22: 1. Coleta de Dados; 24: 2. Uso e Proteção; 26: 3. Conformidade com a LGPD.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 9 / Link | Voltar para a página inicial | `href="/"` | `—` |

Funções existentes: `PrivacidadePage`.

### apps/web/app/reset-password/page.tsx

Origem: arquivo local.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 95 / form | {error && ( <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3"> <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" /> <p className="text-sm font-medium text-rose-800">{error}</p> </div> )} {message && ( <div classNam… | `onSubmit={handleValidate}` | `—` |
| A002 | 173 / button | {loading ? 'Validando...' : 'Validar Identidade'} {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |
| A003 | 183 / Link | Voltar ao login | `href="/login"` | `—` |
| A004 | 189 / form | {error && ( <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3"> <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" /> <p className="text-sm font-medium text-rose-800">{error}</p> </div> )} {message && ( <div classNam… | `onSubmit={handleReset}` | `—` |
| A005 | 233 / button | {loading ? 'Salvando...' : 'Salvar Nova Senha'} {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 113 / input | `type="email"; disabled={loading}; placeholder="E-mail Corporativo"; value={email}` |
| F002 | 128 / input | `type="text"; disabled={loading}; placeholder="Código do Gestor (6 dígitos)"; value={code}` |
| F003 | 145 / input | `type="text"; disabled={loading}; placeholder="Início CPF (3 dígitos)"; value={cpfStart}` |
| F004 | 161 / input | `type="text"; disabled={loading}; placeholder="Matrícula"; value={registration}` |
| F005 | 207 / input | `type="password"; disabled={loading}; placeholder="Nova senha"; value={password}` |
| F006 | 222 / input | `type="password"; disabled={loading}; placeholder="Confirmar nova senha"; value={confirm}` |

Chamadas reconhecidas: `api.auth.validateResetCode`, `api.auth.resetPassword`.

Funções existentes: `ResetPasswordPage`, `ResetPasswordForm`, `handleValidate`, `handleReset`.

### apps/web/app/suporte/page.tsx

Origem: arquivo local.

Títulos: 88: Central de Atendimento e Chamados; 106: Chamado Aberto com Sucesso!.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 70 / Link | Voltar para o Login | `href="/login"` | `—` |
| A002 | 73 / Link | Já está logado? Ir para Meus Chamados no Painel | `href="/dashboard/support"` | `—` |
| A003 | 113 / button | ➕ Abrir Outro Chamado | `onClick={handleReset}` | `—` |
| A004 | 119 / Link | ⬅️ Voltar para a Tela de Login | `href="/login"` | `—` |
| A005 | 129 / form | {error && ( <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in fade-in duration-200"> <AlertCircle size={20} className="shrink-0 text-rose-400" /> <span>{error}</span> </div> )} Website Seu Nome Completo * E-mail de Co… | `onSubmit={handleSubmit}` | `—` |
| A006 | 225 / button | {loading ? ( <> <Loader2 size={18} className="animate-spin" /> <span>Registrando Chamado...</span> </> ) : ( <> <Send size={18} /> <span>🚀 Abrir Chamado Agora</span> </> )} | `(sem handler/destino neste elemento; verificar componente/contexto)` | `type="submit"; disabled={loading}` |

| Campo | Linha/tag | Propriedades existentes |
| --- | --- | --- |
| F001 | 140 / input | `type="text"; value={website}; name="website"; id="website"` |
| F002 | 148 / input | `type="text"; placeholder="Ex: João da Silva"; value={name}` |
| F003 | 162 / input | `type="email"; placeholder="Ex: joao@empresa.com.br"; value={email}` |
| F004 | 178 / select | `value={category}` |
| F005 | 194 / input | `type="text"; placeholder="Ex: Não consigo acessar o painel de ponto"; value={subject}` |
| F006 | 209 / textarea | `placeholder="Descreva o que está acontecendo, quais passos executou e o que esperava que acontecesse..."; value={description}` |

Chamadas reconhecidas: `api.publicSupport.createTicket`.

Funções existentes: `SuportePage`.

### apps/web/app/termos/page.tsx

Origem: arquivo local.

Títulos: 16: Termos de Serviço; 22: 1. Licença de Uso; 24: 2. Responsabilidade sobre os Dados; 26: 3. Disponibilidade e SLA.

| Ação | Linha/tag | Texto/rótulo | Destino ou comportamento | Condições |
| --- | --- | --- | --- | --- |
| A001 | 9 / Link | Voltar para a página inicial | `href="/"` | `—` |

Funções existentes: `TermosPage`.
