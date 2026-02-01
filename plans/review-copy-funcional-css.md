# Revisão final — Copy, Funcional e CSS

Escopo: revisão de textos, validação funcional por leitura de código, e limpeza/padronização de estilos (Flutter + Web). Baseado nos arquivos do app Flutter e no protótipo web.

## 1) COPY / TEXTOS (obrigatório)

### App Flutter (Candidato)

#### Login
Fonte: [`innovation_app/lib/presentation/screens/login_screen.dart`](innovation_app/lib/presentation/screens/login_screen.dart)

**Textos atuais**
- Título: “Innovation”
- Campos: “Email”, “Senha”, “Código 2FA”
- Botões: “Entrar”, “Validar código”, “Criar conta”, “Esqueci a senha”
- Erros: “Credenciais inválidas”, “Código inválido”
- Loading: “Entrando...”, “Validando...”

**Sugestões (padronização/UX)**
- Título: “Innovation” → “Innovation.ia” (identidade do produto)
- “Email” → “E-mail” (PT-BR)
- “Código 2FA” → “Código de verificação” (sem termo técnico)
- Erro de login: “Credenciais inválidas” → “E-mail ou senha inválidos”
- Erro 2FA: “Código inválido” → “Código incorreto. Tente novamente.”
- Botão “Validar código” → “Confirmar código”
- Adicionar subtítulo curto: “Entre para acompanhar suas candidaturas”

#### Cadastro
Fonte: [`innovation_app/lib/presentation/screens/register_screen.dart`](innovation_app/lib/presentation/screens/register_screen.dart)

**Textos atuais**
- Título: “Criar Conta”
- Campos: “Nome completo”, “Email”, “Telefone (com DDI)”, “Senha”
- CTA: “Continuar”
- Erro: “Falha ao cadastrar”
- Loading: “Enviando...”

**Sugestões**
- “Email” → “E-mail”
- “Telefone (com DDI)” → “Telefone com DDD” (mais comum no BR)
- Erro: “Falha ao cadastrar” → “Não foi possível criar sua conta. Tente novamente.”
- CTA “Continuar” → “Criar conta” (mais direto)

#### Recuperar senha
Fonte: [`innovation_app/lib/presentation/screens/reset_password_screen.dart`](innovation_app/lib/presentation/screens/reset_password_screen.dart)

**Textos atuais**
- Título: “Recuperar Senha”
- Campo: “Email”
- CTA: “Enviar link”

**Sugestões**
- “Email” → “E-mail”
- CTA: “Enviar link” → “Enviar link de recuperação”
- Adicionar texto de apoio: “Enviaremos um link para redefinir sua senha.”

#### Dashboard / Vagas
Fonte: [`innovation_app/lib/presentation/screens/dashboard_screen.dart`](innovation_app/lib/presentation/screens/dashboard_screen.dart)

**Textos atuais**
- Banner legal: “Aviso legal: a Innovation não gera folha nem calcula impostos.”
- Título: “Vagas disponíveis”
- Erro: “Falha ao carregar vagas. Verifique sua conexão.”
- Vazios: “Nenhuma vaga disponível no momento.” / “Tente novamente mais tarde.”
- CTA: “Inscrever-se”
- Status: “Status: {status}”

**Sugestões**
- Banner legal: “Aviso: a Innovation não calcula folha de pagamento nem impostos.”
- CTA: “Inscrever-se” → “Candidatar-se” (terminologia de recrutamento)
- Status: “Status: {status}” → “Status da candidatura: {status}”
- Ajustar mensagem de erro para ação: “Não foi possível carregar vagas. Tente novamente.”

#### Histórico de documentos
Fonte: [`innovation_app/lib/presentation/screens/document_history_screen.dart`](innovation_app/lib/presentation/screens/document_history_screen.dart)

**Textos atuais**
- Título: “Meus Documentos”
- Erro: “Falha ao carregar documentos.”
- Vazio: “Nenhum documento encontrado.”
- CTA: “IA” / SnackBar: “IA informativa disponível para planos habilitados.”

**Sugestões**
- CTA “IA” → “Análise IA”
- SnackBar: “Análise IA disponível para planos com este recurso.”
- Erro: “Falha ao carregar documentos.” → “Não foi possível carregar seus documentos.”

#### Termos de uso
Fonte: [`innovation_app/lib/presentation/screens/terms_screen.dart`](innovation_app/lib/presentation/screens/terms_screen.dart)

