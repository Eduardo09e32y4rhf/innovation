# Aba USUÁRIOS — botão por botão

**Para que serve:** controlar **quem pode entrar no sistema** da empresa, com qual **visão** (perfil) e com quais permissões. Aqui você cria o login das pessoas, bloqueia, cancela, troca a visão e entrega a senha provisória.

> Usuário (login) é diferente de Funcionário (cadastro de RH). O funcionário é a ficha da pessoa; o usuário é a chave de entrada. Um funcionário pode existir sem login. Um login pode existir sem ficha (ex.: um contador externo).

## Quem vê esta aba
Só **Desenvolvedor, CEO, Administrador e RH - Empresas**. Os outros perfis veem "Acesso restrito — Seu perfil não gerencia usuários."

## Quem pode criar/alterar quem
Ninguém mexe em perfil acima do seu:
| Quem está logado | Pode criar e alterar usuários das visões |
|---|---|
| Desenvolvedor | todas |
| CEO | Administrador, RH - Empresas, RH - R&S, Gestor, Funcionário, Consulta |
| Administrador | Administrador, RH - Empresas, RH - R&S, Gestor, Funcionário, Consulta |
| RH - Empresas | RH - Empresas, RH - R&S, Gestor, Funcionário, Consulta |

Você também **nunca altera o seu próprio acesso** (não muda a própria visão, não se bloqueia).

---

## 1. Parte de cima da tela

| Item | O que é | Para que serve |
|---|---|---|
| **"X de Y licenças"** (etiqueta) | Contador de licenças | Mostra quantos acessos ativos a empresa usa e quantos o plano permite. Fica **amarelo** quando todas as licenças acabaram. Quando acabam, não dá para criar novo acesso (veja "Faturas → Alterar usuários"). |
| **Botão ↻ (Atualizar lista)** | Setinhas girando | Recarrega a lista e as licenças, caso outra pessoa tenha mexido. |
| **Botão "+ Novo acesso"** | O **+** que você citou | Abre a janela para **dar login a alguém novo**. Veja a seção 4. |

## 2. Filtros e busca

| Item | Para que serve |
|---|---|
| **Caixa "Buscar por nome, e-mail, empresa ou matrícula"** | Encontra a pessoa digitando qualquer pedaço (não precisa de acento). |
| **"Todas as visões"** (lista) | Mostra só quem tem a visão escolhida (ex.: só Gestores). |
| **"Todas as empresas"** (lista, só Desenvolvedor) | Mostra só os usuários de uma empresa. |
| **Pílulas Todos · Ativos · Bloqueados · Cancelados** | Filtram pela situação do acesso. O número ao lado é quantos existem em cada situação. |

## 3. A lista de usuários
Cada linha mostra: bolinha com a inicial, **nome**, **empresa**, etiqueta de situação (**Ativo** verde, **Bloqueado** amarelo, **Cancelado** vermelho) e o botão **Editar**.
- **Clicar no nome ou em "✎ Editar"** abre a ficha do usuário (seção 5).
- **Anterior / Próxima** (aparecem quando há mais de 25): mudam de página.
- "Nenhum usuário encontrado" = nada bate com a busca/filtros.

---

## 4. Janela "Novo acesso" (botão +)

Serve para **liberar o login de alguém**. A pessoa recebe uma **senha provisória forte**, gerada pelo sistema e mostrada **uma única vez**.

**Passo 1 – escolha quem vai receber:**
- **"Funcionário já cadastrado"** — liga o login à ficha existente (traz matrícula, gestor e dados). Use para colaboradores. Aparece uma busca "Buscar funcionário sem acesso" (nome, matrícula ou e-mail) listando só quem **ainda não tem login**. Clique no nome para escolher; o botão **"trocar"** desfaz a escolha.
- **"Pessoa sem cadastro"** — login solto, sem ficha de funcionário. A pessoa só acessa conforme a visão escolhida (ex.: contador externo, dono).

