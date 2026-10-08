# 🤖 Robô QA (provisório)

Entra no sistema como **cada perfil**, clica nas telas e botões **na sua frente** (navegador visível, com cursor roxo, faixa
"o que estou fazendo" e destaque no botão) e, no fim, gera um **relatório em português simples** do que não funcionou.

É provisório e isolado: tudo está nesta pasta (`tools/robo-qa/`). Para remover, apague a pasta.

## Como usar

1. **Crie contas de TESTE** (uma por perfil que quiser testar) e preencha o arquivo de configuração:
   ```
   copy tools\robo-qa\robo.config.exemplo.json tools\robo-qa\robo.config.json
   ```
   Edite `robo.config.json`: `urlBase` (ex.: `https://seu-dominio.com.br` ou `http://localhost:3000`) e e-mail/senha de cada perfil.
   Perfil sem e-mail/senha é pulado e aparece no relatório como "não testado".
   `robo.config.json` e `relatorios/` ficam fora do git (nunca suba senhas).
2. Rode (na raiz do projeto):
   ```
   node tools/robo-qa/robo.mjs
   ```
   - O navegador abre e você vê o robô trabalhando. Uma segunda página (`ao-vivo.html`) abre sozinha e se atualiza a cada 3 s com o
     perfil atual, os últimos passos e os problemas já achados.
   - No final abre o `relatorio.html` (e salva `relatorio.md` com o mesmo texto).

Opções úteis: `--perfil=DEV,RH_RS` · `--celular` (confere cada tela no tamanho de celular) · `--devagar` / `--rapido` ·
`--url=https://...` · `--semjanela` (escondido) · `--max=16` (cliques por tela) · `--ajuda`.

## O que ele testa

O plano de cobertura completo está em [`docs/ROBO-QA-PLANO-COMPLETO.md`](../../docs/ROBO-QA-PLANO-COMPLETO.md). O modo `--critico` aumenta a profundidade, observa APIs, evita navegação redundante e faz logout explícito entre perfis.

Para gerar o catálogo determinístico da execução longa (12.000 casos por padrão, a partir de um universo combinatório de 168.000):

`node tools/robo-qa/catalogo-10000.mjs`

Altere o limite com `QA_LIMITE=25000 node tools/robo-qa/catalogo-10000.mjs`. O arquivo guarda seed, universo, casos, perfil, empresa, domínio, ação, estado e transporte para permitir reprodução e auditoria.

Execução real dos casos em lote (500.000 por padrão):

```bash
node tools/robo-qa/catalogo-500k.mjs /tmp/innovation-qa-500k.ndjson
node tools/robo-qa/executor-500k.mjs --url=http://localhost:3000 \
  --tenant=empresa-teste --catalogo=/tmp/innovation-qa-500k.ndjson --concorrencia=16 --timeout=8000
```

O executor faz requisições reais, aplica timeout/retry, envia método/payload de teste, valida status permitido por estado, mede latência, registra falhas e grava um resultado por caso. A carga é limitada a 64 workers para não transformar a suíte em um ataque acidental ao ambiente.
- **Login** de cada perfil (e avisa se o perfil exige MFA).
- **Menu lateral:** mostra as funções certas para o perfil? (faltando ou sobrando)
- **Cada tela permitida:** abre, e aperta o que é seguro (abas, filtros, abrir detalhes, "Novo ..." sem salvar). Se aparecer erro 500, erro de
  JavaScript, tela em branco, mensagem de erro ou falha de rede, o relatório diz **qual botão** causou.
- **Telas bloqueadas:** digita o endereço direto e confere se está mesmo bloqueado (vazamento de permissão = GRAVE).
- **Plataforma** (abas e subseções), **Faturas** (abas Assinaturas/Planos/Cupons), **Vagas** (funil, painel do candidato, aba Documentos,
  Responsáveis, etapa "Contratado" escondida do RH — R&S), **painel inicial** de cada perfil (saudação, indicadores do RH — R&S).
- **Celular** (`--celular`): a tela cabe no aparelho ou tem rolagem lateral?

## Segurança: modo leitura (padrão)
Em `--modo=leitura` o robô **nunca** aperta nada com nome de excluir, arquivar, suspender, bloquear, salvar, enviar, pagar, cobrar,
aprovar, contratar, gerar link, baixar etc., e recusa qualquer janela de confirmação do navegador.
`--modo=completo` libera esses botões: **use só em ambiente de teste**, nunca na produção.

## Limites (leia antes de confiar no relatório)
- Ele aperta o que é **seguro e visível**. Não preenche formulários longos nem faz fluxos que exigem dados reais
  (pagamento, assinatura gov.br, upload de documentos). Isso continua sendo teste manual.
- Os endereços do menu e as regras "quem vê o quê" ficam em `cenarios/matriz.mjs` e espelham o código do sistema.
  Se mudar o menu, atualize lá, senão o robô vai apontar falsos problemas.
- Falha do tipo **"o robô não achou o botão"** pode ser defeito real (botão sumiu/não responde) **ou** o robô procurando o botão errado.
  Veja a foto do relatório antes de concluir.
- Itens como Gestão, Usuários, Faturas e Plataforma dependem de permissão individual: o robô só passeia por eles quando aparecem no menu.
- Contas com MFA não entram sozinhas. Use contas de teste sem MFA.

## Testar o próprio robô
`node tools/robo-qa/robo.mjs --demo --semjanela --rapido` roda num sistema de mentira com defeitos plantados de propósito.

Suíte crítica somente leitura:

`node tools/robo-qa/robo.mjs --config=tools/robo-qa/robo.config.json --critico --semjanela`

Jornada com criação de dados (exige ambiente descartável):

`node tools/robo-qa/robo.mjs --config=tools/robo-qa/robo.config.json --critico --ambiente-teste --modo=completo --celular --semjanela`
(erro 500, erro de JavaScript, vazamento de permissão, menu sobrando, tela larga no celular...) e mostra que o relatório os encontra.