**Textos atuais**
- Título: “Termos de Uso - Innovation”
- Conteúdo longo com termos técnicos e placeholder de foro
- CTA: “Aceitar”

**Sugestões**
- Título: “Termos de uso e privacidade”
- Subtítulo: “Leia e aceite para continuar.”
- Remover caixa alta, simplificar linguagem jurídica (versão resumida + link para versão completa)
- Substituir “[Sua Cidade/UF]” por texto real ou remover até ter base legal

#### Planos
Fonte: [`innovation_app/lib/presentation/screens/plans_screen.dart`](innovation_app/lib/presentation/screens/plans_screen.dart), [`innovation_app/lib/services/payment_service.dart`](innovation_app/lib/services/payment_service.dart)

**Textos atuais**
- Título: “Pagamento”
- Texto: “Selecione um plano e complete o pagamento inicial de forma segura.”
- CTA: “CONFIRMAR PAGAMENTO”
- “Voltar para Entrar”
- Badge: “Selecionado”
- Plano/Features: “Plano Pessoal/Profissional/Empresarial”

**Sugestões**
- Título: “Escolha seu plano”
- Texto: “Selecione um plano e continue para pagamento.”
- CTA: “Continuar para pagamento”
- “Voltar para Entrar” → “Voltar para o login”
- Features: padronizar com verbos (ex.: “Até 5 usuários”, “Acesso avançado”) e evitar redundâncias

#### Pagamento
Fonte: [`innovation_app/lib/presentation/screens/payment_screen.dart`](innovation_app/lib/presentation/screens/payment_screen.dart)

**Textos atuais**
- Texto: “Por favor, complete o pagamento inicial para ativar sua conta.”
- Método: “Cartão de crédito ou débito”, “PIX”
- Campo de validade/segurança: “Data de validade”, “MM/AA” (associado ao CVV)
- CTA: “CONFIRMAR PAGAMENTO”

**Sugestões**
- Texto: “Finalize o pagamento para ativar sua conta.”
- Campo CVV: ajustar placeholder para “CVV” (hoje aparece “MM/AA” no campo errado)
- CTA: “Confirmar pagamento” (sem caixa alta)

### Web Admin (ADM, N1, N2)

#### ADM
Fonte: [`web-test/index.html`](web-test/index.html)

**Textos atuais**
- Título: “Admin - Dashboard”
- H1: “ADM”
- Links: “N1 - Vagas”, “N2 - Empresa”

**Sugestões**
- Título: “Painel da empresa”
- H1: “Painel administrativo”
- Links: “Vagas” e “Configurações da empresa”

#### N1 – Vagas + Candidaturas
Fonte: [`web-test/jobs.html`](web-test/jobs.html)

**Textos atuais**
- H1: “N1 - Vagas”
- Texto: “Selecione uma vaga para ver candidatos e atualizar status.”
- Estados: “Carregando vagas...”, “Nenhuma vaga encontrada.”, “Carregando candidaturas...”, “Nenhuma candidatura para esta vaga.”, “Erro ao carregar vagas.”, “Erro ao carregar candidaturas.”
- Ações: “Ver candidaturas”, “Ver histórico”
- Status: “Recebida / Em análise / Aprovada / Rejeitada”

**Sugestões**
- H1: “Vagas”
- Texto: “Selecione uma vaga para ver candidaturas e atualizar status.”
- Ação “Ver candidaturas” → “Ver candidaturas da vaga”
- Erros: padronizar para “Não foi possível carregar …”

#### N2 – Empresa
Fonte: [`web-test/settings.html`](web-test/settings.html)

**Textos atuais**
- H1: “N2 - Configurações”
- Texto: “Empresa ativa”

**Sugestões**
- H1: “Configurações da empresa”
- Texto: “Status da empresa: ativa” (com variação para bloqueada)

### Mensagens de status (padronização)
Fonte: [`innovation_app/lib/models/application.dart`](innovation_app/lib/models/application.dart)

**Padrão atual**
- received → “Recebida”
- in_review → “Em análise”
- approved → “Aprovada”
- rejected → “Rejeitada”

**Recomendação**
- Manter como padrão global em App e Web.
- Sempre exibir como “Status da candidatura: {label}”.

### Onboarding / mensagens de bloqueio por plano
**Status**: não há textos explícitos no app. Sugestão de placeholders:
- Bloqueio por plano: “Seu plano atual não inclui este recurso.”
- CTA: “Ver planos” / “Fazer upgrade”