**Empresa** (só Desenvolvedor): escolha em qual empresa criar.

**Passo 2 – dados:**
- **Nome** e **E-mail de acesso** (o e-mail é o login). Quando você escolhe um funcionário, já vêm preenchidos.
- **Visão (perfil de acesso):** cartões para escolher o que a pessoa enxergará:
  - **Desenvolvedor** – plataforma completa, todas as empresas.
  - **CEO** – indicadores e visão executiva da plataforma.
  - **Contábil** – financeiro, planos, cupons, contratos e fechamentos.
  - **Comercial** – carteira de clientes, propostas e contratos.
  - **Administrador** – administra toda a empresa: usuários, configurações e cobrança.
  - **RH - Empresas** – pessoas: funcionários, escalas, férias, vagas e fechamento.
  - **RH - R&S** – recrutamento e seleção: acesso somente às vagas e candidaturas.
  - **Gestor** – sua equipe: aprova pedidos e ajusta escalas.
  - **Funcionário** – seus próprios dados, ponto, escala e solicitações.
  - **Consulta** – acompanha informações em modo somente leitura.
  (Você só vê as visões que o seu perfil pode criar.)

**Botões:**
- **Cancelar** – fecha sem criar nada.
- **Criar acesso** – cria o login. Se as licenças acabaram, o sistema avisa: "A empresa usou todas as licenças contratadas. Aumente as licenças em Plano e cobrança…".

**Tela "Acesso criado":** mostra o e-mail e a **senha provisória**.
- **Copiar** – copia a senha para colar numa mensagem.
- **Concluir** – fecha. A senha **não aparece de novo aqui**, mas dá para ver/gerar outra depois na aba Segurança da ficha.
- A pessoa será obrigada a **trocar a senha no primeiro acesso**. A senha provisória tem validade (a data é mostrada).

---

## 5. Ficha do usuário (ao clicar em Editar)
Abre uma janela lateral com o nome da pessoa, empresa e visão no topo, e **4 abas**. Se você **não pode gerenciar** aquela pessoa (perfil acima do seu, ou é você mesmo), a janela fica só para consulta e avisa: "Este é o seu acesso." ou "Seu perfil só pode consultar este usuário."

Se o acesso estiver bloqueado/cancelado, aparece uma faixa amarela com o motivo e a data.

### Aba "Dados e visão"
- **Nome** e **E-mail** – editáveis.
- **Visão** – cartões para trocar o perfil (mesmas descrições da criação). Você não pode trocar a sua própria.
- **Botão "Salvar alterações"** – só liga quando algo mudou.
- **Quadro "Vínculo com funcionário (opcional)":**
  - Se já há vínculo: mostra o funcionário (matrícula, cargo, setor) e o botão **"Desatrelar"** — remove a ligação; a pessoa continua entrando conforme a visão.
  - Se não há: busca "Buscar funcionário sem acesso" para **atrelar** (clicar no nome). Útil, por exemplo, quando o dono também é colaborador. Se não aparece ninguém: "Cadastre o funcionário primeiro na área Funcionários."
- **Rodapé informativo:** Último acesso (ou "Nunca acessou"), Criado em, Empresa.

### Aba "Atividade"
Histórico de **tudo o que a pessoa fez nos últimos 30 dias**, atualizado sozinho a cada 5 segundos.
- **Botão "Ao vivo / Pausado"** – liga/desliga a atualização automática.
- **Botão "PDF dos últimos 30 dias"** – baixa o relatório (até 2.000 registros).
- **Filtros:** Tudo · Páginas (telas visitadas) · Alterações (o que mudou, com valor antigo riscado → novo) · Logins · Segurança · Acesso.
- Cada registro mostra o que foi feito, quando, de qual **IP** e (se foi outra pessoa) **por quem**.
- Serve para auditoria: saber quem mexeu em quê.

