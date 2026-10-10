# Aba FUNCIONÁRIOS — botão por botão

**Para que serve:** é o cadastro das pessoas da empresa (a "ficha" de cada colaborador): dados pessoais, documentos, cargo, salário, jornada, escala, e a situação do login dele no sistema.

## Quem vê a aba
**Desenvolvedor, Administrador, RH - Empresas, Gestor e Consulta** (e só se o módulo "Funcionários" estiver ativo no plano). Funcionário, RH - R&S, CEO, Contábil e Comercial **não veem** esta aba no menu.

| Perfil | O que consegue fazer aqui |
|---|---|
| Administrador, RH - Empresas, Desenvolvedor | **Tudo**: cadastrar, editar, importar, dar/bloquear acesso, redefinir senha, desligar, excluir/arquivar. |
| RH - Empresas (somente ele) | Além do acima, baixa os **PDFs oficiais** (ficha cadastral, folha de ponto, ocorrências). |
| Gestor | Vê **apenas a própria equipe** ("Nenhum funcionário na sua equipe" se não tiver ninguém), abre o **Dossiê** e o **Ponto** de cada um. Não cadastra, não edita, não dá acesso. |
| Consulta | Vê a lista e o **Dossiê**, só leitura. |

---

## 1. Topo da tela

| Botão | O que é | Para que serve |
|---|---|---|
| **Importar XLSX** | Botão branco (só quem edita) | Cadastrar **vários funcionários de uma vez** por planilha do Excel. Veja a seção 6. |
| **Novo funcionário** | Botão roxo (só quem edita) | Abre o formulário completo para cadastrar **uma pessoa**. Veja a seção 5. |
| **Faixa roxa "Gerenciar usuários e acessos →"** | Atalho (só quem edita) | Leva para a aba **Usuários**, para criar logins sem ficha de funcionário ou mudar perfis e permissões. |

## 2. Os 4 quadradinhos de números
Só informam, não são botões: **Ativos**, **Em admissão**, **Férias / afastados** (inativos ou suspensos) e **Desligados**. Contam apenas as pessoas que o seu perfil pode ver.

## 3. Busca e filtros
- **Buscar funcionário** – digite nome, CPF, matrícula, gestor ou departamento.
- **Competência dos documentos** (mês) – escolhe de qual mês saem a **Folha de ponto**, as **Ocorrências** e o **Abrir ponto**. A frase embaixo da tabela lembra qual mês está valendo.
- **Filtros da equipe** (abre/fecha): **Status**, **Departamento**, **Gestor** (inclui "Sem gestor") e **Unidade**.
- **Limpar filtros** – tira todos os filtros de uma vez.
- Mostra "X de Y funcionários no escopo autorizado".

## 4. A lista (tabela no computador, cartões no celular)
Colunas: Funcionário, Matrícula, Gestor, Departamento, Cargo, **Status** (Ativo verde, Desligado vermelho, outros amarelo), **Acesso** e **Ações**.

**Coluna "Acesso" (o login da pessoa):**
- **Sem acesso** – o funcionário existe mas não tem login.
- **Ativo** (verde) – pode entrar.
- **Trocar senha** (amarelo) – tem senha provisória e ainda não fez o primeiro acesso.
- **Bloqueado** (vermelho) – login suspenso.

**Em cada linha há dois botões:**

### Botão "Dossiê"
Abre uma janela lateral só de **consulta** com o resumo completo da pessoa:
- Quadros: Status, quantidade de ASOs, de Férias e de Ocorrências.
- **Cadastro e acesso** (CPF, e-mail e telefone aparecem **mascarados** por privacidade; matrícula, cargo, departamento, admissão, desligamento).
- **Saúde ocupacional e ASO** (tipo, resultado, data do exame, vencimento, clínica).
- **Férias recentes** (período, situação, dias).
- **Batidas e ocorrências recentes** (entrada, saída e saldo do dia).
- Quadro amarelo **"Histórico relacionado: N registros"** (ponto, férias, ASO, ocorrências, fechamentos, escalas, chamados) — mostra o peso do histórico antes de excluir.

