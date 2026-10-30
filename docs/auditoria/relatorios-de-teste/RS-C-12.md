# RS-C-12: nao sobrescrever cadastro existente e nao enumerar e-mails no 409

## Problema
`JobsRepository.apply` sobrescrevia `name`, `phone` e `linkedinUrl` do `Candidate` existente com o que a pessoa digitou (sem provar que o e-mail e dela), e o 409 "Voce ja se inscreveu" confirmava para qualquer um que aquele e-mail ja se candidatou.

## Documentacao
- LGPD art. 6 (principios de qualidade dos dados, seguranca, prevencao) e art. 46 (medidas de seguranca): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. NAO VERIFICADO por fetch; validacao juridica pendente do advogado.
- OWASP Authentication Cheat Sheet (respostas iguais para conta existente/inexistente, evitar enumeracao): VIA BUSCA.

## Decisao
- Prova de posse do e-mail = conta do candidato com `verifiedAt` (ver RS-C-09). So ela atualiza nome/telefone e ve o 409.
- Sem prova: cadastro existente nao muda (so completa campo vazio) e o RH ve um evento `DATA_MISMATCH` na linha do tempo com o nome/telefone informados.
- Candidatura anonima repetida responde `{received:true}` igual a uma nova (sem `applicationId`), e o dono do e-mail recebe `applicationDuplicateEmail`.

## Arquivos
`jobs.service.ts` (`ApplyContext`, resposta), `jobs.repository.ts` (`apply`), `recruitment-privacy.service.ts` (`notifyDuplicateApply`), `recruitment-mails.ts`, `candidate-account.service.ts` (passa `ownerVerified`), `apply-privacy.spec.ts` (7 testes).

## Antes x depois
Antes: 4 dos 5 testes de servico falhavam. Depois: `npx vitest run --config vitest.config.ts apps/api/src/modules/jobs` = 29 arquivos / 229 testes OK; `npx tsc --noEmit -p apps/api` limpo.

## Riscos
- Diferenca de tempo de resposta entre duplicada e nova nao foi equalizada (o throttle por IP/e-mail de `apply-abuse.ts` limita a sondagem).
- No web, o texto do 409 anonimo deixa de aparecer (nunca mais ocorre); a tela mostra o sucesso padrao.
