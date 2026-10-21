## O que mudou
<!-- Em 2 a 4 linhas: o que e por que. Um tema por PR. -->

## Risco
- [ ] Baixo (texto, estilo, teste)
- [ ] Médio (regra de negócio, tela, API)
- [ ] Alto (dinheiro, folha, autenticação, isolamento entre empresas, migration, deploy)

<!-- Se for médio ou alto: o que pode dar errado e como desfazer (rollback). -->

## Como testar
<!-- Passo a passo para quem revisa. Inclua o perfil de usuário usado (ADMIN, RH, DEV...). -->

## Checklist
- [ ] Testes novos ou ajustados cobrem a mudança (`npx vitest run` verde)
- [ ] `tsc` sem erros em `apps/api` e `apps/web`
- [ ] Migration: nenhuma, **ou** é só aditiva e foi testada em banco vazio (`prisma migrate deploy`)
- [ ] Flag: funcionalidade nova atrás de `FEATURE_*` quando for de módulo congelado
- [ ] Docs atualizadas (README, `docs/`, `.env.example`) quando mudou variável ou comportamento
- [ ] Sem segredo, dado pessoal real ou `console.log` de dado sensível
- [ ] Título do PR no padrão `tipo(área): descrição` (ver `docs/CONTRIBUINDO.md`)

## Evidência
<!-- Captura de tela, saída do teste ou link da issue (Closes #123). -->
