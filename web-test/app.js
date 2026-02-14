const STORAGE_KEY = 'web_adm_state_v1'
const TOKEN_KEY = 'adm_token'

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: null,
  admAccess: false,
  data: null,
  activeCompanyId: null,
  activeServiceCompanyId: null,
  pendingUserId: null
}

const selectors = {
  alertBox: document.querySelector('[data-role="alert"]'),
  loginView: document.querySelector('[data-view="login"]'),
  appView: document.querySelector('[data-view="app"]'),
  navLinks: document.querySelectorAll('[data-nav]'),
  loginForm: document.querySelector('[data-form="login"]'),
  verifyForm: document.querySelector('[data-form="verify"]'),
  logoutBtn: document.querySelector('[data-action="logout"]'),
  loginEmail: document.querySelector('#login-email'),
  loginPassword: document.querySelector('#login-password'),
  loginCode: document.querySelector('#login-code'),
  loginCodeSection: document.querySelector('[data-section="login-code"]'),
  userName: document.querySelector('[data-user="name"]'),
  userRole: document.querySelector('[data-user="role"]'),
  userSummary: document.querySelector('[data-user="summary"]'),
  companiesSummary: document.querySelector('[data-summary="companies"]'),
  plansSummary: document.querySelector('[data-summary="plans"]'),
  servicesSummary: document.querySelector('[data-summary="services"]'),
  usersSummary: document.querySelector('[data-summary="users"]'),
  monitoringSummary: document.querySelector('[data-summary="monitoring"]'),
  accessDenied: document.querySelector('[data-section="access-denied"]'),
  companySearch: document.querySelector('#company-search'),
  companiesList: document.querySelector('[data-list="companies"]'),
  companyContext: document.querySelector('[data-company="context"]'),
  companyDetail: document.querySelector('[data-section="company-detail"]'),
  companyStatusBadge: document.querySelector('[data-company="status"]'),
  companyCreateForm: document.querySelector('[data-form="company-create"]'),
  companyName: document.querySelector('#company-name'),
  companyCnpj: document.querySelector('#company-cnpj'),
  companyCity: document.querySelector('#company-city'),
  companyPlan: document.querySelector('#company-plan'),
  companyStatus: document.querySelector('#company-status'),
  companyOwner: document.querySelector('#company-owner'),
  companyPlanUpdate: document.querySelector('#company-plan-update'),
  companyServicesList: document.querySelector('[data-list="company-services"]'),
  planCreateForm: document.querySelector('[data-form="plan-create"]'),
  planName: document.querySelector('#plan-name'),
  planPrice: document.querySelector('#plan-price'),
  planSeats: document.querySelector('#plan-seats'),
  planNotes: document.querySelector('#plan-notes'),
  plansList: document.querySelector('[data-list="plans"]'),
  serviceCompany: document.querySelector('#service-company'),
  serviceControls: document.querySelector('[data-list="service-controls"]'),
  userCreateForm: document.querySelector('[data-form="user-create"]'),
  userNameInput: document.querySelector('#user-name'),
  userEmailInput: document.querySelector('#user-email'),
  userRoleInput: document.querySelector('#user-role'),
  userPasswordInput: document.querySelector('#user-password'),
  usersList: document.querySelector('[data-list="users"]'),
  auditList: document.querySelector('[data-list="audit"]'),
  monitorUptime: document.querySelector('[data-monitor="uptime"]'),
  monitorErrors: document.querySelector('[data-monitor="errors"]'),
  monitorLatency: document.querySelector('[data-monitor="latency"]'),
  monitorQueue: document.querySelector('[data-monitor="queue"]'),
  monitorList: document.querySelector('[data-list="monitoring"]')
}

