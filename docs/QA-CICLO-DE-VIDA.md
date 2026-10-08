# Correção do robô embarcado

Esta alteração modifica `apps/web/app/_components/robo-qa`, o robô exibido dentro do site. Os scripts `executor-500k` não controlam esse robô e não demonstram cobertura de 500.000 regras de negócio.

## Fluxo implementado

1. DEV percorre cada domínio com testes de tela, específicos e cadastros contíguos.
2. Cria contas via formulários; se criação de funcionário falhar, não inventa outro e-mail e não repete uma mutação de resultado incerto.
3. Espera o logout retornar sucesso, ausência de usuário e tela de login. Entra na próxima conta e verifica email **e** perfil antes do tour.
4. Criações reconhecidas nas respostas HTTP ficam registradas por ID, rota e nome previamente autorizado. O manifesto persiste no navegador.
5. Ao terminar, solicita login DEV para limpeza pelas APIs normais, sem guardar token DEV nem contornar permissões. Clique Continuar depois de entrar como DEV.
6. Erros de exclusão permanecem pendentes e impedem uma nova rodada de criação. Reexecutar a limpeza não repete IDs já removidos.

## Limites explícitos

- Empresas são arquivadas pela operação oficial, **não** purgadas. Arquivamento não remove fisicamente administrador, histórico ou dependências.
- Só captura criações JSON nas rotas users, employees, jobs, platform/companies e platform/plans, com nome autorizado e ID reconhecido. Ponto, férias e vínculos derivados não estão cobertos por este manifesto.
- Dados das execuções anteriores sem manifesto não são removidos automaticamente. Precisam de inventário e confirmação de IDs.
- O cadastro da nova empresa continua sendo um cenário separado: esta alteração não transforma automaticamente essa empresa no tenant de todas as contas.
- Nenhuma promessa de aprovação integral: falta de conta, licenças, MFA ou permissões deve aparecer como bloqueio, não como perfil testado.
- A limpeza requer que a aba/navegador com o manifesto seja preservado. Não apagar o armazenamento antes de concluir a limpeza.

## Validação

Testes unitários para identidade correta/incorreta, agrupamento por aba, escopo de exclusão, deduplicação, ordem inversa e persistência de falhas. Typecheck web. A execução ponta a ponta no ambiente hospedado ainda precisa ser confirmada com contas de homologação.
