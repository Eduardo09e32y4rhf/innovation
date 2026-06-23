# TODO - Inovação RH

## Escala e Regras de Negócio

- [x] Preparar sistema para escala (Redis, locks, paginação, healthcheck, docker)
- [ ] Admissão/Demissão: bloquear ponto retroativo e posterior
- [ ] Ponto regular: usar hora servidor, bloquear ajuste de data/hora
- [ ] Ajuste manual: bloquear horário futuro e data futura
- [ ] Férias: elegibilidade 12 meses + contador regressivo
- [ ] Férias: mostrar faltas injustificadas no momento da solicitação
- [ ] Férias: aba "Férias Recusadas" separada
- [ ] Admin: controle de licenças/usuários na plataforma

## Bugs e Ajustes

- [x] Padronizar tamanho de fonte na listagem de férias
- [x] Fix dashboard buttons breaking on scroll