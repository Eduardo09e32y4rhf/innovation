# Robô "cliente da landing page" (navegador de verdade)

Age como um desconhecido que achou o site: landing → planos → **Criar empresa** → primeiro acesso → equipe → cada perfil entra pela **tela de login** → ponto → PDFs. Roda no **computador e no celular**, tira foto de cada passo e mede: erro no console, resposta 4xx/5xx, rolagem horizontal, link quebrado, menu errado para o perfil, página proibida que abre, PDF que baixa quebrado.

## Como rodar (no seu PC, abre o Chrome para você acompanhar)
```powershell
cd "C:\...\innovation"
$env:ROBO_CLIENTE_CONFIRMO = "sim"
$env:ROBO_DEV_EMAIL = "seu-dev@..."      # opcional, mas necessário para criar o plano grátis e apagar tudo no fim
$env:ROBO_DEV_SENHA = "..."
node tools/robo-cliente/robo-cliente.mjs --url https://innovationia.com.br
```
- Sem credencial de Dev ele usa um plano público que já exista (e não consegue apagar a empresa de teste: avisa o nome para você apagar).
- `--so-landing`: só confere landing e páginas públicas, **sem criar nada** (seguro para olhar o site a qualquer hora).
- `--manter`: não apaga a empresa de teste ao final. `--semjanela`: roda escondido. `--lento`: cliques mais devagar.
- Playwright já está em `tests-e2e` (nada novo para instalar; se faltar: `cd tests-e2e && npm install && npx playwright install chromium`).

## O que confere
1. **Landing e páginas públicas** (PC e celular): erro de console/rede, rolagem horizontal, links internos, `/planos` x API.
2. **Criar empresa pela landing**: clica em "criar conta", testa erros do formulário (nome curto, CNPJ inválido, senha fraca), escolhe o plano grátis, aceita os termos e cria. Confere que caiu no painel.
3. **Portões do primeiro acesso**: termo de privacidade (rola até o fim e assina), boas-vindas, passo a passo.
4. **Menu e abas** do administrador; percorre cada aba procurando tela quebrada.
5. **Equipe**: cadastra gestor, RH, colaborador e consulta (API, para ganhar tempo) e um funcionário pelo formulário da tela (8 seções).
6. **Cada perfil entra pela tela de login** com a senha provisória, troca a senha, e o robô confere o **menu exato do perfil** (contra `docs/manual`), percorre as abas e tenta abrir **por endereço** as abas proibidas.
7. **Funcionário**: bate o ponto pelo botão, baixa a folha em PDF, vê férias e o assistente de solicitação.
8. **RH**: baixa ficha, folha de ponto e ocorrências em PDF pelo menu Ações.
9. **Celular**: repete landing e entra com RH e Funcionário.
10. Apaga a empresa e o plano de teste (se tiver Dev).

Relatório com fotos em `tools/robo-cliente/relatorios/<data>/relatorio.md`.

## Limites desta versão
- Ainda **não cobre plano pago/pagamento** (Pix, boleto): isso depende do Asaas e fica para o passo seguinte.
- Pedido de férias pela tela só é testado se o botão aparecer (por padrão o Funcionário não tem esse botão; o robô avisa).
- O fechamento do mês e a conta de horas são conferidos pelo `tools/robo-ciclo` (API).
