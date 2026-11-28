import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

// Dados isolados por interceptação HTTP no navegador de testes. Nunca são gravados no banco.
const profile = { email: 'candidato@example.test', emailVerified: true, name: 'José da Silva', cpf: '52998224725', phone: '11999999999', cep: '01001000', street: 'Rua de teste', streetNumber: '1', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', about: '', profession: 'Vendedor', skills: ['Vendas', 'Excel', 'Atendimento', 'Comunicação', 'Organização'], experience: [{ role: 'Vendedor', company: 'Empresa de teste', description: '', start: '2020-01', current: true }], education: [{ level: 'Ensino médio', status: 'Completo', course: '', school: 'Escola de teste' }], languages: ['Português'], driverLicenseCategory: ['AB'], hasDriverLicense: true, resume: { name: 'cv.pdf', size: 1000 }, completeness: { percent: 100, complete: true, missing: [] }, checklist: [], xp: 0 };
const company = { id: 'empresa', name: 'Empresa de teste' };
const matching = { score: 90, hasProfile: true, missingMandatory: false, level: 'ideal', met: ['Vendas', 'Modalidade remota'], missing: ['Inglês'], partial: [], requirements: [] };
const jobs = [{ id: 'vendas', companyId: company.id, company, title: 'Consultor de vendas', location: 'Remoto · Remoto', workMode: 'REMOTE', employmentType: 'Pessoa jurídica', requirements: ['pede_comunicacao', 'pede_ingles', 'chave_desconhecida'], description: 'Oportunidade comercial.', benefits: [], match: matching }, { id: 'dev', companyId: company.id, company, title: 'Desenvolvedor Full Stack', workMode: 'REMOTE', requirements: [], benefits: [], description: 'Desenvolvimento.', match: { ...matching, score: 40, level: 'warn' } }];

async function setup(page: Page, logged = true) {
  if (logged) await page.addInitScript(() => localStorage.setItem('ir_candidate_token', 'test-only-session'));
  let saved: string[] = [];
  let currentProfile = { ...profile };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname;
    let body: unknown = {};
    if (endpoint.endsWith('/candidate-portal/me')) {
      if (route.request().method() === 'PUT') currentProfile = { ...currentProfile, ...route.request().postDataJSON() };
      body = currentProfile;
    } else if (endpoint.includes('/auth/register') || endpoint.includes('/auth/login')) body = { token: 'test-only-session' };
    else if (endpoint.endsWith('/candidate-portal/applications')) body = { applications: [
      { id: 'active', job: 'Vendedor', company: company.name, status: 'INTERVIEW', statusLabel: 'Entrevista', isFinal: false, closed: false, appliedAt: '2026-11-20', timeline: [] },
      { id: 'hired', job: 'Consultor contratado', company: company.name, status: 'HIRED', statusLabel: 'Contratado', isFinal: true, closed: true, appliedAt: '2026-11-01', timeline: [] },
    ], appliedJobIds: [] };
    else if (endpoint.endsWith('/candidate-portal/assessments')) body = ['PORTUGUESE', 'MATH', 'ESSAY'].map(kind => ({ kind, status: 'COMPLETED', required: true }));
    else if (endpoint.endsWith('/saved-jobs')) body = { jobs: jobs.filter(job => saved.includes(job.id)) };
    else if (endpoint.includes('/saved-jobs/')) { const id = endpoint.split('/').at(-1)!; saved = route.request().method() === 'DELETE' ? saved.filter(value => value !== id) : [...new Set([...saved, id])]; body = { saved: saved.includes(id) }; }
    else if (endpoint.endsWith('/careers/jobs') || endpoint.endsWith('/public/jobs')) body = { jobs, companies: [company] };
    else if (endpoint.includes('/public/jobs/')) body = { job: { ...jobs[0], questions: [], status: 'OPEN' }, company };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

for (const width of [360, 390, 1280]) test(`painel e perfil sem overflow em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await setup(page);
  await page.goto('/carreira');
  await expect(page.getByRole('heading', { name: 'Olá, José' })).toBeVisible();
  await expect(page.getByText('José da Silva', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: 'Força do perfil' })).toHaveAttribute('aria-valuenow', '80');
  await expect(page.getByText('Avançado', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Consultor de vendas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Desenvolvedor Full Stack' })).toHaveCount(0);
  await expect(page.getByText('Remoto · PJ', { exact: true })).toBeVisible();
  await expect(page.getByText('chave_desconhecida')).toHaveCount(0);
  await page.getByText('Histórico (1)', { exact: true }).click();
  await expect(page.getByText('Contratado 🎉')).toBeVisible();
  await expect(page.getByText('Pessoas em cada etapa agora')).toHaveCount(0);
  await expect(page.getByText('Esta vaga foi encerrada')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`storage/qa/portal-candidato/painel-${width}.png`), fullPage: true });
  await page.getByRole('button', { name: '90% · Alta compatibilidade' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Meu perfil', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Meu perfil profissional' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('aliases abrem somente as páginas canônicas', async ({ page }) => {
  await setup(page);
  for (const [source, destination] of [['/carreiras/conta', '/carreira'], ['/carreiras/painel', '/carreira'], ['/carreiras/perfil', '/carreira/perfil'], ['/carreiras/conta/perfil', '/carreira/perfil'], ['/carreiras/conta/candidaturas', '/carreira#candidaturas']]) {
    await page.goto(source); await expect(page).toHaveURL(new RegExp(destination.replace('#', '\\#') + '$'));
  }
});

test('salvas removidas desaparecem imediatamente e falha reverte estado', async ({ page }) => {
  await setup(page); await page.goto('/carreiras');
  const save = page.getByRole('button', { name: 'Salvar vaga: Consultor de vendas' });
  await expect(save).toBeEnabled(); await save.click();
  await page.getByRole('button', { name: 'Vagas salvas 1', exact: true }).click();
  await page.getByRole('button', { name: 'Remover dos favoritos: Consultor de vendas' }).click();
  await expect(page.getByRole('heading', { name: 'Consultor de vendas' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vagas salvas 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vagas salvas 0', exact: true }).click();
  await page.route('**/api/candidate-portal/saved-jobs/vendas', route => route.fulfill({ status: 500, body: '{}' }));
  await save.click(); await expect(page.locator('p[role="alert"]')).toContainText('Não foi possível atualizar');
  await expect(save).toHaveAttribute('aria-pressed', 'false');
});

test('idioma fecha ao selecionar, clicar fora e pressionar ESC', async ({ page }) => {
  await setup(page); await page.goto('/carreiras');
  const open = page.getByRole('button', { name: /Selecionar idioma/ });
  await open.click(); await expect(page.getByRole('listbox', { name: 'Idiomas disponíveis' })).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox', { name: 'Idiomas disponíveis' })).toHaveCount(0);
  await open.click(); await page.getByRole('heading', { name: /Seu talento/ }).click(); await expect(page.getByRole('listbox', { name: 'Idiomas disponíveis' })).toHaveCount(0);
  await open.click(); await page.getByRole('option', { name: /Português/ }).click(); await expect(page.getByRole('listbox', { name: 'Idiomas disponíveis' })).toHaveCount(0);
});

test('cadastro termina no painel e portal não volta a exibir Entrar', async ({ page }) => {
  await setup(page, false); await page.goto('/carreiras/conta/entrar?modo=cadastro');
  await page.getByLabel('Nome completo').fill('José da Silva'); await page.getByLabel('E-mail (seu usuário)').fill('candidato@example.test'); await page.locator('input[type="password"]').fill('senha-teste-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click(); await expect(page).toHaveURL(/\/carreira$/);
  await page.getByRole('link', { name: 'Vagas', exact: true }).click(); await expect(page.getByRole('link', { name: 'Minha área' })).toBeVisible(); await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveCount(0);
});

test('idiomas são enviados ao servidor e continuam no perfil após recarregar', async ({ page }) => {
  await setup(page); await page.goto('/carreira/perfil');
  await page.getByLabel('Idiomas que você conhece').fill('Português, Inglês, Espanhol');
  const saved = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/candidate-portal/me'));
  await page.getByRole('button', { name: /Salvar/ }).first().click();
  expect((await saved).postDataJSON().languages).toEqual(['Português', 'Inglês', 'Espanhol']);
  await expect(page.getByText('Perfil salvo.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Idiomas que você conhece')).toHaveValue('Português, Inglês, Espanhol');
  await expect(page.getByText('voc?', { exact: false })).toHaveCount(0);
});

test('salvar resumo atualiza força real e mostra confirmação curta', async ({ page }) => {
  await setup(page); await page.goto('/carreira/perfil');
  await page.locator('#resumo textarea').fill('Profissional com experiência em vendas e atendimento.');
  await page.getByRole('button', { name: /Salvar/ }).first().click();
  await expect(page.getByText('Item do perfil concluído', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Painel', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Força do perfil' })).toHaveAttribute('aria-valuenow', '100');
});

async function setupAssessments(page: Page) {
  await setup(page);
  const types = [{ kind: 'PORTUGUESE', title: 'Português', required: true }, { kind: 'MATH', title: 'Matemática', required: true }, { kind: 'ESSAY', title: 'Redação', required: true }, { kind: 'CULTURE', title: 'Fit cultural: preferências de trabalho', required: false }];
  const records: Record<string, any> = {};
  await page.route('**/api/candidate-portal/assessments**', async route => {
    const parts = new URL(route.request().url()).pathname.split('/assessments')[1].split('/').filter(Boolean);
    if (!parts.length) return route.fulfill({ json: types.map(type => ({ ...type, status: records[type.kind]?.status ?? 'NOT_STARTED' })) });
    const kind = parts[0];
    records[kind] ??= { ...types.find(type => type.kind === kind), id: kind, status: 'IN_PROGRESS', revision: 0, questions: kind === 'ESSAY' ? [] : [{ id: 'q1', text: 'Qual palavra está escrita corretamente?', options: ['exceção', 'excessão', 'esceção', 'exseção', 'exeção'] }], answers: {}, essay: '', shareConsent: false, score: null, prompt: 'Escreva sobre comunicação e colaboração.', rubric: ['Clareza', 'Coerência'] };
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      records[kind] = { ...records[kind], ...payload, revision: records[kind].revision + 1, status: payload.complete ? 'COMPLETED' : records[kind].status, score: payload.complete && ['MATH', 'PORTUGUESE'].includes(kind) ? 100 : records[kind].score };
    }
    return route.fulfill({ json: records[kind] });
  });
}

for (const width of [360, 1280]) test(`avaliação salva, retoma, conclui e revoga compartilhamento em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await setupAssessments(page); await page.goto('/carreira/avaliacoes');
  await expect(page.getByText('Obrigatórias concluídas: 0 de 3')).toBeVisible();
  await page.getByRole('button', { name: 'Começar: Português', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Concluir avaliação' })).toBeDisabled();
  await expect(page.getByRole('progressbar', { name: 'Perguntas respondidas' })).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('radio', { name: 'A. exceção', exact: true }).check();
  await expect(page.getByRole('progressbar', { name: 'Perguntas respondidas' })).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Rascunho salvo. Você pode continuar depois.')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Continuar: Português', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'A. exceção', exact: true })).toBeChecked();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Concluir avaliação', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page.getByText('Avaliação concluída e salva.')).toBeVisible();
  await expect(page.getByText('Concluída. Resultado: 100/100.')).toBeVisible();
  await page.getByRole('checkbox').uncheck();
  await expect(page.getByText('Compartilhamento revogado.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`storage/qa/portal-candidato/avaliacoes-${width}.png`), fullPage: true });
});

test('conflito de gravação mantém as respostas na tela e permite reabrir versão salva', async ({ page }) => {
  await setupAssessments(page); await page.goto('/carreira/avaliacoes');
  await page.getByRole('button', { name: 'Começar: Matemática', exact: true }).click();
  await page.getByRole('radio').first().check();
  await page.route('**/api/candidate-portal/assessments/MATH', route => route.fulfill({ status: 409, json: { message: 'Outra aba atualizou esta avaliação.' } }));
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Outra aba');
  await expect(page.getByRole('radio').first()).toBeChecked();
  await page.getByRole('button', { name: 'Reabrir versão salva' }).click();
  await expect(page.getByRole('radio').first()).not.toBeChecked();
});

test('redação exige texto suficiente e exibe critérios de revisão humana', async ({ page }) => {
  await setupAssessments(page); await page.goto('/carreira/avaliacoes');
  await page.getByRole('button', { name: 'Começar: Redação', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Concluir avaliação' })).toBeDisabled();
  await page.getByLabel('Sua redação').fill('Uma equipe pode conversar com clareza para resolver problemas. '.repeat(20));
  await expect(page.getByRole('button', { name: 'Concluir avaliação' })).toBeEnabled();
  await expect(page.getByText('Critérios de revisão:', { exact: false })).toBeVisible();
});

test('candidatura bloqueia avaliações pendentes e libera após verificar conclusão', async ({ page }) => {
  await setup(page);
  let complete = false;
  await page.route('**/api/candidate-portal/assessments', route => route.fulfill({ json: ['PORTUGUESE', 'MATH', 'ESSAY'].map(kind => ({ kind, required: true, status: complete ? 'COMPLETED' : 'NOT_STARTED' })) }));
  await page.goto('/carreiras/empresa/vendas');
  await expect(page.getByRole('link', { name: 'Concluir avaliações obrigatórias' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sim, reutilizar' })).toHaveCount(0);
  complete = true;
  await page.getByRole('button', { name: 'Verificar novamente' }).click();
  await expect(page.getByRole('button', { name: 'Sim, reutilizar' })).toBeVisible();
});
