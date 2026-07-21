# LGPD — roteiro técnico de privacidade

Este documento orienta implementação e operação; não substitui avaliação jurídica nem o programa de governança do controlador.

## Papéis e escopo

Cada cliente define finalidades e bases legais como controlador dos dados de sua organização. A operação da plataforma deve documentar quando atua como operadora e quais subprocessadores utiliza.

## Controles mínimos

- minimização dos dados coletados e finalidade documentada;
- isolamento por empresa em todas as consultas e mutações;
- menor privilégio por perfil e auditoria de acessos administrativos;
- criptografia em trânsito e proteção de segredos;
- retenção e descarte documentados;
- procedimento para acesso, correção, portabilidade, oposição e eliminação quando aplicável;
- registro de consentimento somente quando consentimento for a base adequada;
- canal de incidentes e avaliação de comunicação aos envolvidos e à ANPD;
- contratos e inventário de subprocessadores;
- revisão específica para biometria, documentos, saúde ocupacional e outros dados sensíveis.

## Logs e observabilidade

Logs devem usar identificadores técnicos quando possível e nunca conter senha, token, documento completo, vetor biométrico ou payload pessoal indiscriminado. Acesso a logs deve ser limitado e auditado.

## Produção

Antes do lançamento, concluir inventário de dados, bases legais, relatório de impacto para tratamentos de maior risco, prazos de retenção, contratos, procedimento de titulares, plano de incidentes e revisão jurídica.
