# Plano Mestre Unificado - Innovation RH Connect

> Este documento foi colocado em `docs/PLANO_MESTRE.md` como fonte canônica de priorização.
> Versão: 1.0 | Data: 01/08/2026 | Estado: EM EXECUÇÃO

Veja o conteúdo completo do plano no artefato de conversa original.

## Status de Execução

### Fase 3 - Shell e Navegação Escalas (CONCLUÍDO)

- [x] Nova entrada `Escalas` no sidebar (`dashboard-sidebar.tsx`)
- [x] Remoção das entradas separadas `Escala` e `Ponto`
- [x] Layout com navegação secundária horizontal (`escalas/layout.tsx`)
- [x] Componente de navegação (`escalas/_components/escalas-nav.tsx`)
- [x] Config de navegação (`escalas/_components/escalas-nav-config.ts`)
- [x] Redirects legados:
  - [x] `/escala` → `/escalas/calendario`
  - [x] `/ponto` → `/escalas/ponto`
  - [x] `/time-track/closing` → `/escalas/fechamento`
  - [x] `/time-track/rules` → `/escalas/regras`
  - [x] `/time-track/occurrences` → `/escalas/ocorrencias`
- [x] Visão Geral (`escalas/page.tsx`)

### Fase 4 - Calendário e Equipe (CONCLUÍDO)

- [x] calendário unificado;
- [x] drawer do dia;
- [x] modos pessoa/equipe/dia/lista;
- [x] atribuição com preview;
- [x] conflito e alteração retroativa;
- [x] cobertura e histórico;
- [x] QA mobile.

### Fase 5 - Ponto, Ocorrências e Trocas (CONCLUÍDO)

- [x] consulta e registro de ponto;
- [x] aprovações individual/lote;
- [x] ocorrências e justificativas;
- [x] atestados parciais;
- [x] trocas e exceções;
- [x] atualização localizada após mutação;
- [x] prevenção de duplo clique/replay.

### Fase 6 - Regras (CONCLUÍDO)

- [x] jornadas versionadas;
- [x] tolerâncias e intervalos;
- [x] horas extras e adicional noturno;
- [x] banco de horas;
- [x] feriados;
- [x] ciclo da competência;
- [x] aprovações;
- [x] histórico/diff.

- [x] Calendário (`escalas/calendario/page.tsx`)
- [x] Equipe (`escalas/equipe/page.tsx`)
- [x] Ponto (`escalas/ponto/page.tsx`)
- [x] Ocorrências (`escalas/ocorrencias/page.tsx`)
- [x] Trocas (`escalas/trocas/page.tsx`)
- [x] Fechamento (`escalas/fechamento/page.tsx`)
- [x] Regras (`escalas/regras/page.tsx`)
- [x] Documentos (`escalas/documentos/page.tsx`)
- [x] TypeScript build verification
