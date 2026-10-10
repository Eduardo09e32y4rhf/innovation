# Aba FATURAS — botão por botão

**Para que serve:** é a parte financeira do uso do sistema: o **plano** contratado, as **faturas** da mensalidade, o pagamento, os comprovantes e notas fiscais. Existem **duas telas diferentes** dentro da mesma aba, dependendo de quem entra:

1. **Visão da empresa** (Administrador, RH) – mostra só a fatura da **própria empresa**.
2. **Visão da plataforma** (Desenvolvedor, CEO, Contábil) – mostra **todas as empresas clientes**, com abas Faturas, Assinaturas, Planos e Cupons.

## Quem vê a aba e o que cada perfil pode
A aba exige a permissão "Faturas: ver". Por padrão:

| Perfil | Vê a aba? | O que pode |
|---|---|---|
| **Administrador** | Sim (visão da empresa) | Ver faturas, **pagar**, **alterar plano**, **alterar usuários**, **cancelar assinatura**, pedir reembolso. |
| **RH - Empresas** | Sim (visão da empresa) | Ver faturas e **pagar**. **Não** altera plano/usuários nem cancela. |
| **Desenvolvedor** | Sim (visão da plataforma) | **Tudo**: cobrar, trocar plano, descontos, cupons, dias grátis, reembolsos, pausar, cancelar, liberar acesso, emitir nota, trocar provedor de pagamento e reprocessar eventos. |
| **CEO** | Sim (visão da plataforma) | Tudo como o Desenvolvedor, exceto **reprocessar eventos** do provedor (só o Desenvolvedor). Pode trocar o provedor de pagamento. |
| **Contábil** | Sim (visão da plataforma) | **Consulta** todas as empresas e **anexa/emite nota fiscal e comprovante**. Não cobra, não dá desconto, não reembolsa. |
| Gestor, Funcionário, Consulta, Comercial, RH - R&S | Não | — |
O Administrador do sistema (Desenvolvedor) pode mudar essas permissões por usuário em Usuários → Permissões.

---

# PARTE A — Visão da empresa (Administrador e RH)

## A1. Faixas de aviso (aparecem sozinhas no topo)
- **Amarela** – "Existe uma pendência de pagamento. Pague a fatura em aberto para liberar o acesso de toda a equipe." (ou "A assinatura está cancelada. Fale com o suporte para reativar.") Enquanto houver pendência, **só o Administrador consegue entrar, e apenas nesta aba**.
- **Vermelha** – "Você tem N fatura(s) vencida(s). Regularize para evitar o bloqueio do acesso."

## A2. Cartão grande "Plano atual"
Mostra: o **nome do plano**, a **situação** (etiqueta colorida), **Cobrança pausada** e/ou **Cancelamento em [data]** quando for o caso, a **mensalidade** (ou "Grátis"), **Desconto aplicado** (e por quantos ciclos ainda vale), **Próximo vencimento** (ou "Teste até…"), e, se houver, "**Troca agendada para o próximo ciclo**". Ao lado, medidores **Usuários em uso** e **Funcionários cadastrados** (usados × permitidos) e os **Módulos** incluídos no plano.

## A3. Quatro botões de ação (aparecem conforme a permissão)
| Botão | O que faz |
|---|---|
| **Pagar fatura** (roxo) | Abre a próxima fatura em aberto, com as formas de pagar (seção A5). |
| **Alterar plano** | Janela "Alterar plano — Compare e escolha. Mostramos o valor exato antes de você confirmar." Lista os planos (marca **Seu plano** e **Recomendado**). Ao escolher um, o sistema calcula: **"Vale agora"** (upgrade: passa a valer na hora, com o valor proporcional) ou **"A partir do próximo ciclo"** (downgrade: "Você continua com o que tem hoje até lá, sem crédito pela diferença"), e "Passa a custar …". **Voltar** / **Confirmar troca**. |
| **Alterar usuários** | Janela "Alterar usuários": botões **− (menos um usuário)**, o número, **+ (mais um usuário)**; o sistema mostra "Calculando…" e o valor. Aumentar vale na hora; reduzir vale no próximo ciclo (não dá para reduzir abaixo do que já está em uso). **Confirmar**. |
| **Cancelar assinatura** (vermelho) | Janela "Cancelar assinatura — Sentimos muito ver você ir." Avisa: cobranças futuras são interrompidas e faturas em aberto são canceladas; **o acesso continua até o fim do ciclo já pago**; os dados ficam guardados conforme a lei. Pede **"Por que está cancelando?"** (mínimo 5 letras). Não aparece se o cancelamento já está agendado. |

