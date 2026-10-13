# Robô 360° (navegador de verdade, só leitura)

Varre cada área do site no **computador e no celular** e aponta o que quebra, com foto de cada tela.
**Não cria, não salva e não apaga nada**: botões de ação (salvar, enviar, pagar, excluir, aprovar…) nunca são clicados.

| Área | O que confere |
|---|---|
| Landing | seções (recrutamento, gestão, ponto, planos, portal de vagas, dúvidas), planos com preço, portal depois dos planos, menu do celular, links internos sem 404/500, Termos/Privacidade/Suporte |
| Portal de vagas | `/carreiras`, busca, filtros no celular, página da vaga, formulário vazio não envia, "voltar" dos Termos/Suporte leva às vagas, conta do candidato, Meus dados (LGPD) |
| Login | senha errada mostra erro e não entra, esqueci a senha |
| Empresas | cadastro: avançar vazio não deixa seguir, há planos públicos |
| Painel (após login) | entra pela tela, passa termo/boas-vindas/passo a passo, abre **cada item do menu**, clica **cada aba**, abre e fecha os botões **Novo/Adicionar** |
| Plataforma (DEV) | o mesmo para o painel do DEV, se informado |

Em cada tela mede: tela de erro (com o código), erro no console, resposta 4xx/5xx da API, rolagem horizontal.

## Como rodar (no seu PC)
```powershell
cd "C:\...\innovation"
# Só as áreas públicas:
node tools/robo-360/robo-360.mjs --url https://innovationia.com.br
# Com o painel (use uma empresa de TESTE já paga, sem MFA):
$env:ROBO_EMAIL = "admin@empresa-teste.com"; $env:ROBO_SENHA = "..."
$env:ROBO_DEV_EMAIL = "dev@..."; $env:ROBO_DEV_SENHA = "..."   # opcional
node tools/robo-360/robo-360.mjs --url https://innovationia.com.br
```
Opções: `--semjanela` (escondido) · `--so-pc` · `--so-celular` · `--lento`.
Playwright vem de `tests-e2e` (se faltar: `cd tests-e2e && npm install && npx playwright install chromium`).

Relatório com fotos em `tools/robo-360/relatorios/<data>/relatorio.md`. Sai com código 1 se algo falhar (serve para CI).

Fluxos que **criam** dados (empresa nova pela landing, equipe, ponto, PDFs, fechamento) continuam no `tools/robo-cliente` e no `tools/robo-ciclo`.
