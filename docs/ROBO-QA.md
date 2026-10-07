# Robô de teste (provisório)

Botão flutuante 🤖 (só aparece para usuário DEV). Abre cada página como uma pessoa usaria, sai e entra como outros usuários e,
no fim, mostra um relatório em português: ✅ passou · ❌ falhou · ⚠️ inconclusivo · ⏭️ não testado (sem senhas nem tokens).

## Desenvolvimento local

O robô fica desabilitado em builds de produção, mesmo com a flag ligada. Ao abrir uma versão de produção, as credenciais antigas em `roboQa.contas` e o estado de execução em `roboQa.v1` são removidos do navegador. O relatório sem segredos é preservado.

Use apenas uma API e banco de teste local para executar o robô.

```bash
NEXT_PUBLIC_ROBO_QA=on npm run dev --workspace apps/web
```
Para apagar de vez: remover `apps/web/app/_components/robo-qa/` e as 3 linhas do `apps/web/app/layout.tsx`.

## Uso
- **⚡ Teste rápido:** login, menus e telas principais de cada perfil.
- **🔎 Teste completo:** todos os perfis e funcionalidades previstas (Plataforma, Faturas, Vagas, bloqueios).
- Cria os usuários "ROBO-QA …" (e-mail @example.com) **só na primeira vez**; as contas ficam salvas neste navegador e são reaproveitadas.
  "Recriar contas de teste" esquece as salvas. Cancele esses acessos em Usuários quando não precisar mais.
- Se uma tela não carregar em 90 s (rápido) / 180 s (completo), é marcada como inconclusiva e o teste continua.
- Botão não encontrado = ⚠️ inconclusivo (não é contado como defeito). ❌ só com evidência (erro 500, erro de JavaScript, tela com erro, vazamento de permissão).
- Nunca aperta excluir/arquivar/suspender/salvar/enviar/pagar etc. Todas as permissões do servidor continuam valendo.

Teste do próprio robô: `node tools/robo-qa/demo/testar-motor.mjs`.