## A4. Quadro "Próxima fatura" e lista "Minhas faturas"
- **Próxima fatura**: valor, descrição e vencimento (ou "Fatura vencida"). Botão **Ver como pagar**.
- **Minhas faturas**: filtros **Todas · Em aberto · Pagas · Canceladas e reembolsadas** (cada um com contador), botão de **Atualizar**, e caixa **Buscar por descrição, valor ou nota fiscal**.
- Cada fatura é uma linha clicável com descrição, data, valor e situação: **Em aberto, Vencida, Pagamento em confirmação, Gerando link de pagamento, Paga, Reembolso em andamento, Paga · reembolso parcial, Reembolsada, Cancelada**.
- Se não houver nada em aberto: **Gerar fatura do mês** (cria a fatura do período).

## A5. Ao clicar numa fatura (janela lateral)
- **Como pagar**: **Copiar Pix copia e cola**; **Boleto** → **Copiar código de barras** e **Baixar boleto (PDF)**; **Abrir página de pagamento (cartão, Pix ou boleto)**.
- Se já pagou e o banco ainda está confirmando: "Recebemos o seu pagamento e estamos aguardando a confirmação do banco. Não é preciso pagar de novo; esta tela atualiza sozinha quando confirmar."
- **Documentos**: **Ver / baixar recibo**, **Baixar nota fiscal (PDF)**, **Baixar XML** (ou "A nota fiscal aparece aqui assim que for emitida").
- **Histórico** da fatura.
- **Solicitar reembolso** (só Administrador): escreva o motivo (mín. 10 letras). "O pedido abre um chamado e o financeiro responde por lá. O reembolso não é automático."

---

# PARTE B — Visão da plataforma (Desenvolvedor, CEO, Contábil)
Quatro abas redondas no topo: **Faturas · Assinaturas · Planos · Cupons**.

## B1. Aba "Faturas · todas as empresas"
"Situação financeira de empresas ativas, bloqueadas e canceladas."
- **Extrato PDF** – baixa um extrato geral. **Atualizar** – recarrega.
- **Indicadores:** Receita mensal recorrente · Recebido · Em aberto · Vencido · Assinaturas ativas.
- **Filtros:** busca por nome, CNPJ ou identificador; **Situação da empresa**; **Situação financeira**.
- **Tabela:** Empresa (com CNPJ), Situação, Financeiro (e "pausada"), Próx. venc., Em aberto, Vencido. **Clicar numa empresa abre a "ficha"** (B2). **Anterior / Próxima** para paginar.
- **Provedor de pagamento** (quem pode cobrar): quadro para escolher qual provedor emite as próximas cobranças — botões **Usar Asaas** / **Usar Mercado Pago** (o ativo mostra "Ativo"; só habilita se estiver configurado). "Faturas novas usam o provedor ativo. Faturas já criadas no outro provedor continuam nele." Lista de eventos recentes e botão **Reprocessar** (só Desenvolvedor).

