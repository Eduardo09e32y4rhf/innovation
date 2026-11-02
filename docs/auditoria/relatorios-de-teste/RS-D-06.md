# RS-D-06 + RS-C-18 + RS-D-19: consentimento com prova, banco de talentos sem conta, trilha do upload

(Os tres itens compartilham o mesmo codigo de `apply`; foram entregues em um unico commit.)

## Problema
- D-06: so existiam `consentGiven/At/Version` na candidatura; sem hash do texto, IP, user agent, recibo ou revogacao; dados sensiveis (genero/raca/PcD) sem consentimento proprio.
- C-18: candidatura sem conta nao oferecia o banco de talentos.
- D-19: o envio do curriculo nao gerava trilha de auditoria.

## Documentacao
- LGPD art. 7, I e art. 8 (consentimento por escrito/forma que demonstre a manifestacao, finalidades determinadas, §2 o controlador deve provar, §5 revogavel a qualquer momento por procedimento gratuito); art. 11, I (dado sensivel: consentimento especifico e destacado, para finalidades especificas). https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. **NAO VERIFICADO**: host planalto.gov.br nao resolve neste ambiente (liberar na rede da sessao). **Validacao juridica pendente do usuario/advogado** (texto dos consentimentos, efeito da revogacao do consentimento da candidatura).

## Como funciona
- Tabela `CandidateConsent` (migration `20261101020000_rs_d06_candidate_consents`): por aceite guarda finalidade (`APPLICATION`, `TALENT_POOL`, `SENSITIVE_DATA`), versao da politica, SHA-256 de `versao + "\n" + texto` (textos canonicos em `recruitment-consent.ts`; o web usa `_lib/consent-texts.ts`; `tests/contract/consent-texts.spec.ts` garante igualdade), IP (`clientIp`), user agent, datas e so o hash do token do link.
- Candidatura: grava os aceites e envia UM recibo por e-mail com texto exato e link de revogacao. Dados de diversidade sem `sensitiveConsent` = 400; sem o aceite nada de diversidade e gravado.
- Banco de talentos sem conta (C-18): checkbox opcional proprio; duplo aceite: so apos clicar em "confirmar" no recibo e criada conta sem senha (nome/telefone/consentimento) ou ligado o consentimento da conta existente. O RH continua so vendo o cartao do `TalentPoolService`.
- Revogacao: link do recibo (`/carreiras/consentimento?token=&acao=revogar`) ou conta logada (`GET /candidate-portal/consents`, `POST /candidate-portal/consents/:id/revoke`). TALENT_POOL tira a conta do banco; SENSITIVE_DATA apaga `CandidateDiversity`; APPLICATION vence a retencao e registra evento `CONSENT_REVOKED` (o cron das 03:30 anonimiza; contratados sao preservados).
- Alteracoes de consentimento dentro da conta (perfil) tambem entram no livro.
- D-19: `AuditLog` `CANDIDATE_RESUME_UPLOADED` (entity Application) com sha256, tamanho, mime, rotulo `CURRICULO_CANDIDATURA`, IP e user agent.

## Limites / pedidos a outros pacotes
- Upload de documentos admissionais (`publicUpload`, pacote de documentos) deve chamar `JobsRepository.auditCandidateUpload` (ou gravar `AuditLog` igual) com rotulo do documento; nao alterei esse codigo.
- Upload de curriculo pela conta nao tem empresa; sem `AuditLog` (exige `companyId`). Fica so o log do servidor.
- O curriculo nao e copiado para a conta criada no duplo aceite.
- A revogacao de APPLICATION anonimiza o candidato inteiro naquela empresa no proximo cron (comportamento atual de `anonymizeCandidate`).

## Testes
`candidate-consent.spec.ts` (11), `apply-privacy.spec.ts` (+5), `consent-texts.spec.ts`. Jobs + contract: 64 arquivos / 511 testes; `tsc` api/web limpos; lint web 0 erros.
