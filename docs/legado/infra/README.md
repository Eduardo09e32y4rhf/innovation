# Legado de infraestrutura (NAO usar em producao)

Estes arquivos foram movidos de `infra/` (auditoria INF-09). Nenhum e usado pelo deploy.
A producao e **somente** `docker-compose.prod.yml` (raiz) + `scripts/deploy/vps-update.sh` + nginx do host
(referencia: `infra/nginx-innovation.conf`).

Problemas conhecidos (por isso ficam aqui, so como historico/exemplo):
- `docker-compose.yml`: watchtower com `docker.sock` (atualiza imagens sem aprovacao), cAdvisor `privileged`, tags `latest`, portas em `0.0.0.0`, variaveis que o codigo nao le.
- `docker-compose.locaweb.yml`: portas publicas.
- `render.yaml`: roda `db:seed` (empresa demo) a cada subida.
- `Dockerfile.api` / `Dockerfile.web` / `nginx-web.conf`: imagens antigas (nginx servindo SPA estatica; o web atual e Next em Node).
- `nginx-lb.conf`: hostname fixo, 50M de upload, sem TLS endurecido (substituido por `infra/nginx-innovation.conf`).
- `Caddyfile`, `ecosystem.config.cjs`: alternativas nao usadas.
