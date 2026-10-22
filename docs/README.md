# Documentacao do projeto

Indice da documentacao **viva** do Innovation RH Connect. O que descreve versoes anteriores fica em [`archive/`](archive/) e nao deve orientar deploy nem ser lido como o estado atual.

## Plano e estado do projeto
- [Escopo para producao v1.0](ESCOPO-PRODUCAO-V1.md): o que limpar, o que fazer, prazo, responsaveis e criterios de go/no-go (**plano vigente**).
- [Handoff de QA P0/P1](HANDOFF-QA-P0-P1.md): bugs, frentes de QA e como retomar.
- [Divida de tipos](DIVIDA-DE-TIPOS.md): contagem de `any` por modulo e plano de reducao (item L7).
- [Proximos passos](PROXIMOS-PASSOS.md): roteiro antigo (03/10), parcialmente superado; traz o mapa para o escopo vigente.
- [Defeitos abertos da suite de QA](auditoria/DEFEITOS-ABERTOS-QA-2026-10-21.md): defeitos confirmados que ainda falham de proposito (`it.fails`).
- [Seeds e dados de teste](auditoria/SEEDS-E-DADOS-DE-TESTE-2026-10-21.md): seeds que podem rodar em producao e como limpar dados de teste do staging.

## Operacao e seguranca
- [Deploy na VPS](DEPLOY-VPS.md) e [scripts](../scripts/README_SCRIPTS.md): caminho unico de deploy, migrations e backup.
- [Seguranca do repositorio](SECURITY.md): dados e arquivos que nao podem ser versionados.
- [Segredos no historico do git](production/SEGREDOS-NO-HISTORICO.md): o que foi encontrado e o que rotacionar.
- [Arquitetura](architecture/): decisoes tecnicas e rotacao de credenciais.
- [Compliance](compliance/): requisitos de LGPD e Portaria 671.

## Dominio e produto
- [Regras de folha CLT 2026](CLT_PAYROLL_RULES_2026.md)
- [Manual do usuario](MANUAL-DO-USUARIO.md) (um arquivo por aba em [`manual/`](manual/))
- [UI/UX](ui-ux/README.md): sistema visual, cobertura de paginas e inventario de controles.
- [Estrutura do repositorio](REPOSITORY_STRUCTURE.md)

## Processo (criados nas frentes de governanca e limpeza)
- [Como contribuir](CONTRIBUINDO.md) e [protecao da branch `main`](GITHUB-BRANCH-PROTECTION.md)
- [Inventario do painel](INVENTARIO-PAINEL.md): evidencias para unificar pastas duplicadas (L3)

## Historico
Auditorias, planos e diagnosticos anteriores: [`archive/2026-09/`](archive/2026-09/) e [`archive/2026-10/`](archive/2026-10/) (organizacao do repositorio, revisao de sites, robo de QA removido, Agent Canvas, plano consolidado v2).

Nao inclua aqui capturas de tela geradas, copias do codigo, resultados de testes ou scripts de correcao pontual.
