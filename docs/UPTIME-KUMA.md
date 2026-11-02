# Uptime Kuma (status.innovationia.com.br)

## Subir
```
docker compose -f docker-compose.monitoring.yml up -d
sudo cp infra/nginx-uptime.conf /etc/nginx/conf.d/uptime.conf
sudo certbot --nginx -d status.innovationia.com.br   # DNS A de "status" apontando para a VPS
sudo nginx -t && sudo systemctl reload nginx
```
Abra `https://status.innovationia.com.br` e crie o usuário admin no primeiro acesso. Para basic auth extra, siga os comentários em `infra/nginx-uptime.conf`.

## Monitores recomendados
| Nome | Tipo | Alvo | Intervalo | Observação |
|---|---|---|---|---|
| API saúde | HTTP(s) | https://innovationia.com.br/api/health | 60s | status 200; palavra-chave opcional |
| Login | HTTP(s) | https://innovationia.com.br/login | 60s | 200 |
| Carreiras | HTTP(s) | https://innovationia.com.br/carreiras | 120s | 200 |
| Certificado SSL | HTTP(s) com "Expiração do certificado" ligada | https://innovationia.com.br | 12h | alerta com 14 dias |
| Postgres não exposto | TCP Port | IP público da VPS : 5432 | 5 min | marque "Upside down mode": fica verde só se a porta estiver FECHADA |
| Redis não exposto | TCP Port | IP público : 6379 | 5 min | idem, upside down |

## Alertas
Configurações > Notificações > Configurar notificação, marque "Padrão habilitado" para valer em todos os monitores.
- **E-mail (SMTP)**: host, porta, usuário e senha do provedor (ex.: o SMTP já usado pelo Innovation), remetente `status@innovationia.com.br`, destinatário da equipe. Use "Testar".
- **Telegram**: crie um bot com @BotFather (guarde o token), mande uma mensagem ao bot ou grupo e obtenha o chat ID (`https://api.telegram.org/bot<TOKEN>/getUpdates`); preencha token e chat ID e teste.
Recomendação: 3 tentativas antes de alertar, e reenvio a cada 60 min enquanto estiver fora.
