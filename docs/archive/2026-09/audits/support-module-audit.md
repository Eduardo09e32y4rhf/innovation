# Relatório de Auditoria — Módulo de Suporte & Plataforma

Este documento registra o relatório de auditoria original com todos os apontamentos referentes à segurança, multi-tenancy, autenticação, vazamento de dados, isolamento de empresas e regras de negócio do módulo de Suporte e Plataforma.

## Resumo dos Apontamentos Críticos (P0 & P1)

1. **Uso de `actor.id` vs `actor.sub`**:
   - O objeto `JwtUser` contém a propriedade `sub` e não `id`. O uso de `actor.id` causava exceções `undefined` ou quebrava verificações de autorização.
2. **Vazamento de dados sensíveis nas rotas de Suporte**:
   - As consultas no Prisma utilizavam `include: { createdBy: true, assignedTo: true, author: true }`, o que expunha o hash da senha (`passwordHash`), segredos de MFA e tokens de reset.
3. **Falta de separação das mensagens internas (`INTERNAL`)**:
   - Clientes finais (ADMIN, RH, GESTOR, FUNCIONÁRIO) conseguiam visualizar notas internas adicionadas pela equipe DEV nas respostas dos chamados.
4. **Falta de DTOs e validações rigorosas**:
   - Faltavam regras do `class-validator` para validar o tamanho e enum do título, descrição, enums de status e categoria.
5. **Dados Fictícios na Central de Operações da Plataforma**:
   - A página exibia cartões e tabelas com dados estáticos mocado (ex: "Recebido no mês: R$ 142.050,00"), os quais devem ser substituídos por métricas reais ou estados de erro adequados.
6. **Mapeamento de Perfis e Permissões**:
   - As checagens de perfil em alguns componentes usavam apenas `user.role`, mas o contexto populava `profile`, exigindo normalização com `String(user?.role || user?.profile || '').toUpperCase()`.
