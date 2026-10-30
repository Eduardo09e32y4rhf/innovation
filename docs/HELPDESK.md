# Helpdesk: Zammad em servidor separado (e alternativa FreeScout)

## Opções
| Opção | Arquivo | Onde roda | Uso |
|---|---|---|---|
| Zammad (completo: busca, SLA, canais, triggers) | `docker-compose.helpdesk.yml` | **segunda máquina de 6-8 GB** | `.env.example.helpdesk` |
| FreeScout (leve, caixa de e-mail compartilhada) | `docker-compose.freescout.yml` | mesma VPS (~640 MB), profile `helpdesk-lite` | `.env.example.freescout` |

Zammad: `sudo sysctl -w vm.max_map_count=262144` (persistir em `/etc/sysctl.d/99-zammad.conf`) é obrigatório para o Elasticsearch. O ES usa `-Xms1g -Xmx1g`. A interface fica em `127.0.0.1:8080`; coloque nginx + certificado do host (ex.: `suporte.innovationia.com.br`) na frente. As tags das imagens (Zammad, Elasticsearch, FreeScout) não puderam ser verificadas no ambiente de criação: confirme as versões estáveis atuais e ajuste nos `.env` antes de subir.

## Ligação com o Innovation
1. **Formulário no painel**: a tela "Abrir chamado" envia para a API do Innovation (nunca direto do navegador), que chama `POST /api/v1/tickets` do Zammad com token de API dedicado (permissão `ticket.agent` mínima), gravando `externalTicketId` no registro local junto com `companyId` e usuário.
2. **Webhook de status**: no Zammad, Trigger/Webhook em mudança de estado chama `POST /api/support/webhooks/zammad` no Innovation, com segredo HMAC; a API valida a assinatura, atualiza o status local (aberto, em andamento, resolvido) e notifica o usuário.
3. **SSO por OIDC com Keycloak (depois)**: Zammad suporta OpenID Connect em Configurações > Segurança > Autenticação de terceiros; cliente próprio no realm `innovation` (ver `docs/KEYCLOAK.md`). Só depois do piloto do Keycloak.
4. **REEMBOLSO continua no Innovation**: fatura, gateway de pagamento e nota fiscal ficam no Innovation. O chamado apenas **reflete o status** (ex.: "reembolso em análise/pago") por webhook; nenhuma decisão financeira é tomada no helpdesk.
5. Dados pessoais (LGPD): servidor separado também precisa de HTTPS, backup cifrado e política de retenção.

## Memória somada (limites configurados, pior caso)
| Bloco | Limite |
|---|---|
| Sistema atual (db 1g, redis 384m, api 1g, clamav 2g, web 640m) | ~5,0 GB |
| Keycloak (1536m + db 256m) | ~1,75 GB |
| Zammad (ES 2g, rails 1,5g, scheduler 1g, websocket 512m, postgres 768m, redis 256m, memcached 320m, nginx 128m) | ~6,5 GB |
| FreeScout (384m + 256m) | ~0,64 GB |
| Sistema + Keycloak | ~6,75 GB |
| Sistema + Keycloak + Zammad | ~13,3 GB (mais SO e nginx: ~14 GB) |

Uso real costuma ser menor que os limites, mas o ES e o JVM do Keycloak reservam heap. **Conclusão: sistema + Keycloak + Zammad não cabem juntos em VPS pequena.** Zammad vai para outra máquina; na mesma VPS só cabe, com folga apertada, o FreeScout (e o Keycloak apenas se o ClamAV for reduzido/desligado ou a VPS tiver 8 GB+).
