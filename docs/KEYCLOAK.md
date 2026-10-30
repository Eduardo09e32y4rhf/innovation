# Keycloak (prova de conceito, desligado)

Arquivos: `docker-compose.identity.yml`, `.env.example.identity`, `infra/keycloak/realm-innovation.json`. **A API do Innovation não usa Keycloak hoje**; nada no código foi alterado.

## O que resolve e o que não resolve
Resolve: login central (SSO) para painel, helpdesk e futuros apps; MFA TOTP; política de senha, bloqueio por força bruta e verificação de e-mail prontos; recuperação de senha; auditoria de logins; federação (Google/Microsoft) no futuro.
Não resolve: autorização por empresa/escopo dentro do Innovation (continua na API, usando o claim `companyId`); regras de negócio (RH, folha, fatura); migração automática de senhas (hashes atuais não são importáveis sem plugin: o plano usa redefinição por e-mail); custo de RAM (ver `docs/HELPDESK.md`, tabela de memória). Também não é backup: inclua o volume `keycloak_db_data` no backup.

## Realm de exemplo
Realm `innovation`: papéis DEV, CEO, COMERCIAL, CONTABIL, ADMIN, RH, RH_RS, GESTOR, FUNCIONARIO, CONSULTA, CANDIDATO; senha 12+ caracteres (sem usuário no nome, histórico de 3); bloqueio após 5 falhas (espera crescente até 15 min); verificação de e-mail ligada (configure o SMTP em Realm settings > Email); TOTP disponível e opcional (ação `CONFIGURE_TOTP` existe, mas não é obrigatória; para tornar obrigatório por papel use um fluxo de autenticação condicional); registro público desligado. Clientes: `innovation-web` (público, authorization code + PKCE S256, redirect `https://innovationia.com.br/*`) e `innovation-api` (bearer-only). Sem usuários nem segredos. Mapeadores no `innovation-web`: `roles` (papéis do realm), `companyId` (atributo do usuário) e audiência `innovation-api`.

## Subir
```
cp .env.example.identity .env.identity   # preencha KEYCLOAK_ADMIN_PASSWORD e KEYCLOAK_DB_PASSWORD (openssl rand -base64 24)
docker compose -f docker-compose.identity.yml --env-file .env.identity --profile identity up -d
```
Nginx do host: `auth.innovationia.com.br` -> `127.0.0.1:8081` com cabeçalhos `X-Forwarded-*` (o compose usa `KC_PROXY_HEADERS=xforwarded`). Exponha só `/realms/` e `/resources/`; mantenha `/admin/` restrito por IP. A tag da imagem (`KEYCLOAK_VERSION`) não pôde ser verificada no site oficial na criação: confirme em keycloak.org/downloads antes de subir.

## Como o NestJS validaria o JWT
1. Obter o token do `innovation-web` (code+PKCE) e enviá-lo como `Authorization: Bearer`.
2. Um guard (ex.: `passport-jwt` + `jwks-rsa`, ou `jose` `createRemoteJWKSet`) baixa as chaves de `https://auth.innovationia.com.br/realms/innovation/protocol/openid-connect/certs`, com cache, e valida assinatura (RS256), `iss` = `https://auth.innovationia.com.br/realms/innovation`, `aud` contendo `innovation-api`, `exp`/`nbf`.
3. Mapeamento: `roles` -> papéis internos (mesmos nomes); `companyId` -> escopo de empresa já usado nos guards; `sub` -> vínculo com o usuário local (tabela de identidade externa).
4. O `companyId` é atributo do usuário, definido só por administradores; nunca aceitar empresa vinda do cliente. Token de 5 min; refresh no front.

## Plano em fases
1. **Convivência**: Keycloak sobe à parte; a API aceita os dois tipos de token (atual e OIDC) atrás de feature flag desligada.
2. **Empresa piloto**: usuários de uma empresa criados via API admin do Keycloak com `companyId`; login OIDC só para ela; medir RAM, latência e suporte.
3. **Migração**: por empresa, importar usuários sem senha, ação obrigatória `UPDATE_PASSWORD` + e-mail de verificação; desligar o login legado quando todas migrarem; manter plano de reversão.

## Riscos
RAM (1,5 GB só para o Keycloak) em VPS pequena; ponto único de falha do login (se cair, ninguém entra); atualizações de versão frequentes; senha do admin e SMTP mal configurados; `companyId` incorreto = vazamento entre empresas; tag não verificada.

## Checklist de testes
- [ ] `docker compose ... --profile identity up -d` fica `healthy`; sem `--profile` nada sobe
- [ ] Realm importado com os 11 papéis e os 2 clientes
- [ ] Login code+PKCE funciona; sem PKCE é recusado
- [ ] Senha de 11 caracteres é rejeitada; 5 falhas bloqueiam
- [ ] E-mail de verificação e de redefinição chegam
- [ ] TOTP cadastra e funciona; usuário sem TOTP também entra
- [ ] Token traz `roles`, `companyId`, `aud=innovation-api`
- [ ] API rejeita token expirado, `iss`/`aud` errados e assinatura inválida
- [ ] Usuário da empresa A não acessa dados da empresa B
- [ ] Restauração do volume do Keycloak testada
