# Regras de jornada e folha - 2026

Este documento registra as premissas auditaveis usadas pelo modulo de ponto e fechamento.
Percentuais definidos por acordo ou convencao coletiva podem ser superiores aos minimos legais e devem ser configurados na regra da empresa.

## Jornada

- Tolerancia de ponto: ate 5 minutos por marcacao, limitada a 10 minutos no dia. Se uma variacao ultrapassa o limite, o periodo integral entra no calculo.
- Hora extra em dia normal: adicional minimo de 50%, limitado operacionalmente a 2 horas por dia; excesso exige aprovacao e nao entra automaticamente na folha.
- Domingo, feriado ou descanso sem compensacao: pagamento em dobro. No regime 12x36, feriados previstos na escala seguem o artigo 59-A da CLT.
- Atraso e saida antecipada sao apurados separadamente e ambos alimentam o debito de jornada.
- Trabalho urbano entre 22h e 5h: adicional minimo de 20% e hora ficta de 52 minutos e 30 segundos.
- A prorrogacao depois das 5h recebe tratamento noturno quando a jornada cobriu integralmente o periodo noturno, conforme Sumula 60, II, do TST.
- Escala, overrides individuais, excecoes, feriados e banco/pagamento de horas sao resolvidos na data do registro.

## Folha mensal

- Salario-base vem da ficha do funcionario. Fechamento sem salario cadastrado e bloqueado.
- Valor-hora do mensalista: carga semanal em horas multiplicada por 5. Exemplos: 44h = divisor 220; 40h = divisor 200; 36h = divisor 180.
- O salario-base entra uma unica vez. Horas normais nao multiplicam novamente o salario.
- Proventos variaveis: horas extras 50%, horas extras 100%, adicional noturno e reflexo em DSR.
- Debitos de jornada sao descontados pelo valor-hora.
- INSS 2026: calculo progressivo nas faixas de 7,5%, 9%, 12% e 14%, limitado ao teto de R$ 8.475,55.
- IRRF 2026: usa a opcao mais favoravel entre deducoes legais e desconto simplificado mensal de R$ 607,20, aplica a tabela progressiva e a reducao para rendimentos ate R$ 7.350,00.
- FGTS: 8% sobre a remuneracao para contrato CLT comum, exibido como encargo patronal e nunca subtraido do liquido do empregado.
- Valores monetarios sao arredondados em centavos e o fechamento grava a versao `CLT_2026_1`.

## Fontes oficiais

- CLT compilada, artigos 58, 59, 59-A e 73: https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm
- Lei 605/1949, repouso e feriados: https://www.planalto.gov.br/ccivil_03/leis/l0605.htm
- Tabela INSS 2026: https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal
- Tabela IRRF 2026: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
- FGTS do empregado: https://www.fgts.gov.br/Paginas/subpaginas/recolhimento-empregado.aspx
- Sumulas do TST: https://www.tst.jus.br/web/guest/sumulas

## Limites do modulo

O fechamento cobre salario mensal, jornada, horas extras, adicional noturno, DSR, INSS, IRRF e FGTS comum. Beneficios, pensao, consignados, contribuicao sindical, adicionais de insalubridade/periculosidade, ferias, 13o, afastamentos previdenciarios, multiplos vinculos, aprendiz (FGTS de 2%), rubricas especificas de CCT e eventos do eSocial exigem cadastro e motor de rubricas proprios. A memoria deve ser conferida pela contabilidade antes da transmissao oficial.

## Recalculo historico

Depois de aplicar a migration, recalcule apenas a competencia desejada:

```bash
cd /var/www/innovation.ia
RECALC_FROM=2026-07-01 RECALC_TO=2026-07-31 docker compose -f docker-compose.prod.yml --env-file .env exec -T api npm run recalc:timetracks
```

Gere novamente os fechamentos em rascunho depois do recalculo. Fechamentos aprovados ou fechados precisam ser reabertos para preservar a trilha de auditoria.