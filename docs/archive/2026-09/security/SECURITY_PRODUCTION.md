# Segurança de dados e banco em produção

Este projeto aplica controles de aplicação para LGPD e segurança, mas criptografia real do banco em repouso depende da VPS/PostgreSQL/backup.

## Obrigatório na VPS

- Usar HTTPS no Nginx para todo acesso externo.
- Não expor PostgreSQL, Redis ou API administrativa diretamente para a internet.
- Manter PostgreSQL acessível apenas por rede interna/container/localhost.
- Ativar criptografia de disco/volume no provedor ou LUKS quando disponível.
- Criptografar backups antes de enviar para storage externo.
- Usar senhas fortes e diferentes para banco, Redis, JWT e usuários administrativos.
- Rotacionar segredos quando houver suspeita de vazamento.

## Conex?o criptografada com PostgreSQL

Em produ??o, quando o PostgreSQL estiver fora do mesmo host/container, use SSL na conex?o:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco?sslmode=require
```

Se o banco estiver em `localhost`, `postgres` ou `db` por rede interna Docker, mantenha a porta fechada para internet e use criptografia de disco/volume e backups criptografados. O sistema valida `sslmode` para PostgreSQL remoto em `NODE_ENV=production`.

## Auditoria no sistema

Toda requisição autenticada de escrita (`POST`, `PUT`, `PATCH`, `DELETE`) é registrada em `AuditLog` com:

- usuário;
- empresa;
- rota e método;
- entidade;
- IP;
- user-agent;
- data/hora;
- parâmetros e corpo sanitizado sem senhas/tokens.

## Política de senha

- Senha mínima: 10 caracteres.
- Exige letra maiúscula, minúscula, número e símbolo.
- Troca obrigatória a cada 30 dias.
- Não permite reutilizar a senha atual.
- Hash com bcrypt custo 12.
- Token JWT deve permanecer com expiração curta, recomendado `JWT_EXPIRES_IN=60m`.

## Banco de dados

A migration `20260620223000_security_password_policy` adiciona campos de controle de senha e índices de auditoria. Rode na VPS com:

```bash
npm --prefix apps/api run prisma:deploy
```

Nunca use `docker compose down -v` em produção.