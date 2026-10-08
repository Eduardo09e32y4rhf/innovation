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

## Login do robô (contas fixas)

O robô não depende mais do seu DEV pessoal nem de criar usuários pelo "Novo acesso" (que falhava por licença, por perfil protegido ou por falta de empresa). Um seed cria **um login próprio do robô** e **um usuário por perfil**, todos com a mesma senha:

```bash
# banco de TESTE (local ou homologação descartável). A senha precisa ter 10+ caracteres, com maiúscula, minúscula, número e símbolo.
ROBO_QA_BANCO_DE_TESTE=sim ROBO_QA_SENHA='Troque#Esta1' npm run seed:robo-qa
```

| Perfil | E-mail |
| --- | --- |
| DEV (login do robô) | `robo-qa.dev@example.com` |
| CEO (onboarding já concluído pelo seed) | `robo-qa.ceo@example.com` |
| ADMIN, RH, RH_RS, GESTOR, FUNCIONARIO, CONSULTA, COMERCIAL, CONTABIL | `robo-qa.<perfil sem _ e em minúsculas>@example.com` (ex.: `robo-qa.rhrs@example.com`) |

1. Entre no site como `robo-qa.dev@example.com` (um DEV só do robô; seu DEV pessoal fica livre).
2. Abra o 🤖 › **Opções** › **Contas fixas do robô**, informe a mesma senha e clique **Salvar** (fica só neste navegador).
3. **LIGAR O TESTE.** O robô testa o DEV, sai, entra em cada perfil pela conta fixa e testa. Nada é criado pelo "Novo acesso".

- A empresa de teste é "ROBO-QA Empresa de Teste": sem CNPJ, ativa, sem cobrança pendente, 60 licenças. O FUNCIONARIO já tem cadastro e escala 5x2 (para bater ponto e pedir férias).
- O seed pode rodar de novo quando quiser: restaura a senha e destrava as contas. Se o sistema obrigar a trocar a senha de uma conta fixa, o relatório avisa para rodar o seed.
- Travas do seed: recusa `NODE_ENV=production` (a menos que `ROBO_QA_PERMITIR_PRODUCAO=sim`, para homologação que roda em modo produção) e banco que não seja local (a menos que `ROBO_QA_PERMITIR_BANCO_REMOTO=sim`). Ele cria um DEV com senha conhecida: **nunca rode no banco dos clientes**.
- O robô **não cria mais empresa nem planos** de catálogo: usa a empresa que já existe. "Vendas" não é um perfil à parte no sistema: use COMERCIAL.
- Entre como `robo-qa.dev@example.com` (e não como seu DEV pessoal) para o relatório só ter contas do robô; o painel avisa se você estiver com outro e-mail.
- Sem a senha em "Contas fixas", o robô volta ao comportamento antigo (cria usuários "ROBO-QA …" pelo "Novo acesso").

## Empresa sem CNPJ (modo teste)

O robô não tem CNPJ real. Para ele cadastrar empresas, o CPF/CNPJ do **cadastro público** (`/cadastro` e `POST /auth/register-company`) pode ficar em branco e deixa de ser validado quando as duas chaves estão ligadas:

| Onde | Variável | Observação |
| --- | --- | --- |
| API | `COMPANY_DOCUMENT_OPTIONAL=true` | lida a cada requisição |
| Site | `NEXT_PUBLIC_COMPANY_DOCUMENT_OPTIONAL=true` | variável de **build**: rebuild depois de mudar |

- Padrão **desligado** (produção): CPF/CNPJ continua obrigatório e com dígitos verificadores. `.env.example` e `.env.test.example` já vêm ligados; `.env.prod.example` vem desligado.
- Sem documento a empresa não usa cupom (a trava de uso único do cupom depende do documento) e o cliente no Asaas fica com a cobrança pendente.
- A tela **Plataforma › Empresas › Nova empresa** já aceitava criar sem CNPJ.

## Uso
- **⚡ Teste rápido:** login, menus e telas principais de cada perfil.
- **🔎 Teste completo:** todos os perfis e funcionalidades previstas (Plataforma, Faturas, Vagas, bloqueios).
- Sem contas fixas, cria os usuários "ROBO-QA …" (e-mail @example.com) **só na primeira vez**; as contas ficam salvas neste navegador e são reaproveitadas.
  "Recriar contas de teste" esquece as salvas. Cancele esses acessos em Usuários quando não precisar mais.
- Se uma tela não carregar em 90 s (rápido) / 180 s (completo), é marcada como inconclusiva e o teste continua.
- Botão não encontrado = ⚠️ inconclusivo (não é contado como defeito). ❌ só com evidência (erro 500, erro de JavaScript, tela com erro, vazamento de permissão).
- Nunca aperta excluir/arquivar/suspender/salvar/enviar/pagar etc. Todas as permissões do servidor continuam valendo.

Teste do próprio robô: `node tools/robo-qa/demo/testar-motor.mjs`.
