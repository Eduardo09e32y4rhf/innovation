# Aba CONFIGURAÇÕES — botão por botão

**Para que serve:** ajustes **pessoais** (seu perfil, sua senha, sua segurança) e, para quem administra a empresa, ajustes **da empresa** (dados, feriados, regra de hora extra, importação/exportação).

**Quem vê:** todos os perfis veem a aba, mas **cada perfil vê só as seções que lhe cabem**:

| Seção (menu lateral) | Todos | Administrador / RH / Desenvolvedor |
|---|---|---|
| **Pessoal → Meu perfil** | ✔ | ✔ |
| **Pessoal → Segurança** | ✔ | ✔ |
| **Empresa → Dados da empresa** | — | ✔ |
| **Empresa → Feriados** | — | ✔ |
| **Empresa → Hora extra e banco** | — | ✔ |
| **Empresa → Usuários e acessos** | — | ✔ |
| **Empresa → Importar e exportar** | — | ✔ |

Perfis **CEO, Contábil, Comercial, Gestor, Funcionário e Consulta** veem **somente** "Meu perfil" e "Segurança".

No topo há um cartão com suas iniciais, o nome da tela, e "seu nome · seu perfil · sua empresa".

---

## 1. Meu perfil — "Seus dados e senha"
- **Minha conta**: mostra seus dados (nome, e-mail, perfil). **Não dá para editar nome ou e-mail aqui**: "Para mudar nome ou e-mail, peça ao RH ou ao administrador da empresa."
- **Alterar senha**: campos **senha atual**, **nova senha** e **repetir a nova senha**.
  - A tela mostra os **Requisitos da senha** e vai marcando o que já foi cumprido.
  - Avisos: "As senhas não são iguais." e "A nova senha precisa ser diferente da atual."
  - Botão **Salvar nova senha**.

## 2. Segurança — "Verificação em duas etapas e sessões"
- **Verificação em duas etapas**: "Além da senha, o login pede um código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator…)."
  - Mostra a **Situação** (ligada / desligada). Para alguns perfis aparece "**Obrigatória para o seu perfil**".
  - **Ativar agora** → a tela mostra um **QR Code**: "Abra o aplicativo autenticador e leia o QR Code (ou digite a chave abaixo)". Digite o código de 6 números que o aplicativo mostrar e clique em **Confirmar e ativar**.
  - Depois aparecem os **códigos de recuperação**: "Guarde estes códigos de recuperação agora. Eles não aparecem de novo." Botão **Já guardei**. (Servem se você perder o celular.)
  - Para desligar, há o botão correspondente (quando o seu perfil não é obrigado a ter).
- **Onde sua conta está conectada**: "Um aparelho por linha. Encerre os que você não reconhece." Lista cada aparelho/navegador logado (o seu aparece como **Este aparelho**).
  - Botão **Encerrar** em cada linha (desloga aquele aparelho).
  - Botão **Encerrar todas as outras** (deixa só o aparelho atual).
  - "Nenhuma sessão ativa encontrada" se não houver.

## 3. Dados da empresa — "Cadastro, endereço e logo" (Admin, RH, Dev)
Campos: **Razão social, nome fantasia, CNPJ, telefone, e-mail e endereço** da empresa.
- **Logo da empresa**: "Aparece nos documentos e PDFs. PNG, JPG ou WebP, até 1 MB." Botão para enviar/trocar a imagem.
- **Salvar alterações**.
- Só RH ou Administrador alteram; os demais perfis veem "Somente o RH ou o administrador podem alterar os dados da empresa."

## 4. Feriados — "Calendário usado no ponto e na folha" (Admin, RH, Dev)
"Os feriados valem para a escala, o ponto e a folha. Adicione os da sua cidade e estado como Municipal ou Estadual."
- A lista já vem com os **feriados nacionais** (Confraternização Universal, Tiradentes, Dia do Trabalho, Independência do Brasil, Nossa Senhora Aparecida, Proclamação da República, Consciência Negra, Sexta-feira Santa, Corpus Christi…).
- **+ Novo feriado** – adiciona uma linha: **Nome do feriado**, **data** e **Abrangência** (Nacional, Estadual ou Municipal).
- **Remover feriado** (lixeira) em cada linha.
- **Salvar feriados** – só liga quando há mudança ("Há alterações não salvas."). Exige nome e data em todas as linhas.

## 5. Hora extra e banco — "Pagar na folha ou usar banco de horas" (Admin, RH, Dev)
"Define o que acontece com a hora extra autorizada. A mudança vale para os próximos lançamentos; o que já foi lançado não é alterado."
- **Política de hora extra** (escolha uma):
  - **Pagar na folha** – "A hora extra autorizada é paga no salário do mês. Não há banco de horas e o funcionário não solicita folga de banco."
  - **Banco de horas** – "A hora extra autorizada vira saldo no banco, que o funcionário pode usar em folga dentro do prazo de validade."
  - (e a opção de **dividir** parte para pagar e parte para o banco, quando o lançamento for feito dessa forma).
- **Validade do banco (meses)** – "Horas mais antigas que isso deixam de contar no saldo. Padrão: 3 meses."
- **Salvar política**.

## 6. Usuários e acessos
Tela de atalho: explica que "criar acessos, atrelar a funcionários, mudar a visão, bloquear, cancelar ou excluir usuários, gerar senha provisória e ver o histórico de cada pessoa ficam na tela de Usuários" e tem o botão **Abrir Usuários** (leva à aba Usuários — veja o manual dela).

## 7. Importar e exportar — "Planilhas de funcionários e férias" (Admin, RH, Dev)
- **Exportar planilhas** – "Abre no Excel. Contém dados pessoais: guarde com cuidado." Um botão para cada planilha: **Funcionários** (cadastro completo: matrícula, departamento etc.) e **Férias** (pedidos e períodos). Se não houver dados: "Não há dados para exportar."
- **Importar funcionários** – três passos: **Modelo XLSX** (baixa a planilha-modelo), escolher o **Arquivo XLSX** preenchido e **Validar arquivo**; se houver problemas, a tela mostra "Corrija o arquivo e valide novamente." e aponta as linhas. Só depois de validado dá para confirmar a importação. (É o mesmo fluxo de Funcionários → Importar XLSX.)