### Botão "Ações" (menu de três pontinhos)
| Opção | O que faz | Quem vê |
|---|---|---|
| **Criar acesso** | Abre a janelinha "Criar Acesso": informe **e-mail** (obrigatório), **nome** (opcional) e **perfil** (Funcionário, Gestor, RH, Administrador ou Consulta). Ao confirmar, o sistema mostra a **senha provisória** (vale 24 horas, aparece **uma vez só**, botão de copiar). A pessoa troca a senha no primeiro login. | Admin, RH, Dev |
| **Bloquear acesso** / **Desbloquear acesso** | Suspende o login da pessoa (ela não consegue entrar) ou devolve. Só aparece se ela já tem acesso. | Admin, RH, Dev |
| **Redefinir senha** | Gera uma **nova senha provisória** (24 h, mostrada uma vez, em janela "Senha provisória emitida" com o botão "Entendi"). Use quando a pessoa esqueceu a senha. | Admin, RH, Dev |
| **Ficha cadastral (PDF)** | Baixa a ficha oficial da pessoa. | só RH - Empresas |
| **Folha de ponto (PDF)** | Baixa o espelho de ponto do mês escolhido. | só RH - Empresas |
| **Ocorrências (PDF)** | Baixa as ocorrências (faltas, atrasos, atestados) do mês escolhido. | só RH - Empresas |
| **Abrir ponto** | Vai para a aba Escalas já no ponto daquela pessoa e mês. | Admin, RH, Dev e Gestor |
| **Editar cadastro** | Abre o formulário completo (seção 5) com os dados da pessoa. | Admin, RH, Dev |
| **Desligar funcionário** | Marca o cadastro como **Desligado** e cria um **ASO demissional pendente** (exame de saída). A data do desligamento pode ser colocada em "Editar cadastro". Pede confirmação. Fica desabilitado se já está desligado. | Admin, RH, Dev |
| **Excluir ou arquivar** | Consulta o histórico e: **se há histórico** (ponto, férias etc.) → **arquiva** (preserva tudo e bloqueia o acesso); **se não há nada** → **exclui de vez**. Para confirmar é preciso **digitar o nome da pessoa**. | Admin, RH, Dev |

---

## 5. Formulário "Novo funcionário" / "Editar cadastro"
"Cadastro completo em oito seções. Campos com * são obrigatórios." Botões no rodapé: **Seção anterior**, **Próxima seção**, **Cancelar** (pergunta "Descartar alterações?"), e **Salvar**. Se faltar algo, aparece "Revise os campos antes de salvar".

As 8 seções:
1. **Dados pessoais** – nome completo, CPF, data de nascimento, e-mail, telefone e telefone secundário, matrícula, gênero, estado civil, escolaridade, nome da mãe e do pai, naturalidade, nacionalidade, caixa "Primeiro emprego".
2. **Documentos** – PIS/PASEP/NIT, RG (órgão emissor, UF, data de emissão), título de eleitor (número, seção), reservista/militar.
3. **Endereço** – CEP, logradouro, número, complemento, bairro, cidade, estado, observações cadastrais.
4. **Dados profissionais** – data de admissão, status, data de demissão, departamento, cargo, operação/unidade, gestor.
5. **Jornada** – escala (5x2, 6x1, 12x36…), descrição da escala, jornada diária padrão, entrada, saída para almoço, retorno do almoço e saída padrão.
6. **Dados bancários** – banco, agência, conta, tipo de conta.
7. **Dependentes** – nome, CPF, data de nascimento e parentesco de cada dependente.
8. **Contrato e acesso** – salário (R$), tipo de contrato, CNPJ/razão social/nome fantasia (para PJ), caixa **"Permitir acesso ao painel"** e **perfil de acesso**. Se marcar o acesso, ao salvar aparece a janela **"Funcionário criado com acesso"** com a **senha provisória**.

> Quem **não** tem permissão de editar vê "Este perfil não permite cadastrar ou editar funcionários" e o botão "Voltar para Funcionários".

## 6. Tela "Importar funcionários"
Subtítulo: "Baixe o modelo XLSX, valide o arquivo e revise os dados antes de confirmar. Limites: 2 MB e 2.000 linhas." Passos:
1. **Baixar modelo XLSX** – planilha pronta para preencher.
2. **Selecionar ou substituir arquivo** (e **Remover arquivo**) – escolhe a planilha preenchida.
3. **Revisão do arquivo** – o sistema confere e mostra **erros por linha** e uma **prévia** dos funcionários. Corrija a planilha e valide de novo se houver erro.
4. **Confirmar importação?** – grava tudo.
5. **Resultado da importação** – detalhes do que foi criado/recusado e o botão **Ver todos os funcionários**.
Quem não pode importar vê "Este perfil não permite importar funcionários."