const defaultData = {
  plans: [
    {
      id: 1,
      name: 'Start',
      price: 249.9,
      seats: 5,
      notes: 'Implantação assistida',
      status: 'active'
    },
    {
      id: 2,
      name: 'Growth',
      price: 499.9,
      seats: 15,
      notes: 'Suporte prioritário',
      status: 'active'
    }
  ],
  servicesCatalog: [
    {
      key: 'web_jobs',
      name: 'Portal de vagas',
      description: 'Publicação e gestão de vagas'
    },
    {
      key: 'web_candidates',
      name: 'Banco de talentos',
      description: 'Busca e triagem de candidatos'
    },
    {
      key: 'web_documents',
      name: 'Documentos',
      description: 'Coleta e validação documental'
    },
    {
      key: 'web_automation',
      name: 'Automação',
      description: 'Fluxos automatizados e alertas'
    }
  ],
  companies: [
    {
      id: 1,
      razao_social: 'Inova RH Ltda',
      cnpj: '12.345.678/0001-00',
      cidade: 'São Paulo',
      status: 'active',
      plan_id: 2,
      owner: 'Marina Souza',
      services: ['web_jobs', 'web_candidates', 'web_documents']
    },
    {
      id: 2,
      razao_social: 'Grupo Orion',
      cnpj: '98.765.432/0001-90',
      cidade: 'Campinas',
      status: 'inactive',
      plan_id: 1,
      owner: 'Paulo Lima',
      services: ['web_jobs']
    }
  ],
  internalUsers: [
    {
      id: 1,
      name: 'Admin Master',
      email: 'admin@innovation.ia',
      role: 'ADM',
      password: 'adm123',
      status: 'active'
    },
    {
      id: 2,
      name: 'Fernanda SAC',
      email: 'sac@empresa.com',
      role: 'SAC',
      password: 'sac123',
      status: 'active'
    }
  ],
  auditLogs: [
    {
      id: 1,
      actor: 'Admin Master',
      action: 'login',
      entity: 'auth',
      at: new Date().toISOString(),
      details: 'Login inicial da plataforma ADM'
    }
  ],
  monitoring: {
    uptime: 99.95,
    errorRate: 0.4,
    latencyMs: 245,
    queue: 12,
    services: [
      { key: 'auth', name: 'Autenticação', status: 'ok', lastCheck: 'há 2 min' },
      { key: 'billing', name: 'Cobrança', status: 'warning', lastCheck: 'há 5 min' },
      { key: 'core', name: 'Core API', status: 'ok', lastCheck: 'há 1 min' },
      { key: 'notifications', name: 'Notificações', status: 'degraded', lastCheck: 'há 8 min' }
    ]
  }
}

function showAlert(message, variant = 'warning') {
  if (!selectors.alertBox) return
  if (!message) {
    selectors.alertBox.classList.add('hidden')
    selectors.alertBox.textContent = ''
    return
  }
  selectors.alertBox.classList.remove('hidden')
  selectors.alertBox.classList.toggle('danger', variant === 'danger')
  selectors.alertBox.classList.toggle('success', variant === 'success')
  selectors.alertBox.textContent = message
}

function setView(isAuthenticated) {
  selectors.loginView?.classList.toggle('hidden', isAuthenticated)
  selectors.appView?.classList.toggle('hidden', !isAuthenticated)
}

function setNavActive(nav) {
  selectors.navLinks?.forEach(link => {
    link.classList.toggle('active', link.dataset.nav === nav)
  })
  document.querySelectorAll('[data-page]').forEach(section => {
    section.classList.toggle('hidden', section.dataset.page !== nav)
  })
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      state.data = JSON.parse(saved)
      return
    } catch (error) {
      state.data = structuredClone(defaultData)
    }
  } else {
    state.data = structuredClone(defaultData)
  }
  persistData()
}

function persistData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data))
}

