# Organização do repositório — 03/10/2026

## Objetivo

Separar a documentação operacional da documentação histórica e retirar do workspace arquivos que não pertencem ao produto: capturas geradas, cópias locais do repositório, scripts descartáveis e listagens temporárias de Git.

## O que foi organizado

- Criado o índice [README da documentação](README.md), com as referências de uso atual.
- Consolidado `docs/DEPLOY-VPS.md` como o único procedimento operacional de deploy.
- Movidos para `docs/archive/2026-09/` os antigos planos, relatórios, checklists e guias de deploy. Eles foram preservados para consulta, mas não devem orientar mudanças atuais.
- Removidas do repositório as 12 capturas de tela históricas sem referência no código ou na documentação.
- Removido `docs/PLATAFORMA_CODEBASE_FULL.md`, que era uma cópia estática de 214 KB do código de julho. O código-fonte real permanece em `apps/` e as versões anteriores continuam no histórico do Git.
- Removidos scripts pontuais de alteração de texto/logo, listas temporárias de branches e um `TODO.md` vazio.
- Removidos relatórios gerados pelo Playwright e uma cópia aninhada e desatualizada do próprio repositório (`innovation/`).

## Itens preservados intencionalmente

- Código, migrations e alterações de autenticação em andamento.
- Arquivos `.env`, dependências e caches locais, que são ignorados pelo Git e não foram tocados.
- `frontend-only.zip`, criado hoje como cópia local do frontend.
- Documentação de segurança, arquitetura, compliance, regras CLT, UI/UX e auditorias ainda úteis.

## Atenção antes do próximo deploy

Há uma migration nova, ainda não versionada, em `apps/api/prisma/migrations/20261006090000_auth_hardening/`. O prefixo da data está à frente da data desta auditoria. Ela foi preservada sem alterações; revise o nome e valide a migration antes de incluí-la em um commit ou aplicá-la na VPS.

## Validação da organização

- Nenhum arquivo de produto foi movido ou apagado.
- Não havia referências no repositório para as capturas, scripts temporários, listagens de branches ou documentos duplicados removidos.
- A pasta aninhada removida tinha Git próprio e estava em commit anterior ao da raiz do workspace.
