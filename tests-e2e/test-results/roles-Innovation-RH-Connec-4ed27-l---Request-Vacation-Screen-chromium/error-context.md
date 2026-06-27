# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roles.spec.js >> Innovation RH Connect - E2E Role and Permission Tests >> 7. Test Ferias Disponivel - Request Vacation Screen
- Location: specs\roles.spec.js:152:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.sidebar-nav-item:has-text("Férias")')
    - locator resolved to <a href="/dashboard/vacations" class="sidebar-nav-item shrink-0 sidebar-nav-idle">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-sm sm:px-5">…</div> from <main class="flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-y-auto">…</main> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-sm sm:px-5">…</div> from <main class="flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-y-auto">…</main> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-sm sm:px-5">…</div> from <main class="flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-y-auto">…</main> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e6]:
        - img "Logo da empresa" [ref=e8]
        - generic [ref=e9]:
          - paragraph [ref=e10]: Innovation
          - paragraph [ref=e11]: 10.222.220/0002-00
      - navigation [ref=e12]:
        - link "Dashboard" [ref=e13] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e14]
          - generic [ref=e19]: Dashboard
        - link "Ponto" [ref=e20] [cursor=pointer]:
          - /url: /dashboard/time-track
          - img [ref=e21]
          - generic [ref=e24]: Ponto
        - link "Férias" [ref=e25] [cursor=pointer]:
          - /url: /dashboard/vacations
          - img [ref=e26]
          - generic [ref=e28]: Férias
        - link "Gestão" [ref=e29] [cursor=pointer]:
          - /url: /dashboard/management
          - img [ref=e30]
          - generic [ref=e35]: Gestão
        - link "Configurações" [ref=e36] [cursor=pointer]:
          - /url: /dashboard/settings
          - img [ref=e37]
          - generic [ref=e40]: Configurações
      - generic [ref=e43]:
        - generic [ref=e44]: FT
        - generic [ref=e45]:
          - paragraph [ref=e46]: Ferias Disponivel Teste
          - paragraph [ref=e47]: Funcionário
    - main [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - paragraph [ref=e51]: Innovation RH Connect
          - heading "Gestão de pessoas e jornada" [level=1] [ref=e52]
        - generic [ref=e53]:
          - button [ref=e55] [cursor=pointer]:
            - img [ref=e56]
          - button "Sair" [ref=e59] [cursor=pointer]:
            - img [ref=e60]
            - text: Sair
      - generic [ref=e64]:
        - generic [ref=e66]:
          - img [ref=e68]
          - generic [ref=e71]:
            - paragraph [ref=e72]: LGPD e privacidade
            - heading "Termos de Uso e Política de Privacidade" [level=2] [ref=e73]
            - paragraph [ref=e74]: Para acessar o sistema, confirme que leu e compreendeu as regras de uso e tratamento de dados pessoais no contexto de RH.
        - generic [ref=e75]:
          - generic [ref=e76]:
            - generic [ref=e77]:
              - paragraph [ref=e78]: Controlador
              - paragraph [ref=e79]: Empresa cliente responsável pelos dados pessoais de seus colaboradores, prestadores e usuários.
            - generic [ref=e80]:
              - paragraph [ref=e81]: Operador
              - paragraph [ref=e82]: Innovation RH Connect, que processa dados no SaaS conforme instruções da empresa cliente.
            - generic [ref=e83]:
              - paragraph [ref=e84]: Finalidade
              - paragraph [ref=e85]: Uso do sistema SaaS para gestão de RH, departamento pessoal, colaboradores, ponto, jornada, férias, comunicação operacional, folha operacional e registros administrativos, conforme bases legais aplicáveis da LGPD.
            - generic [ref=e86]:
              - paragraph [ref=e87]: Versão do termo
              - paragraph [ref=e88]: lgpd-rh-v1.1.0
          - generic [ref=e89]:
            - article [ref=e90]:
              - heading "1. Finalidade do sistema" [level=3] [ref=e91]
              - paragraph [ref=e92]: O Innovation RH Connect é utilizado para apoiar rotinas de RH, departamento pessoal, controle de ponto, férias, jornada, comunicação operacional, cadastro de colaboradores, relatórios e registros administrativos da empresa cliente.
            - article [ref=e93]:
              - heading "2. Papéis na LGPD" [level=3] [ref=e94]
              - paragraph [ref=e95]: A empresa cliente é a controladora dos dados pessoais de seus colaboradores e define as finalidades do tratamento. O Innovation RH Connect atua como operador, processando dados conforme instruções da empresa cliente e medidas de segurança aplicáveis.
            - article [ref=e96]:
              - heading "3. Dados tratados" [level=3] [ref=e97]
              - paragraph [ref=e98]: Podem ser tratados dados como nome, CPF, e-mail, telefone, cargo, departamento, matrícula, vínculo, jornada, ponto, férias, histórico funcional, registros administrativos e informações necessárias para cumprimento de obrigações legais, contratuais e trabalhistas.
            - article [ref=e99]:
              - heading "4. Dados sensíveis" [level=3] [ref=e100]
              - paragraph [ref=e101]: Quando houver tratamento de dados sensíveis, como dados de saúde em atestados, informações biométricas ou dados exigidos por obrigações trabalhistas, o uso deve respeitar finalidade específica, necessidade, segurança reforçada e base legal adequada.
            - article [ref=e102]:
              - heading "5. Bases legais" [level=3] [ref=e103]
              - paragraph [ref=e104]: O tratamento pode ocorrer para cumprimento de obrigação legal ou regulatória, execução de contrato, exercício regular de direitos, tutela da saúde quando aplicável, legítimo interesse em situações compatíveis e consentimento quando a lei exigir.
            - article [ref=e105]:
              - heading "6. Responsabilidades do usuário" [level=3] [ref=e106]
              - paragraph [ref=e107]: O usuário deve acessar apenas dados necessários à sua função, manter sigilo, não compartilhar credenciais, registrar informações corretas e respeitar as permissões internas definidas pela empresa.
            - article [ref=e108]:
              - heading "7. Segurança e retenção" [level=3] [ref=e109]
              - paragraph [ref=e110]: A plataforma adota controles técnicos e administrativos compatíveis com o uso do sistema. A retenção dos dados deve observar prazos legais, fiscais, trabalhistas, contratuais e o exercício regular de direitos.
            - article [ref=e111]:
              - heading "8. Direitos dos titulares" [level=3] [ref=e112]
              - paragraph [ref=e113]: Colaboradores e demais titulares podem solicitar, conforme a LGPD, confirmação de tratamento, acesso, correção, informação sobre compartilhamento, oposição, revogação quando aplicável e eliminação após prazos legais.
        - generic [ref=e114]:
          - generic [ref=e115]:
            - checkbox "Li e aceito os Termos de Uso e a Política de Privacidade desta versão, ciente das responsabilidades de uso do sistema e tratamento de dados pessoais." [ref=e116]
            - generic [ref=e117]: Li e aceito os Termos de Uso e a Política de Privacidade desta versão, ciente das responsabilidades de uso do sistema e tratamento de dados pessoais.
          - generic [ref=e118]:
            - paragraph [ref=e119]: O aceite fica registrado com versão do termo, data, hora, IP e agente do navegador quando a API estiver disponível.
            - button "Aceitar e continuar" [disabled] [ref=e120]
```

# Test source

```ts
  58  | };
  59  | 
  60  | async function login(page, email, password) {
  61  |   await page.goto('/login');
  62  |   await page.fill('input[type="email"]', email);
  63  |   await page.fill('input[type="password"]', password);
  64  |   await page.click('button[type="submit"]');
  65  |   // Wait for redirect to dashboard
  66  |   await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  67  | }
  68  | 
  69  | test.describe('Innovation RH Connect - E2E Role and Permission Tests', () => {
  70  |   
  71  |   test('1. Test Admin Login and Menu Permissions', async ({ page }) => {
  72  |     const creds = users.admin;
  73  |     console.log(`Testing login for: ${creds.email}`);
  74  |     await login(page, creds.email, creds.password);
  75  |     
  76  |     // Check expected menu items
  77  |     for (const item of creds.expectedMenu) {
  78  |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible({ timeout: 5000 });
  79  |     }
  80  |     
  81  |     // Check forbidden menu items
  82  |     for (const item of creds.forbiddenMenu) {
  83  |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  84  |     }
  85  |   });
  86  | 
  87  |   test('2. Test RH Login and Menu Permissions', async ({ page }) => {
  88  |     const creds = users.rh;
  89  |     console.log(`Testing login for: ${creds.email}`);
  90  |     await login(page, creds.email, creds.password);
  91  |     
  92  |     for (const item of creds.expectedMenu) {
  93  |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible();
  94  |     }
  95  |     for (const item of creds.forbiddenMenu) {
  96  |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  97  |     }
  98  |   });
  99  | 
  100 |   test('3. Test Gestor Login and Menu Permissions', async ({ page }) => {
  101 |     const creds = users.gestor;
  102 |     console.log(`Testing login for: ${creds.email}`);
  103 |     await login(page, creds.email, creds.password);
  104 |     
  105 |     for (const item of creds.expectedMenu) {
  106 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible();
  107 |     }
  108 |     for (const item of creds.forbiddenMenu) {
  109 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  110 |     }
  111 |   });
  112 | 
  113 |   test('4. Test Funcionario Login and Menu Permissions', async ({ page }) => {
  114 |     const creds = users.funcionario;
  115 |     console.log(`Testing login for: ${creds.email}`);
  116 |     await login(page, creds.email, creds.password);
  117 |     
  118 |     for (const item of creds.expectedMenu) {
  119 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible();
  120 |     }
  121 |     for (const item of creds.forbiddenMenu) {
  122 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  123 |     }
  124 |   });
  125 | 
  126 |   test('5. Test Consulta Login and Menu Permissions', async ({ page }) => {
  127 |     const creds = users.consulta;
  128 |     console.log(`Testing login for: ${creds.email}`);
  129 |     await login(page, creds.email, creds.password);
  130 |     
  131 |     for (const item of creds.expectedMenu) {
  132 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible();
  133 |     }
  134 |     for (const item of creds.forbiddenMenu) {
  135 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  136 |     }
  137 |   });
  138 | 
  139 |   test('6. Test Comercial Login and Menu Permissions', async ({ page }) => {
  140 |     const creds = users.comercial;
  141 |     console.log(`Testing login for: ${creds.email}`);
  142 |     await login(page, creds.email, creds.password);
  143 |     
  144 |     for (const item of creds.expectedMenu) {
  145 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeVisible();
  146 |     }
  147 |     for (const item of creds.forbiddenMenu) {
  148 |       await expect(page.locator(`.sidebar-nav-item:has-text("${item}")`)).toBeHidden();
  149 |     }
  150 |   });
  151 | 
  152 |   test('7. Test Ferias Disponivel - Request Vacation Screen', async ({ page }) => {
  153 |     const creds = users.feriasDisponivel;
  154 |     console.log(`Testing login for: ${creds.email}`);
  155 |     await login(page, creds.email, creds.password);
  156 |     
  157 |     // Go to Vacations page
> 158 |     await page.click('.sidebar-nav-item:has-text("Férias")');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  159 |     await expect(page).toHaveURL(/.*vacations.*/);
  160 |     
  161 |     // Check if we can click to request vacation button or see vacation request elements
  162 |     const requestBtn = page.locator('button:has-text("Solicitar Férias"), button:has-text("Nova Solicitação"), button:has-text("Solicitar")');
  163 |     const isBtnVisible = await requestBtn.isVisible().catch(() => false);
  164 |     console.log('Request Vacation button visible:', isBtnVisible);
  165 |   });
  166 | 
  167 |   test('8. Test Admissao Recente - Vacation Blocking', async ({ page }) => {
  168 |     const creds = users.admissaoRecente;
  169 |     console.log(`Testing login for: ${creds.email}`);
  170 |     await login(page, creds.email, creds.password);
  171 |     
  172 |     await page.click('.sidebar-nav-item:has-text("Férias")');
  173 |     await expect(page).toHaveURL(/.*vacations.*/);
  174 |     
  175 |     // Recent admission should have a message or lock preventing vacation request due to less than 1 year (or similar rules)
  176 |     const warningText = page.locator('text=/período aquisitivo|bloqueado|não elegível|mínimo/i');
  177 |     const isWarningVisible = await warningText.first().isVisible().catch(() => false);
  178 |     console.log('Vacation lock warning visible:', isWarningVisible);
  179 |   });
  180 | 
  181 |   test('9. Test Oficial User Login', async ({ page }) => {
  182 |     const creds = users.oficial;
  183 |     console.log(`Testing login for: ${creds.email}`);
  184 |     await login(page, creds.email, creds.password);
  185 |     console.log('Oficial user successfully logged in!');
  186 |   });
  187 | });
  188 | 
```