### Aba "Permissões"
Por padrão a pessoa segue as permissões da sua visão. Aqui você abre **exceções**.
- **"Padrão da visão"** – usa o que o perfil já tem.
- **"Personalizar"** – libera as caixinhas para marcar/desmarcar. As opções são:
  Bater ponto · Ver próprio ponto · Ver ponto da equipe · Ver ponto de toda a empresa · Aprovar ponto da equipe (manual) · Aprovar ponto de todos (manual) · Solicitar férias para si · Solicitar férias para equipe · Aprovar férias · Mudar própria senha · Mudar senha da equipe · Mudar senha de todos · Visualizar equipe · Gerenciar funcionários (Aba RH) · Ver Ficha do Funcionário · Gerenciar acessos do RH · Deletar/Demitir funcionários · Acessar aba Plataforma / Gestão Superior · Visualizar financeiro da Plataforma · Faturas: ver faturas, comprovantes e notas fiscais · pagar faturas em aberto · anexar nota fiscal e comprovante · gerar cobranças, trocar plano e cancelar · dar desconto, cupom e dias grátis · reembolsar pagamentos · ver todas as empresas · trocar plano e usuários da própria empresa.
- **"Salvar permissões"** – grava.
- Aviso na tela: o perfil **RH - Empresas** acessa as áreas da empresa e Vagas. Para liberar **somente recrutamento**, troque a visão para **RH - R&S** na aba "Dados e visão".

### Aba "Segurança"
- Mostra: **Última troca de senha**, **Tentativas inválidas** de login e **Troca obrigatória** (se a pessoa será forçada a trocar a senha no próximo login).
- Quadro **"Senha provisória":**
  - **"Ver senha provisória"** – mostra de novo a senha entregue, **enquanto a pessoa ainda não trocou** a do primeiro acesso.
  - **"Gerar nova senha"** – cria outra senha provisória e **invalida a anterior**. Use quando a pessoa perdeu a senha ou o acesso novo não chegou.
  - A senha aparece numa caixa amarela com a validade; repasse com segurança.

### Rodapé da ficha (botões de situação do acesso)
Mostra a etiqueta de situação e:
| Botão | O que faz | Quando usar |
|---|---|---|
| **Bloquear** | A pessoa **não consegue entrar** até você reativar. Mantém vínculo e histórico. Pede um motivo (opcional, fica registrado). | Suspensão temporária, suspeita de uso indevido, afastamento. |
| **Cancelar acesso** | A pessoa **perde o acesso** e é **desatrelada** do funcionário. Dá para reativar depois. Pede motivo. | Desligamento. |
| **Reativar acesso** | Volta a permitir a entrada de quem está bloqueado/cancelado. | Quando a pessoa retorna. |
| **Excluir usuário** | Só aparece para acesso **não ativo**. **Apaga o login de vez** e **libera a licença**. O funcionário continua cadastrado e o histórico fica na auditoria. **Não tem como desfazer.** | Limpeza de acessos que não serão mais usados. |

Os botões Bloquear/Cancelar/Excluir abrem uma janela de confirmação com a campo **"Motivo (fica registrado no histórico)"**, botão **Voltar** (desiste) e o botão de confirmar.

---

## O que cada perfil faz nesta aba
- **Desenvolvedor:** vê usuários de **todas** as empresas (filtro por empresa), cria em qualquer empresa e gerencia todas as visões.
- **CEO:** gerencia Administrador, RH, RH - R&S, Gestor, Funcionário e Consulta.
- **Administrador:** gerencia todos os acessos da própria empresa (inclusive outros Administradores), sem alterar o próprio.
- **RH - Empresas:** cria e gerencia RH, RH - R&S, Gestor, Funcionário e Consulta; **não** mexe em Administrador.
- **Os demais** (RH - R&S, Gestor, Funcionário, Consulta, Comercial, Contábil): não veem a aba.
