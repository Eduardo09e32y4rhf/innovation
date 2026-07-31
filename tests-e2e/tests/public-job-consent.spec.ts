import { expect, test } from '@playwright/test';

const companyId = 'company-e2e';
const jobId = 'job-e2e';

test('candidatura publica nao envia dados sem consentimento explicito', async ({ page }) => {
  let applicationRequests = 0;

  await page.route(`**/public/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      json: {
        id: jobId,
        companyId,
        title: 'Analista de QA',
        description: 'Validar fluxos criticos do produto.',
        location: 'Remoto',
        employmentType: 'CLT',
        benefits: [],
        status: 'OPEN',
        company: {
          id: companyId,
          name: 'Empresa E2E',
          primaryColor: '#0f766e',
        },
      },
    });
  });
  await page.route(`**/public/jobs/${jobId}/apply`, async (route) => {
    applicationRequests += 1;
    await route.fulfill({ json: { message: 'Candidatura recebida.' } });
  });

  await page.goto(`/carreiras/${companyId}/${jobId}`);
  await expect(page.getByRole('heading', { name: 'Analista de QA' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nome completo' }).fill('Pessoa Candidata');
  await page.getByRole('textbox', { name: 'E-mail' }).fill('candidate@example.test');
  await page.getByRole('textbox', { name: 'Telefone / WhatsApp' }).fill('11999999999');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'curriculo.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 deterministic-e2e'),
  });

  const consent = page.getByRole('checkbox', { name: /Autorizo o tratamento/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole('button', { name: 'Enviar candidatura' }).click();

  expect(await consent.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(false);
  expect(applicationRequests).toBe(0);
});