### Páginas públicas de vagas
**Status**: não localizadas no workspace. É necessário mapear onde o HTML público será renderizado.

---

## 2) VALIDAÇÃO FUNCIONAL (por leitura de código)

### Fluxo candidato (App)

**Login** — Implementado, com 2FA opcional
- OK: [`innovation_app/lib/services/auth_service.dart`](innovation_app/lib/services/auth_service.dart)
- Mensagens tratadas no UI: [`innovation_app/lib/presentation/screens/login_screen.dart`](innovation_app/lib/presentation/screens/login_screen.dart)

**Visualização de vagas** — Implementado
- API: `/jobs` via [`innovation_app/lib/services/api_client.dart`](innovation_app/lib/services/api_client.dart)
- UI: [`innovation_app/lib/presentation/screens/dashboard_screen.dart`](innovation_app/lib/presentation/screens/dashboard_screen.dart)

**Candidatura** — Implementado
- POST `/applications` no dashboard

**Status da candidatura** — Implementado
- `/applications/me` e label por status

**Pontos incompletos**
- Reset de senha não executa ação real (placeholder): [`innovation_app/lib/services/auth_service.dart`](innovation_app/lib/services/auth_service.dart)
- Termos de uso extensos e com placeholder de foro (risco legal): [`innovation_app/lib/presentation/screens/terms_screen.dart`](innovation_app/lib/presentation/screens/terms_screen.dart)

### Fluxo empresa (Web)

**Dashboard (ADM)** — Só navegação
- Página estática (sem dados reais)

**Gestão de vagas (N1)** — Parcial
- Lista de vagas + candidaturas + status + histórico via API
- Sem autenticação/assinatura na web-test (endpoints reais podem exigir JWT e assinatura)

**Configurações da empresa (N2)** — Incompleto
- Página estática, sem API

**Visualização de candidatos** — Implementado via N1
- Exibe candidate_user_id (sem detalhes do candidato)

**Bloqueio por plano**
- Backend exige assinatura ativa em `/applications/company` e `/jobs/company` (pode retornar 402)
- Web-test não trata estado 402, não exibe copy de bloqueio

**Checklist resumido**
- Funciona: listagem vagas (N1), listar candidaturas por vaga, alterar status, histórico (se API válida e autenticada)
- Não funciona/indefinido: autenticação no web-test, bloqueio por plano, N2 real, páginas públicas

---

## 3) REVISÃO E LIMPEZA DE CSS / ESTILOS

### Flutter (prioridade alta)

**Pontos para remover/limpar**
- Função `_profileChoice` não usada em [`innovation_app/lib/presentation/screens/register_screen.dart`](innovation_app/lib/presentation/screens/register_screen.dart)
- Trechos duplicados de `InputDecoration` em múltiplas telas (login, register, reset)

**Padronizar**
- Cores e tipografia: centralizar em um `ThemeData` ou helpers no [`innovation_app/lib/theme/app_theme.dart`](innovation_app/lib/theme/app_theme.dart)
- Botões: evitar textos em caixa alta; definir `TextStyle` padrão
- Espaçamentos: criar constantes (ex.: `kGapSm`, `kGapMd`) para reduzir repetição
- Inputs: criar widget comum `AppTextField`

**Redução de complexidade visual**
- Gradientes variam entre telas (ex.: `PlansScreen`/`PaymentScreen` usam gradiente diferente). Definir 1 gradiente base para todo o app.

### Web (HTML + JS)

**Status atual**
- Não há CSS. Estilos inline mínimos no N1. Nenhuma folha global.

**Limpeza e padronização**
- Criar um `styles.css` simples e reutilizar nos 3 HTMLs.
- Centralizar espaçamento, tipografia, estados de botão.
- Remover estilos inline e converter para classes.

---

## 4) Padronização de termos (glossário)

**Recomendado**
- “Candidatar-se” (CTA) / “Candidatura” (substantivo)
- “E-mail” (sempre com hífen)
- “Painel administrativo” (web)
- “Status da candidatura”

---

## 5) Prioridades de execução

1. Ajustar copy nas telas críticas (login, cadastro, vagas, status).
2. Tratar estados de erro/bloqueio no web-test (mensagens 402 e 401).
3. Consolidar tema/estilos no Flutter.
4. Criar CSS mínimo compartilhado para o Web.

