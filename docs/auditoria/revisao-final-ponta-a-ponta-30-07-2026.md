# Revisao Final Ponta a Ponta - 30/07/2026

## Evidencias automatizadas

- `npm run test:unit`: 36 arquivos, 245 testes aprovados
- `npm run test:contract`: 5 arquivos, 38 testes aprovados
- `npm run test:security`: 5 arquivos, 35 testes aprovados
- rodada focada da frente QA: 5 arquivos, 20 testes aprovados
- E2E publico de consentimento: assercao aprovada no Chromium; processo excedeu o timeout durante o encerramento do webServer

## Regras verificadas nesta frente

- Usuarios:
  - reset usa o tenant na leitura e na gravacao
  - reset retorna o usuario seguro atualizado
  - reset da propria conta pelo fluxo administrativo e bloqueado
- Vagas e Admissao:
  - consentimento obrigatorio validado no DTO e no navegador
  - `Application` guarda curriculo, carta, score e consentimento
  - atualizacao de `Candidate` nao recebe evidencias especificas da candidatura
  - duplicidade usa tenant, candidato e vaga
- Plataforma:
  - MRR sem valores fallback fixos
  - qualidade parcial explicita quando falta precificacao
  - lifecycle contratual com estados, transicoes, historico e termos imutaveis
- PDFs:
  - nenhum consumidor frontend de `printPdf`
  - rotas oficiais preservadas no backend
  - guardas de autenticacao e papeis presentes
  - tenant propagado nos documentos de RH

## Pendencias operacionais

- smoke test manual em VPS ainda nao executado nesta rodada
- `prisma migrate deploy` ainda nao executado na VPS
- migrations `20260730110000_application_snapshot_fields` e `20260730143000_legal_rules_ledger_and_certificates` ainda nao confirmadas em producao
- backup, rollback, API, Web e downloads PDF ainda nao homologados na VPS
- webServer do E2E local nao encerrou dentro de 180 s por tentativas externas do Next/Google Fonts

## Veredito desta rodada

A frente automatizada de QA foi fechada com testes unitarios, de contrato, seguranca e uma assercao E2E publica. O codigo possui barreira contra retorno de PDFs oficiais ao navegador. Producao permanece aberta ate migrations, deploy e smoke manual na VPS; nenhum desses itens foi marcado como concluido.
