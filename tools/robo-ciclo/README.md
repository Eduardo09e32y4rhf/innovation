# Robô de ciclo completo

Cria tudo do zero, como um cliente novo, e confere o que o usuário veria. Fala com a API (a mesma que o site usa), então roda no seu PC apontando para o servidor, ou no próprio servidor.

## O que ele faz, em ordem
1. **Dev** entra só para: apagar os restos de execuções anteriores *do próprio robô* e **criar um plano grátis**.
2. **Pela tela de login ("Criar empresa")**, sem usar a área do Dev: cadastra uma empresa escolhendo esse plano. Testa também plano inexistente, usuários demais, senha fraca, CNPJ inválido/duplicado e e-mail duplicado.
3. Dentro da empresa, o administrador cadastra do zero: gestor, RH, 4 colaboradores e 1 consulta, dá acesso a cada um, e cada um troca a senha provisória e entra.
4. **Férias**: cada perfil pede as suas (RH, Gestor, Funcionário A e D; o Administrador pede as do B; o Gestor pede as do C). Tenta o que não pode (sobrepor datas, 3 dias, 40 dias, pedir pelo colega, aprovar as próprias, Consulta pedir). O RH aprova e recusa; baixa o recibo.
5. **Ponto manual** de um mês fechado inteiro (o mais recente sem feriado nacional):
   - **Colab. A**: hora extra 50% (19:00, 18:00, entrada 07:30), atraso (08:30 e 08:06), saída antecipada (16:30), tolerância de 5 min (08:03), uma falta, hora extra acima de 2h (20:30 e 19:30), e sábado trabalhado (100%).
   - **Colab. B**: o mês inteiro em turno noturno 20:00–05:00 (adicional noturno com hora de 52min30s).
   - **Colab. C**: mês normal e **2 dias de suspensão**.
6. **Ponto automático**: o colab. D bate as 4 marcações de hoje como no celular, e o Gestor e o RH batem a entrada. Confere o tipo de cada batida, a 5ª recusada e o comprovante.
7. O RH **aprova** duas horas extras pendentes e **reprova** uma; o robô confere que a reprovada **não é paga**.
8. **Conta**: compara cada dia gravado e o **fechamento do mês** (HE 50%/100%, noturno, DSR, faltas, atrasos, saída antecipada, suspensão, INSS, IRRF, FGTS, líquido) com os **oráculos independentes** (`tools/robo-api/oracle` e `tools/robo-ciclo/lib`), e depois a **folha de pagamento** com o fechamento.
9. **PDFs**: ficha, folha de ponto, ocorrências, fechamento (individual e coletivo), recibo de férias, comprovante de ponto, termo de suspensão, relatório contábil e histórico de atividade. Confere se começam com `%PDF-`, terminam em `%%EOF`, têm páginas, nome de arquivo limpo e sem cache.
10. Apaga a empresa de teste (com todos os funcionários) e o plano grátis de teste.

## Como rodar
```powershell
$env:ROBO_CICLO_CONFIRMO = "sim"        # obrigatório quando a URL não é local
$env:ROBO_DEV_EMAIL = "seu-dev@..."
$env:ROBO_DEV_SENHA = "..."
node tools/robo-ciclo/robo-ciclo.mjs --url https://SEU-DOMINIO/api
```
Opções: `--manter` (não apaga ao final, para você olhar a empresa na tela) · `--so-limpar` (só apaga restos de execuções anteriores).
Relatório em `tools/robo-ciclo/relatorios/*.md` e `.json`. Código de saída 1 se achar defeito.

## O que ele NÃO toca
Só apaga empresas cujo nome começa com **"ROBO-QA CICLO"** e planos cujo nome começa com **"ROBO-QA Grátis"**. Empresas e funcionários reais nunca são listados para exclusão.

## Atenção
- Os valores esperados saem de oráculos que seguem `docs/CLT_PAYROLL_RULES_2026.md`. Quando o sistema diverge, o relatório mostra os dois números; a contabilidade decide quem está certo.
- Os oráculos puros (calendário e conta do ponto) têm teste automático: `npx vitest run --config vitest.config.ts tests/unit/payroll/robo-ciclo-oraculo.spec.ts`.
- **Esta é a primeira versão e ainda não foi executada contra um servidor** (o PC onde foi escrita não tem banco/API). Espere ajustes nos nomes de campos das respostas na primeira rodada.
- Os e-mails dos usuários de teste usam `example.com`.
