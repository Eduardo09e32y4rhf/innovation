# Checklist de QA e Producao - 30/07/2026

## Evidencias automatizadas desta rodada

- [x] `npm run test:unit`: 36 arquivos e 245 testes aprovados
- [x] `npm run test:contract`: 5 arquivos e 38 testes aprovados
- [x] `npm run test:security`: 5 arquivos e 35 testes aprovados
- [x] Testes focados da frente QA: 5 arquivos e 20 testes aprovados
- [x] E2E de consentimento executou a assercao no Chromium em 14,8 s
- [x] `npm run prisma:validate` aprovado
- [x] `npm run prisma:generate` aprovado localmente
- [x] `npm run build:api` aprovado
- [x] `npm run typecheck:web` aprovado
- [x] `npm run build:web` aprovado sem dependencia do Google Fonts
- [x] `npm run check:official-pdfs` aprovado
- [ ] Processo E2E encerrou de forma limpa: a assercao passou, mas o runner excedeu o tempo ao encerrar o webServer no Windows

## Regras cobertas

- [x] PDFs oficiais nao possuem consumidor de `printPdf`, `buildPdfShell` ou `pdf-utils` no frontend
- [x] Endpoints oficiais de PDF permanecem protegidos por JWT e papeis
- [x] Documentos de funcionario, ferias, gestao e ponto recebem contexto do tenant
- [x] MRR nao possui fallback monetario fixo e informa qualidade parcial
- [x] Contratos possuem estados, transicoes, historico, imutabilidade e preparacao de cobranca
- [x] Candidatura publica exige consentimento
- [x] Curriculo, carta, score e consentimento ficam na `Application`
- [x] Duplicidade de candidatura usa empresa, candidato e vaga
- [x] Reset de senha usa tenant para localizar e atualizar o usuario
- [x] Reset administrativo da propria senha e bloqueado
- [x] Reset retorna o usuario seguro atualizado

## Validacao de banco e schema

- [ ] Migration `20260730110000_application_snapshot_fields` presente no deploy
- [ ] Migration `20260730143000_legal_rules_ledger_and_certificates` presente no deploy
- [ ] `prisma migrate deploy` executado na VPS
- [x] Prisma Client regenerado no ambiente local
- [ ] Prisma Client regenerado no ambiente de build da VPS

## Validacao operacional na VPS

- [ ] `git pull --ff-only origin main`
- [ ] `bash scripts/deploy-prod.sh`
- [ ] API sobe sem erro
- [ ] Web sobe sem erro
- [ ] Log sem falha de migration
- [ ] Fluxo de login responsivo
- [ ] Fluxo de candidatura publica responsivo

## Rollback

- [ ] Backup anterior preservado
- [ ] Tag/commit validado antes do deploy
- [ ] Procedimento de retorno conhecido pela equipe

## Bloqueadores remanescentes para fechamento total

- [x] Remover consumidores de `printPdf` dos documentos oficiais
- [ ] Rodar o E2E com encerramento limpo do webServer, sem depender de acesso externo a fontes ou patch do Next
- [ ] Executar smoke test manual na VPS apos `prisma migrate deploy`
- [ ] Confirmar API e Web na mesma revisao publicada no GitHub
- [ ] Validar backup e procedimento de rollback antes do deploy
