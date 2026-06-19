# Agent Canvas no MVP

Use o `agent-canvas` como cockpit de engenharia para auditar e corrigir o MVP, sem transformar ele em dependencia de runtime do produto.

## Comandos

```powershell
npm run dev:canvas
```

Abre o Agent Canvas em `http://localhost:8000` com `VITE_WORKING_DIR` apontando para a raiz deste repositorio.

Modos uteis:

```powershell
npm run dev:canvas:minimal
npm run dev:canvas:frontend
npm run dev:canvas:backend
```

Se a porta `8000` estiver ocupada:

```powershell
.\scripts\start_agent_canvas.ps1 -Port 8010
```

## Como usar sem sair do escopo

- Trate o Canvas como ferramenta local de orquestracao, revisao e automacao.
- Mantenha o MVP oficial em `apps/api` e `apps/web`.
- Nao adicione `agent-canvas` aos workspaces npm da raiz.
- Nao faca o build do MVP depender do build do Canvas.
- Use agentes/tarefas do Canvas para checklist, auditoria de rotas, revisao de diffs e logs de execucao.
- Evite acionar trabalhos para Financeiro, IA, ATS, Desktop ou Contabilidade enquanto o MVP de RH nao fechar.

## Checklist sugerido no Canvas

1. Auditar contratos de Auth, Users, Employees, Time Track, Vacations, Dashboard e WhatsApp.
2. Verificar isolamento por `companyId` em consultas sensiveis.
3. Rodar build/typecheck e registrar erros.
4. Corrigir somente bugs que bloqueiam login, dashboard, CRUD de funcionarios, ponto, ferias, usuarios e WhatsApp.
5. Gerar resumo final com arquivos alterados, rotas testadas, comandos e pendencias.