function nextId(collection) {
  return collection.length ? Math.max(...collection.map(item => item.id)) + 1 : 1
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

function loadUserFromToken() {
  if (!state.token) return null
  try {
    const decoded = parseJwt(state.token)
    if (!decoded || !decoded.sub) return null
    return state.data.internalUsers.find(user => String(user.id) === String(decoded.sub)) || null
  } catch (error) {
    return null
  }
}

function getUserRoles(user) {
  if (!user) return []
  if (Array.isArray(user.roles)) return user.roles
  if (user.role) return [user.role]
  return []
}

function hasAdmRole(user) {
  const roles = getUserRoles(user).map(role => String(role || '').toLowerCase())
  return roles.some(role => role.includes('adm'))
}

function updateUserHeader() {
  if (!selectors.userName) return
  selectors.userName.textContent = state.user?.name || state.user?.email || '-'
  selectors.userRole.textContent = getUserRoles(state.user).join(', ') || '-'
  if (selectors.userSummary) {
    selectors.userSummary.innerHTML = `
      <div><strong>${state.user?.name || state.user?.email || '-'}</strong></div>
      <div class="muted">${state.user?.email || '-'}</div>
      <div class="muted">Permissões: ${getUserRoles(state.user).join(', ') || '-'}</div>
    `
  }
}

function setAccessDenied(isDenied) {
  state.admAccess = !isDenied
  selectors.accessDenied?.classList.toggle('hidden', !isDenied)
  selectors.navLinks?.forEach(link => {
    link.classList.toggle('disabled', isDenied)
  })
}

function addAuditLog(action, entity, details) {
  if (!state.data) return
  const entry = {
    id: nextId(state.data.auditLogs),
    actor: state.user?.name || state.user?.email || 'Sistema',
    action,
    entity,
    at: new Date().toISOString(),
    details
  }
  state.data.auditLogs.unshift(entry)
  persistData()
}

function renderCompanySummary() {
  if (!selectors.companiesSummary || !state.data) return
  const activeCount = state.data.companies.filter(company => company.status === 'active').length
  selectors.companiesSummary.innerHTML = `
    <div><strong>${activeCount}</strong> empresas ativas</div>
    <div class="muted">${state.data.companies.length} empresas cadastradas</div>
  `
}

function renderPlanSummary() {
  if (!selectors.plansSummary || !state.data) return
  const activePlans = state.data.plans.filter(plan => plan.status === 'active').length
  selectors.plansSummary.innerHTML = `
    <div><strong>${activePlans}</strong> planos ativos</div>
    <div class="muted">${state.data.plans.length} planos cadastrados</div>
  `
}

function renderServicesSummary() {
  if (!selectors.servicesSummary || !state.data) return
  const enabled = state.data.companies.reduce((total, company) => total + company.services.length, 0)
  selectors.servicesSummary.innerHTML = `
    <div><strong>${enabled}</strong> serviços habilitados</div>
    <div class="muted">${state.data.servicesCatalog.length} serviços disponíveis</div>
  `
}

function renderUsersSummary() {
  if (!selectors.usersSummary || !state.data) return
  const activeUsers = state.data.internalUsers.filter(user => user.status === 'active').length
  selectors.usersSummary.innerHTML = `
    <div><strong>${activeUsers}</strong> usuários ativos</div>
    <div class="muted">${state.data.internalUsers.length} usuários internos</div>
  `
}

function renderMonitoringSummary() {
  if (!selectors.monitoringSummary || !state.data) return
  const degraded = state.data.monitoring.services.filter(service => service.status !== 'ok').length
  selectors.monitoringSummary.innerHTML = `
    <div><strong>${degraded}</strong> serviços com alerta</div>
    <div class="muted">Uptime ${state.data.monitoring.uptime}%</div>
  `
}

function renderPlanOptions() {
  if (!state.data) return
  const options = state.data.plans.map(plan => {
    const label = `${plan.name} • R$ ${plan.price.toFixed(2)}`
    return `<option value="${plan.id}">${label}</option>`
  })
  if (selectors.companyPlan) selectors.companyPlan.innerHTML = options.join('')
  if (selectors.companyPlanUpdate) selectors.companyPlanUpdate.innerHTML = options.join('')
  if (selectors.serviceCompany) {
    selectors.serviceCompany.innerHTML = state.data.companies
      .map(company => `<option value="${company.id}">${company.razao_social}</option>`)
      .join('')
  }
}

function renderCompanies() {
  if (!selectors.companiesList || !state.data) return
  const query = selectors.companySearch?.value?.trim().toLowerCase() || ''
  const companies = state.data.companies.filter(company => {
    if (!query) return true
    const haystack = `${company.razao_social} ${company.cnpj} ${company.cidade}`.toLowerCase()
    return haystack.includes(query)
  })
  if (!companies.length) {
    selectors.companiesList.innerHTML = '<p class="muted">Nenhuma empresa cadastrada.</p>'
    return
  }
  selectors.companiesList.innerHTML = companies
    .map(company => {
      const plan = state.data.plans.find(planItem => planItem.id === company.plan_id)
      const statusClass = company.status === 'active' ? 'success' : 'danger'
      return `
        <div class="card compact">
          <div class="split">
            <div>
              <strong>${company.razao_social}</strong>
              <div class="muted">CNPJ: ${company.cnpj}</div>
              <div class="muted">${company.cidade}</div>
              <div class="muted">Plano: ${plan?.name || 'N/D'}</div>
            </div>
            <div class="stack">
              <span class="badge ${statusClass}">${company.status}</span>
              <button data-action="select-company" data-id="${company.id}" class="primary">Selecionar</button>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderCompanyDetail() {
  if (!state.data) return
  const company = state.data.companies.find(item => item.id === state.activeCompanyId)
  if (!company) {
    selectors.companyDetail?.classList.add('hidden')
    if (selectors.companyContext) {
      selectors.companyContext.textContent = 'Selecione uma empresa para editar serviços e plano.'
    }
    return
  }
  if (selectors.companyContext) {
    selectors.companyContext.textContent = `${company.razao_social} • ${company.cnpj}`
  }
  selectors.companyDetail?.classList.remove('hidden')
  if (selectors.companyStatusBadge) {
    selectors.companyStatusBadge.textContent = company.status === 'active' ? 'Ativa' : 'Inativa'
    selectors.companyStatusBadge.className = `badge ${company.status === 'active' ? 'success' : 'danger'}`
  }
  if (selectors.companyPlanUpdate) {
    selectors.companyPlanUpdate.value = String(company.plan_id)
  }
  renderCompanyServices(company)
}

function renderCompanyServices(company) {
  if (!selectors.companyServicesList || !state.data) return
  selectors.companyServicesList.innerHTML = state.data.servicesCatalog
    .map(service => {
      const enabled = company.services.includes(service.key)
      return `
        <label class="service-item">
          <input type="checkbox" data-service="${service.key}" ${enabled ? 'checked' : ''} />
          <div>
            <strong>${service.name}</strong>
            <div class="muted">${service.description}</div>
          </div>
        </label>
      `
    })
    .join('')
}

function renderPlans() {
  if (!selectors.plansList || !state.data) return
  if (!state.data.plans.length) {
    selectors.plansList.innerHTML = '<p class="muted">Nenhum plano cadastrado.</p>'
    return
  }
  selectors.plansList.innerHTML = state.data.plans
    .map(plan => {
      const badge = plan.status === 'active' ? 'success' : 'danger'
      return `
        <div class="card compact" data-plan="${plan.id}">
          <div class="split">
            <div>
              <label>Plano</label>
              <input data-plan-field="name" value="${plan.name}" />
              <label>Valor (R$)</label>
              <input data-plan-field="price" type="number" step="0.01" value="${plan.price}" />
              <label>Limite de usuários</label>
              <input data-plan-field="seats" type="number" value="${plan.seats}" />
              <label>Observações</label>
              <input data-plan-field="notes" value="${plan.notes || ''}" />
            </div>
            <div class="stack">
              <span class="badge ${badge}">${plan.status}</span>
              <button data-action="save-plan" data-id="${plan.id}" class="primary">Salvar</button>
              <button data-action="toggle-plan" data-id="${plan.id}">Ativar/Inativar</button>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderServicesControls() {
  if (!selectors.serviceControls || !state.data) return
  const company = state.data.companies.find(item => item.id === state.activeServiceCompanyId)
  if (!company) {
    selectors.serviceControls.innerHTML = '<p class="muted">Selecione uma empresa para configurar serviços.</p>'
    return
  }
  selectors.serviceControls.innerHTML = state.data.servicesCatalog
    .map(service => {
      const enabled = company.services.includes(service.key)
      return `
        <label class="service-item">
          <input type="checkbox" data-service="${service.key}" ${enabled ? 'checked' : ''} />
          <div>
            <strong>${service.name}</strong>
            <div class="muted">${service.description}</div>
          </div>
        </label>
      `
    })
    .join('')
}

function renderUsers() {
  if (!selectors.usersList || !state.data) return
  if (!state.data.internalUsers.length) {
    selectors.usersList.innerHTML = '<p class="muted">Nenhum usuário interno cadastrado.</p>'
    return
  }
  selectors.usersList.innerHTML = state.data.internalUsers
    .map(user => {
      const badge = user.status === 'active' ? 'success' : 'danger'
      return `
        <div class="card compact" data-user="${user.id}">
          <div class="split">
            <div>
              <strong>${user.name}</strong>
              <div class="muted">${user.email}</div>
              <div class="muted">Perfil: ${user.role}</div>
            </div>
            <div class="stack">
              <span class="badge ${badge}">${user.status}</span>
              <button data-action="toggle-user" data-id="${user.id}">Ativar/Inativar</button>
              <button data-action="reset-user" data-id="${user.id}">Resetar senha</button>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderAuditLogs() {
  if (!selectors.auditList || !state.data) return
  if (!state.data.auditLogs.length) {
    selectors.auditList.innerHTML = '<p class="muted">Nenhum log registrado.</p>'
    return
  }
  selectors.auditList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Usuário</th>
          <th>Ação</th>
          <th>Entidade</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        ${state.data.auditLogs
          .map(log => {
            return `
              <tr>
                <td>${new Date(log.at).toLocaleString()}</td>
                <td>${log.actor}</td>
                <td>${log.action}</td>
                <td>${log.entity}</td>
                <td>${log.details}</td>
              </tr>
            `
          })
          .join('')}
      </tbody>
    </table>
  `
}

function renderMonitoring() {
  if (!state.data) return
  if (selectors.monitorUptime) {
    selectors.monitorUptime.innerHTML = `<strong>${state.data.monitoring.uptime}%</strong> uptime no mês atual.`
  }
  if (selectors.monitorErrors) {
    selectors.monitorErrors.innerHTML = `<strong>${state.data.monitoring.errorRate}%</strong> de erro crítico.`
  }
  if (selectors.monitorLatency) {
    selectors.monitorLatency.innerHTML = `<strong>${state.data.monitoring.latencyMs} ms</strong> de latência média.`
  }
  if (selectors.monitorQueue) {
    selectors.monitorQueue.innerHTML = `<strong>${state.data.monitoring.queue}</strong> itens em fila.`
  }
  if (!selectors.monitorList) return
  selectors.monitorList.innerHTML = state.data.monitoring.services
    .map(service => {
      const statusClass =
        service.status === 'ok' ? 'success' : service.status === 'warning' ? 'warning' : 'danger'
      return `
        <div class="card compact">
          <div class="split">
            <div>
              <strong>${service.name}</strong>
              <div class="muted">Último check: ${service.lastCheck}</div>
            </div>
            <div class="stack">
              <span class="badge ${statusClass}">${service.status}</span>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

async function handleLogin(event) {
  event.preventDefault()
  showAlert('')
  loadData()
  const email = selectors.loginEmail.value.trim().toLowerCase()
  const password = selectors.loginPassword.value

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const err = await response.json()
      showAlert(err.detail || 'Falha ao autenticar.', 'danger')
      return
    }

    const data = await response.json()

    if (data.two_factor_required) {
      state.temporaryToken = data.temporary_token
      selectors.loginCodeSection?.classList.remove('hidden')
      showAlert('Insira o código 2FA enviado.', 'warning')
      return
    }

    completeLogin(data.access_token)
  } catch (error) {
    showAlert('Erro ao conectar com o servidor.', 'danger')
  }
}

async function handleVerify(event) {
  event.preventDefault()
  const code = selectors.loginCode.value.trim()
  if (!state.temporaryToken) {
    showAlert('Sessão expirada. Tente o login novamente.', 'danger')
    return
  }

  try {
    const response = await fetch(
      `/api/auth/login/verify?temporary_token=${state.temporaryToken}&code=${code}`,
      {
        method: 'POST'
      }
    )

    if (!response.ok) {
      const err = await response.json()
      showAlert(err.detail || 'Código inválido.', 'danger')
      return
    }

    const data = await response.json()
    completeLogin(data.access_token)
  } catch (error) {
    showAlert('Erro ao verificar código.', 'danger')
  }
}

function completeLogin(token) {
  if (!token) return
  state.token = token
  localStorage.setItem(TOKEN_KEY, token)
  selectors.loginForm?.reset()
  selectors.verifyForm?.reset()
  selectors.loginCodeSection?.classList.add('hidden')
  initializeApp()
}

function handleLogout() {
  state.token = ''
  state.user = null
  state.activeCompanyId = null
  state.activeServiceCompanyId = null
  localStorage.removeItem(TOKEN_KEY)
  setView(false)
}

function bindEvents() {
  selectors.loginForm?.addEventListener('submit', handleLogin)
  selectors.verifyForm?.addEventListener('submit', handleVerify)
  selectors.logoutBtn?.addEventListener('click', handleLogout)
  selectors.companySearch?.addEventListener('input', renderCompanies)
  selectors.serviceCompany?.addEventListener('change', () => {
    state.activeServiceCompanyId = Number(selectors.serviceCompany.value)
    renderServicesControls()
  })

  selectors.companyCreateForm?.addEventListener('submit', event => {
    event.preventDefault()
    if (!state.data) return
    const company = {
      id: nextId(state.data.companies),
      razao_social: selectors.companyName.value.trim(),
      cnpj: selectors.companyCnpj.value.trim(),
      cidade: selectors.companyCity.value.trim(),
      status: selectors.companyStatus.value,
      plan_id: Number(selectors.companyPlan.value),
      owner: selectors.companyOwner.value.trim(),
      services: []
    }
    state.data.companies.unshift(company)
    addAuditLog('create', 'company', `Empresa ${company.razao_social} cadastrada.`)
    persistData()
    selectors.companyCreateForm.reset()
    renderCompanies()
    renderPlanOptions()
    renderCompanySummary()
    showAlert('Empresa cadastrada com sucesso.', 'success')
  })

  selectors.planCreateForm?.addEventListener('submit', event => {
    event.preventDefault()
    if (!state.data) return
    const plan = {
      id: nextId(state.data.plans),
      name: selectors.planName.value.trim(),
      price: Number(selectors.planPrice.value),
      seats: Number(selectors.planSeats.value),
      notes: selectors.planNotes.value.trim(),
      status: 'active'
    }
    state.data.plans.unshift(plan)
    addAuditLog('create', 'plan', `Plano ${plan.name} adicionado.`)
    persistData()
    selectors.planCreateForm.reset()
    renderPlans()
    renderPlanOptions()
    renderPlanSummary()
    showAlert('Plano criado com sucesso.', 'success')
  })

  selectors.userCreateForm?.addEventListener('submit', event => {
    event.preventDefault()
    if (!state.data) return
    const user = {
      id: nextId(state.data.internalUsers),
      name: selectors.userNameInput.value.trim(),
      email: selectors.userEmailInput.value.trim(),
      role: selectors.userRoleInput.value,
      password: selectors.userPasswordInput.value,
      status: 'active'
    }
    state.data.internalUsers.unshift(user)
    addAuditLog('create', 'user', `Usuário ${user.email} criado.`)
    persistData()
    selectors.userCreateForm.reset()
    renderUsers()
    renderUsersSummary()
    showAlert('Usuário interno criado.', 'success')
  })

  document.addEventListener('click', async event => {
    const target = event.target
    const nav = target.closest('[data-nav]')
    if (nav && !nav.classList.contains('disabled')) {
      setNavActive(nav.dataset.nav)
    }

    const actionBtn = target.closest('button[data-action]')
    if (!actionBtn) return
    const action = actionBtn.dataset.action

    if (action === 'refresh-companies') {
      renderCompanies()
      showAlert('Lista de empresas atualizada.', 'success')
    }

    if (action === 'select-company') {
      state.activeCompanyId = Number(actionBtn.dataset.id)
      renderCompanyDetail()
    }

    if (action === 'toggle-company-status') {
      const company = state.data.companies.find(item => item.id === state.activeCompanyId)
      if (!company) return
      company.status = company.status === 'active' ? 'inactive' : 'active'
      addAuditLog('update', 'company', `Status da empresa ${company.razao_social} atualizado.`)
      persistData()
      renderCompanyDetail()
      renderCompanies()
      renderCompanySummary()
    }

    if (action === 'save-company') {
      const company = state.data.companies.find(item => item.id === state.activeCompanyId)
      if (!company) return
      company.plan_id = Number(selectors.companyPlanUpdate.value)
      const selectedServices = Array.from(
        selectors.companyServicesList.querySelectorAll('input[type="checkbox"]')
      )
        .filter(input => input.checked)
        .map(input => input.dataset.service)
      company.services = selectedServices
      addAuditLog('update', 'company', `Cadastro da empresa ${company.razao_social} atualizado.`)
      persistData()
      renderCompanies()
      renderServicesSummary()
      showAlert('Empresa atualizada.', 'success')
    }

    if (action === 'save-services') {
      const company = state.data.companies.find(item => item.id === state.activeServiceCompanyId)
      if (!company) return
      const selected = Array.from(selectors.serviceControls.querySelectorAll('input[type="checkbox"]'))
        .filter(input => input.checked)
        .map(input => input.dataset.service)
      company.services = selected
      addAuditLog('update', 'services', `Serviços atualizados para ${company.razao_social}.`)
      persistData()
      renderServicesControls()
      renderCompanyDetail()
      renderServicesSummary()
      showAlert('Serviços salvos.', 'success')
    }

    if (action === 'save-plan') {
      const planId = Number(actionBtn.dataset.id)
      const card = document.querySelector(`[data-plan="${planId}"]`)
      if (!card) return
      const plan = state.data.plans.find(item => item.id === planId)
      if (!plan) return
      plan.name = card.querySelector('[data-plan-field="name"]').value
      plan.price = Number(card.querySelector('[data-plan-field="price"]').value)
      plan.seats = Number(card.querySelector('[data-plan-field="seats"]').value)
      plan.notes = card.querySelector('[data-plan-field="notes"]').value
      addAuditLog('update', 'plan', `Plano ${plan.name} atualizado.`)
      persistData()
      renderPlans()
      renderPlanOptions()
      renderPlanSummary()
      showAlert('Plano atualizado.', 'success')
    }

    if (action === 'toggle-plan') {
      const planId = Number(actionBtn.dataset.id)
      const plan = state.data.plans.find(item => item.id === planId)
      if (!plan) return
      plan.status = plan.status === 'active' ? 'inactive' : 'active'
      addAuditLog('update', 'plan', `Status do plano ${plan.name} atualizado.`)
      persistData()
      renderPlans()
      renderPlanSummary()
    }

    if (action === 'toggle-user') {
      const userId = Number(actionBtn.dataset.id)
      const user = state.data.internalUsers.find(item => item.id === userId)
      if (!user) return
      user.status = user.status === 'active' ? 'inactive' : 'active'
      addAuditLog('update', 'user', `Status do usuário ${user.email} atualizado.`)
      persistData()
      renderUsers()
      renderUsersSummary()
    }

    if (action === 'reset-user') {
      const userId = Number(actionBtn.dataset.id)
      const user = state.data.internalUsers.find(item => item.id === userId)
      if (!user) return
      user.password = 'Temp@123'
      addAuditLog('update', 'user', `Senha resetada para ${user.email}.`)
      persistData()
      showAlert('Senha resetada para Temp@123.', 'success')
    }
  })
}

async function initializeApp() {
  if (!state.token) {
    setView(false)
    return
  }
  setView(true)
  try {
    loadData()

    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${state.token}` }
    })
    if (!res.ok) throw new Error('token')

    const userData = await res.json()
    state.user = userData

    updateUserHeader()
    setAccessDenied(!hasAdmRole(state.user))
    addAuditLog('login', 'auth', `Login de ${state.user.email}.`)
  } catch (error) {
    handleLogout()
    showAlert('Sessão expirada. Faça login novamente.', 'danger')
    return
  }
  if (!state.admAccess) {
    setNavActive('dashboard')
    return
  }
  renderPlanOptions()
  renderCompanies()
  renderCompanyDetail()
  renderPlans()
  renderServicesControls()
  renderUsers()
  renderAuditLogs()
  renderMonitoring()
  renderCompanySummary()
  renderPlanSummary()
  renderServicesSummary()
  renderUsersSummary()
  renderMonitoringSummary()
  setNavActive('dashboard')
}

bindEvents()
initializeApp()
