# Política de Segurança

## Relato responsável

Não publique vulnerabilidades em issues. Envie o relato de forma privada ao responsável técnico do repositório, com impacto, passos mínimos de reprodução e versão afetada.

## Escopo

São suportadas apenas a branch `main` e a versão atualmente implantada. Segredos, dados pessoais e cópias de banco nunca devem ser anexados ao relato.

## Resposta

O recebimento deve ser confirmado, o risco classificado e a correção rastreada em canal privado até que a divulgação seja segura.

## Regras operacionais

- credenciais ficam somente em variáveis de ambiente ou cofre de segredos;
- backups de banco não entram no Git;
- alterações de autenticação, autorização, cobrança e dados pessoais exigem revisão;
- logs não devem armazenar senhas, tokens, documentos completos ou biometria;
- dependências e imagens de produção devem ser atualizadas após avaliação e teste;
- incidentes exigem preservação de evidências, contenção, correção e análise posterior.
