# Segredos encontrados no histórico do git (item L10)

Levantamento de 21/10/2026 sobre os **1.557 commits** (itens 10 e 11 vieram da varredura com `gitleaks` feita no CI) de todas as branches. **Este arquivo não contém nenhum valor secreto**, só onde estão e o que fazer.

> **O repositório `Eduardo09e32y4rhf/innovation` é PÚBLICO** (`visibility: public`). Tudo abaixo está ao alcance de qualquer pessoa. Trate cada item como **comprometido**: o que resolve é **revogar/rotacionar**, não apagar o histórico.

## Situação no código atual
Nenhum desses valores existe nos arquivos atuais (`git grep` em `HEAD`). Eles só sobrevivem em commits antigos, presentes em várias branches (`main`, `audit/reconstrucao-20261007`, `chore/*`).

## O que existe no histórico

| # | Tipo | Onde (arquivo @ commit, data) | Risco | Ação (só o dono consegue) |
|---|---|---|---|---|
| 1 | **Chaves de API do Google** (formato `AIza…`), **4 distintas** | `scripts/deploy_vps_completo.sh` @ `0c7cc43b` (15/04/2026), `scripts/run_local_debug.ps1` @ `6159882e`, `iniciar_local.ps1` @ `2f5393f6` (fev–abr/2026) | **Alto**: cobrança indevida e uso por terceiros | No Google Cloud Console: identificar a chave, **excluir** e criar outra com restrição de API e de origem |
| 2 | Chave de API do Google, 1 | `VERCEL_DEPLOY_GUIDE.md` (12/02/2026) | Médio | Mesma ação |
| 3 | Chaves de API do Google, 2 | `innovation/web/**/tabler/shared/data/site.json` (fev/2026) | Baixo: provavelmente chaves de demonstração do tema Tabler | Confirmar no Console se pertencem ao seu projeto; se sim, excluir |
| 4 | **Chave do Asaas de homologação** (`$aact_hmlg_…`) | `scripts/deploy_vps_completo.sh` @ `0c7cc43b`; `backend/src/services/asaas_service.py` @ `e1e702eb` (mar–abr/2026), também em `41b1a0de`, `0d4e8f54`, `626a2400` | Médio: é sandbox, não cobra dinheiro real | No painel Asaas (sandbox): **revogar** e gerar outra |
| 5 | Segredo de 64 caracteres: `SECRET_KEY` (JWT) e `ASAAS_WEBHOOK_TOKEN` | `scripts/deploy_vps_completo.sh` @ `0c7cc43b` (15/04/2026) | **Alto se algum valor foi usado em produção** | Gerar novos (`scripts/security/bootstrap-env.sh`); trocar o segredo do JWT derruba as sessões, é esperado |
| 6 | Segredo de 64 caracteres em `test-ghost.js` | @ `353dec67` (19/07/2026) | A confirmar | Verificar se era dado real; se sim, rotacionar |
| 7 | Tokens de teste do Mercado Pago (`TEST-…`) | `iniciar_local.ps1`, `scripts/run_local_debug.ps1` (fev–mar/2026) | Baixo: credencial de teste | Revogar no painel do Mercado Pago |
| 8 | Senha padrão do banco em compose de produção | `docker-compose.prod.yml` @ `e98bf933` (12/09/2026): valor de 10 caracteres | Médio se a senha de produção ainda for a padrão | Confirmar que a senha do Postgres de produção foi trocada (`scripts/security/rotate-db-password.sh`) |
| 9 | Arquivos `.env.prod` e `innovation/.env` já foram versionados | fev/2026 | Baixo: continham quase só espaços reservados (a maior "senha" tinha 10 caracteres) | Nada além do item 8 |
| 10 | **Sessões do WhatsApp** (28 arquivos de credenciais de sessão, 74 achados do gitleaks) | 2 commits de maio/2026: `8daba4e2` e `d5d3a788` | **Alto**: quem tiver esses arquivos pode assumir a conta do WhatsApp conectada | No WhatsApp: **desvincular todos os aparelhos conectados** (Configurações > Aparelhos conectados) e reconectar |
| 11 | Chave com padrão de chave Stripe | `frontend/utils/stripe/config.ts` @ `2e8946fe` | A confirmar: pode ser exemplo | Conferir no painel da Stripe se existe e revogar |

**Limites da varredura:** feita com um script próprio (padrões de chave e entropia), sem `gitleaks` (não está instalado no ambiente). Ignora arquivos binários e `package-lock.json`. Pode haver falso negativo; rode `gitleaks detect` com o histórico completo (`fetch-depth: 0`) para conferir.

## Decisões recomendadas

1. **Rotacionar tudo da tabela agora** (itens 1, 2, 4, 5, 7, 8). É o que realmente elimina o risco.
2. **Tornar o repositório privado** (Settings → General → Danger zone → *Change visibility*). Além dos segredos, o código inteiro de um SaaS comercial está público: concorrentes podem copiá-lo e qualquer pessoa pode procurar falhas. Efeito colateral: ele tem 1 estrela e nenhum fork; o que já foi copiado não volta.
3. **Reescrever o histórico (`git filter-repo`) é opcional e disruptivo** (quebra clones, branches e PRs abertos) e **não desfaz** o que já foi copiado. Só vale a pena depois das rotações e com o repositório já privado.
4. **Impedir que volte a acontecer:** o job `secrets-scan` do CI deve varrer o histórico completo (`fetch-depth: 0`) com um `.gitleaks.toml` que ignore só os espaços reservados conhecidos, e a proteção de branch deve exigir o `ci-ok`.