## B2. Ficha de uma empresa
**Botões de topo** (só com permissão de cobrar/desconto; ficam desabilitados com a dica "Esta empresa ainda não tem assinatura. Ative a assinatura primeiro." quando não há assinatura):
| Botão | O que faz |
|---|---|
| **Nova cobrança** | Cria uma fatura avulsa: Descrição, **Forma de pagamento (Asaas)** — **Boleto (com código de barras)** ou **Cliente escolhe (sem código de barras no PDF)** —, Valor, Vencimento, e a caixa **Enviar automaticamente ao Asaas** (desmarcada = "Registro local: o pagamento deve ser recebido e conciliado por outro meio"). |
| **Usuários** | Aumenta/diminui a quantidade de usuários contratados; **Calcular rateio** mostra o valor proporcional antes de confirmar. |
| **Trocar plano** | Escolhe **Novo plano**, calcula e confirma (downgrade fica agendado para o próximo ciclo). |
| **Desconto recorrente** | Desconto em **Percentual (%)** ou **Valor (R$)** por **Quantos ciclos**. |
| **Dias grátis** | Concede **Quantidade de dias (30 = 1 mês)** sem cobrar. |
| **Cupom** | Aplica um **Código do cupom** (desconto ou dias grátis). |
| **Cancelar assinatura** | **Quando cancelar:** "No fim do ciclo já pago" (o acesso continua até lá) ou "Agora (bloqueia o acesso)". |
| **Pausar cobrança / Retomar cobrança** | Suspende ou volta a gerar cobranças. |
| **Ativar assinatura** (faixa amarela, quando a empresa não tem) | Escolhe o plano e a quantidade de usuários; caixa **Gerar a primeira fatura agora** ("Coloca a empresa como Em dia com este plano… a primeira fatura gera o link de pagamento"). |
| **Liberar acesso** (faixa vermelha, empresa bloqueada) | "Como você está liberando?": **Recebi o valor por outro meio (baixa as faturas em aberto)** ou **Liberar por confiança (faturas continuam em aberto)**. Pede motivo. |
Todas as ações pedem **Motivo (mín. 5 caracteres)** e ficam no **Histórico de ajustes** no fim da ficha (quem fez, quando, o quê).

**Tabela de faturas da empresa** (abas Em aberto · Pagas · Devoluções · Canceladas · Comprovantes · Notas fiscais) com os botões por fatura (cada um só aparece para quem tem a permissão e se fizer sentido para aquela fatura):
| Botão | O que faz |
|---|---|
| **Gerar boleto** | Converte uma cobrança do Asaas em boleto: o PDF passa a ter linha digitável e código de barras. |
| **Fatura PDF** | Baixa a fatura em PDF com a logo. |
| **Copiar link** | Copia o link de pagamento (Pix, boleto ou cartão) para você enviar ao cliente. |
| **Desconto** | Dá um desconto só nesta fatura (percentual ou valor). |
| **Link Mercado Pago** | Gera link do Mercado Pago para fatura registrada só localmente (sem cobrança no Asaas). |
| **Cancelar** | Cancela a fatura (pede motivo). |
| **Reembolso parcial** / **Reembolso total** | Devolve parte ou tudo (só faturas pagas); acompanhe na aba Devoluções até o provedor confirmar. |
| **Sincronizar** | Consulta o provedor e atualiza a situação da fatura. Use se pagou e não atualizou. |
| **Emitir nota (Asaas)** / **Atualizar nota (Asaas)** | Agenda a nota fiscal de serviço no Asaas ou puxa a que já existe (fatura paga). |
| **NF / comprovante** | Anexa manualmente: Número da nota, link do PDF, link do XML, link do comprovante. |

## B3. Aba "Assinaturas"
"Gestão de assinaturas — Conta criada. Pagamento liberado. Renovação auditada." Lista todas as assinaturas (Empresa, Plano e precificação, Ciclo operacional, Financeiro, Acesso, Ações), com busca "empresa, plano ou contexto", **Detalhe da assinatura** (Precificação estimada: Base + Adicional = Total) e a **Auditoria** (quem criou, quem alterou, o que mudou).

## B4. Aba "Planos"
"Planos e precificação." **Novo plano** / editar: **Nome do plano**, Descrição, **Preço (R$)**, **Ciclo de cobrança** (Mensal, Trimestral, Anual), **Limite de usuários**, **Limite de colaboradores**, **Módulos incluídos**. Regras: plano pago precisa ter valor maior que zero. Ações em cada plano: editar, **Desativar plano** e **Excluir permanentemente**. Busca "Buscar plano…". Mudanças de preço valem para as cobranças futuras.

## B5. Aba "Cupons"
Lista (Código, Benefício, Validade, Situação) e botão **Editar**. Formulário de cupom: **Código** (ex.: LANCAMENTO20), Descrição, tipo de benefício (desconto em % ou R$), **Dias de teste grátis**, **Limite de usos**, **Mín. de usuários**, **Início** e validade, **Planos válidos**. **Limpar** zera o formulário. "Nenhum cupom cadastrado" se vazio.
