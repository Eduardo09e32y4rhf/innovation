# Plano avançado — robô "cliente que achou a landing page"

Objetivo: antes de vender, provar que um desconhecido consegue **chegar pela landing, escolher um plano, criar a empresa, cadastrar a equipe, bater ponto, pedir férias, fechar o mês e receber os PDFs — usando só a tela**, no celular e no computador, sem nenhuma ajuda do Dev.

## Por que o robô atual não basta
O `robo-ciclo` fala direto com a API. Ele prova que as regras e as contas funcionam, mas **não prova que a tela funciona**: botão escondido, formulário que não envia, plano que não aparece na página de cadastro, layout quebrado no celular. O cliente vê a tela, não a API. Por isso o próximo robô precisa ser de **navegador** (Playwright, já usado em `tools/robo-qa`).

## Fase 0 — Descobrir por que o robô de API "não fez nada" (30 min)
Rodar na VPS e guardar a saída: `node tools/robo-ciclo/robo-ciclo.mjs --url https://innovationia.com.br/api | tee /tmp/ciclo.txt`.
Se não imprimiu nada, é falha do script (a corrigir). Se imprimiu, o relatório está em `tools/robo-ciclo/relatorios/`. Sem esse resultado, não há base para saber o que já está bom.

## Fase 1 — Robô de navegador "Cliente da landing" (núcleo)
Roda em 2 telas: **celular (390×844)** e **computador (1366×768)**. Cada passo tira foto e mede.

1. **Landing (`/`)**: carrega sem erro no console; todos os botões "Começar/Criar conta/Planos/Entrar" levam a uma página que existe; textos de preço iguais aos planos reais; nenhuma rolagem horizontal; imagens carregam.
2. **Planos (`/planos`)**: lista os planos públicos (inclusive o grátis); preço do plano na tela = preço da API; botão do plano leva ao cadastro **já com o plano escolhido**.
3. **Cadastro (`/criar-conta` e `/cadastro`)**: preenche como um cliente real (nome da empresa, CNPJ que busca dados, e-mail, senha) — testa erros visíveis (CNPJ inválido, senha fraca, e-mail repetido): a mensagem aparece e é compreensível.
4. **Primeiro acesso**: cai no painel certo; aparece boas-vindas e o passo a passo; termo de privacidade assina; empresa nasce com as escalas 5x2, 6x1, 12x36.
5. **Equipe pela tela**: cadastra funcionário (formulário de 8 seções), importa planilha XLSX (modelo → preenche → valida → importa), dá acesso, copia a senha provisória.
6. **Cada perfil entra pela tela de login** (senha provisória → troca obrigatória → painel): Administrador, RH, Gestor, Funcionário, Consulta; confere menu e abas que cada um vê (contra `docs/manual`), e que aba proibida por endereço direto é bloqueada.
7. **Dia a dia**: Funcionário bate ponto (4 batidas) e vê o comprovante; pede troca de folga e justificativa; Gestor aprova; RH lança escala 12x36; pede e aprova férias; baixa recibo.
8. **Fim do mês**: Escalas → Fechamento → Folha; baixa **todos os PDFs pelo botão da tela** (não pela API) e valida cada um.
9. **Cobrança (plano pago)**: repete o cadastro com um plano pago de teste: aparece link de pagamento, pagamento Pix de R$ 5 de teste libera a conta sozinho (webhook do Asaas), fatura PDF e boleto saem.
10. **Cancelar e sair**: cancelar assinatura, excluir dados; empresa de teste some.

## Fase 2 — Prontidão para venda (checklist que o robô não vê)
- **E-mail transacional** (verificar e-mail, recuperar senha): hoje não está configurado → cliente novo **não consegue recuperar senha**. Bloqueante.
- **Nota fiscal automática**: depende da configuração fiscal no Asaas e da confirmação do contador (ISS). Sem isso, emitir nota é manual.
- **Termos, privacidade (LGPD) e contrato**: textos revisados por advogado; DPO/e-mail de contato.
- **Backup e restauração**: provar que o backup da VPS restaura (testar de verdade, 1 vez).
- **Monitoramento**: alerta se o site/API cair (UptimeRobot) e se o disco encher.
- **Segurança**: trocar a chave do Asaas e a senha do banco que apareceram em conversa; ligar verificação em duas etapas nas contas de Dev/Admin.
- **Suporte**: quem responde os chamados, em quanto tempo (SLA) e por qual canal (WhatsApp).
- **Promoção ainda não aplica cargo/salário** (só avisa): decidir se vira "Aplicar promoção".
- **Limpeza**: remover usuários/empresas "ROBO-QA" antigos do banco de produção.

## Fase 3 — Carga e estabilidade (1 dia)
20 empresas criadas ao mesmo tempo pelo cadastro; 200 funcionários batendo ponto em 1 minuto; fechamento de 500 funcionários. Meta: nenhum erro 5xx, tela responde em menos de 3 s.

## Ordem sugerida para amanhã
1. Fase 0 (saber o estado real). 2. E-mail transacional + segurança (bloqueantes de venda). 3. Fase 1 itens 1–8 (o que o cliente vê). 4. Item 9 (cobrança). 5. Checklist jurídico/operacional em paralelo.

## Critério de "pronto para vender"
Robô de navegador passa **sem nenhum ❌** no celular e no computador, o robô de API passa com contas conferidas, e os itens bloqueantes da Fase 2 estão resolvidos.
