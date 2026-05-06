# Innovation.IA Workspace

Monorepo organizado com foco no caminho ativo do produto.

## Estrutura principal

Os diretórios que fazem parte da operação atual são:

- `apps/api`: API NestJS
- `apps/web`: frontend principal
- `apps/ai-service`: serviço Python/FastAPI para IA
- `apps/desktop`: shell desktop
- `packages/*`: pacotes compartilhados
- `modules/*`: módulos TypeScript auxiliares
- `WHATSAPP`: runtime e CRM Omnius reaproveitado
- `MEDIA`: assets usados pelo app e pelo build desktop

## Material legado

Os blocos antigos que estavam soltos na raiz foram agrupados em [`legacy/`](./legacy/README.md):

- `legacy/FRONTEND`
- `legacy/IA`
- `legacy/RH`
- `legacy/FINANCEIRO`
- `legacy/CONTABILIDADE`
- `legacy/INFRA`

Essas pastas continuam disponíveis para consulta e reaproveitamento, mas não são o caminho principal de execução.

## Documentação de workspace

- [docs/workspace/MODULES.md](docs/workspace/MODULES.md)
- [docs/workspace/TECH_STACK.md](docs/workspace/TECH_STACK.md)
- [docs/workspace/PLANO_FINAL.md](docs/workspace/PLANO_FINAL.md)
- [docs/workspace/GEMINI.md](docs/workspace/GEMINI.md)
- [docs/workspace/TODO.md](docs/workspace/TODO.md)

## Desenvolvimento

```bash
npm install
npm run dev:api
npm run dev:web
```

No Windows, também dá para subir tudo com:

```powershell
./scripts/iniciar_local.ps1
```

## Notas

- `WHATSAPP/` continua fora de `legacy/` porque ainda participa da integração operacional.
- `MEDIA/` continua na raiz porque ainda abastece o build desktop.
- `npm run dev:legacy` continua disponível, mas agora aponta para `legacy/FRONTEND`.
