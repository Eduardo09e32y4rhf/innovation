#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');
const now = Date.now();
const tokenState = { token: '' };

function endpoint(path) {
  return `${baseUrl}${path}`;
}

function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

async function request(label, path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(tokenState.token ? { Authorization: `Bearer ${tokenState.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint(path), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && payload.message
      ? Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
      : text || response.statusText;
    throw new Error(`${label} failed (${response.status}): ${message}`);
  }

  const data = unwrap(payload);
  console.log(`OK ${label}`);
  return data;
}

async function main() {
  console.log(`MVP API smoke test: ${baseUrl}`);

  await request('health', '/health');

  const companyPayload = {
    companyName: `Empresa Teste ${now}`,
    document: String(10000000000000 + (now % 89999999999999)).padStart(14, '0'),
    name: 'Admin Teste',
    email: `admin.${now}@teste.com`,
    password: 'Admin@123456',
  };

  const registered = await request('auth/register-company', '/auth/register-company', {
    method: 'POST',
    body: companyPayload,
  });

  if (!registered?.access_token) throw new Error('register-company did not return access_token');
  tokenState.token = registered.access_token;

  const logged = await request('auth/login', '/auth/login', {
    method: 'POST',
    body: { email: companyPayload.email, password: companyPayload.password },
  });
  if (!logged?.access_token) throw new Error('login did not return access_token');
  tokenState.token = logged.access_token;

  const me = await request('auth/me', '/auth/me');
  if (!me?.companyId) throw new Error('auth/me did not return companyId');

  await request('dashboard/summary', '/dashboard/summary');
  await request('users', '/users');
  await request('users/usage', '/users/usage');

  const employee = await request('employees create', '/employees', {
    method: 'POST',
    body: {
      name: 'Funcionario Teste',
      cpf: String(10000000000 + (now % 89999999999)).padStart(11, '0'),
      email: `funcionario.${now}@teste.com`,
      phone: '11999999999',
      position: 'Atendente',
      department: 'Operacao',
      admissionDate: '2026-06-19T00:00:00.000Z',
      salary: 2000,
    },
  });
  if (!employee?.id) throw new Error('employee create did not return id');

  await request('employees list', '/employees');
  await request('employees get', `/employees/${employee.id}`);

  await request('time-track register ENTRY', '/time-track/register', {
    method: 'POST',
    body: {
      employeeId: employee.id,
      type: 'ENTRY',
      timestamp: new Date().toISOString(),
    },
  });
  await request('time-track list', '/time-track');
  await request('time-track employee month', `/time-track/${employee.id}/month`);

  const vacation = await request('vacations create', '/vacations', {
    method: 'POST',
    body: {
      employeeId: employee.id,
      acquisitionPeriod: '2026/2027',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-10T00:00:00.000Z',
      daysUsed: 10,
      observation: 'Teste de ferias',
    },
  });
  if (!vacation?.id) throw new Error('vacation create did not return id');

  await request('vacations list', '/vacations');
  await request('vacations by employee', `/vacations/employee/${employee.id}`);
  await request('vacations approve', `/vacations/${vacation.id}/status`, {
    method: 'PATCH',
    body: { status: 'APPROVED' },
  });

  await request('whatsapp status', '/communication/whatsapp/status');

  await request('employees patch', `/employees/${employee.id}`, {
    method: 'PATCH',
    body: { phone: '11888888888' },
  });
  await request('employees terminate', `/employees/${employee.id}`, { method: 'DELETE' });

  console.log('MVP API smoke test finished successfully.');
  console.log(`Login tested with: ${companyPayload.email} / ${companyPayload.password}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});