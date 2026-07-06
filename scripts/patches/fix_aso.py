import re

with open('apps/web/app/dashboard/management/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

print_aso_pdf_func = '''
export function printAsoPdf(emp: any, r: any, company: any) {
  const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
  const docTitle = 'Encaminhamento para Exame Médico (ASO)';
  const asoType = r.asoType || 'ADMISSIONAL';
  const subtitle = asoType.replace(/_/g, ' ');
  
  const text = `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Encaminhamos o(a) colaborador(a) abaixo qualificado(a) para a realização de <strong>Exame Médico Ocupacional (${subtitle})</strong>, conforme previsto na NR-7.</p>
  <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Por favor, realizem a avaliação clínica e os exames complementares (se aplicáveis) e emitam o respectivo Atestado de Saúde Ocupacional (ASO).</p>`;

  const companyInfo = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.document || company.cnpj,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.city, company.state].filter(Boolean).join(', '),
  } : null;

  const html = buildPdfShell({ title: docTitle, subtitle: emp.name }, companyInfo, `
    ${section('Dados do Empregador (Empresa)', infoGrid([
      { label: 'Razão Social', value: company?.legalName || company?.name || '---' },
      { label: 'CNPJ', value: company?.document || company?.cnpj || '---' },
      { label: 'Endereço', value: [company?.street, company?.streetNumber, company?.city, company?.state].filter(Boolean).join(', ') || '---' },
    ], 1))}
    ${section('Qualificação do Colaborador', infoGrid([
      { label: 'Nome Completo', value: emp.name },
      { label: 'CPF', value: emp.cpf },
      { label: 'Data Nasc.', value: emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR') : '---' },
      { label: 'Cargo', value: emp.position },
      { label: 'Setor/Depto', value: emp.department },
    ], 3))}
    ${section('Dados do Encaminhamento', `
      ${infoGrid([
        { label: 'Tipo de Exame', value: subtitle },
        { label: 'Clínica Agendada', value: r.clinicName || 'À definir' },
        { label: 'Endereço da Clínica', value: (r.clinicAddress || r.observation) || 'Não informado' },
        { label: 'Data Prevista', value: r.examDate ? new Date(r.examDate).toLocaleDateString('pt-BR') : 'Não agendado' },
      ], 2)}
    `)}
    ${section('Mensagem', text)}
    ${signatureBlock(['Autorização RH / Empregador', 'Recebimento pela Clínica', 'Assinatura do Funcionário'])}
  `);
  
  printPdf(html, `encaminhamento-aso-${emp.id}.pdf`);
}
'''

if 'export function printAsoPdf' not in content:
    content = content.replace('function AsoTab({', print_aso_pdf_func + '\\nfunction AsoTab({')

# Replace handleGenerateAsoPdf
old_handle = '''  const handleGenerateAsoPdf = (r: EmployeeAsoRecord) => {
    const emp = employees.find(e => e.id === r.employeeId);
    if (!emp) return;
    
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const docTitle = 'Encaminhamento para Exame Médico (ASO)';
    const subtitle = r.asoType.replace(/_/g, ' ');
    
    const text = `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Encaminhamos o(a) colaborador(a) abaixo qualificado(a) para a realização de <strong>Exame Médico Ocupacional (${subtitle})</strong>, conforme previsto na NR-7.</p>
    <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Por favor, realizem a avaliação clínica e os exames complementares (se aplicáveis) e emitam o respectivo Atestado de Saúde Ocupacional (ASO).</p>`;

    const companyInfo = company ? {
      name: company.name,
      legalName: company.legalName,
      document: company.cnpj,
      logoUrl: company.logoUrl,
      phone: company.phone,
      email: company.email,
      address: [company.street, company.streetNumber, company.city, company.state].filter(Boolean).join(', '),
    } : null;

    const html = buildPdfShell({ title: docTitle, subtitle: emp.name }, companyInfo, `
      ${section('Dados do Empregador (Empresa)', infoGrid([
        { label: 'Razão Social', value: company?.legalName || company?.name || '---' },
        { label: 'CNPJ', value: company?.cnpj || '---' },
        { label: 'Endereço', value: [company?.street, company?.streetNumber, company?.city, company?.state].filter(Boolean).join(', ') || '---' },
      ], 1))}
      ${section('Qualificação do Colaborador', infoGrid([
        { label: 'Nome Completo', value: emp.name },
        { label: 'CPF', value: emp.cpf },
        { label: 'Data Nasc.', value: emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR') : '---' },
        { label: 'Cargo', value: emp.position },
        { label: 'Setor/Depto', value: emp.department },
      ], 3))}
      ${section('Dados do Encaminhamento', `
        ${infoGrid([
          { label: 'Tipo de Exame', value: subtitle },
          { label: 'Clínica Agendada', value: r.clinicName || 'À definir' },
          { label: 'Endereço da Clínica', value: r.observation || 'Não informado' },
          { label: 'Data Prevista', value: r.examDate ? new Date(r.examDate).toLocaleDateString('pt-BR') : 'Não agendado' },
        ], 2)}
      `)}
      ${section('Mensagem', text)}
      ${signatureBlock(['Autorização RH / Empregador', 'Recebimento pela Clínica', 'Assinatura do Funcionário'])}
    `);
    
    printPdf(html, `encaminhamento-aso-${emp.id}.pdf`);
  };'''

new_handle = '''  const handleGenerateAsoPdf = (r: EmployeeAsoRecord) => {
    const emp = employees.find(e => e.id === r.employeeId);
    if (!emp) return;
    printAsoPdf(emp, r, company);
  };'''
content = content.replace(old_handle, new_handle)

# Fix AsoModal signature
content = content.replace(
    'function AsoModal({ record, employees, asos, onClose, onSave, saving }: {',
    'function AsoModal({ record, employees, asos, company, onClose, onSave, saving }: {'
)
content = content.replace(
    'record?: EmployeeAsoRecord; employees: Employee[]; asos: EmployeeAsoRecord[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;',
    'record?: EmployeeAsoRecord; employees: Employee[]; asos: EmployeeAsoRecord[]; company: any; onClose: () => void; onSave: (data: any) => void; saving: boolean;'
)

# Fix where AsoModal is called
content = content.replace(
    'asos={asos}\\n        onClose={() => setAsoForm({ open: false })}',
    'asos={asos}\\n        company={company}\\n        onClose={() => setAsoForm({ open: false })}'
)

# Fix handlePrint
idx1 = content.find('  const handlePrint = () => {\\n    const emp = employees.find(e => e.id === employeeId);')
if idx1 != -1:
    idx2 = content.find('  const ok = !!employeeId;', idx1)
    if idx2 != -1:
        new_print = '''  const handlePrint = () => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return window.alert('Selecione um funcionário antes de imprimir.');
    printAsoPdf(emp, {
      asoType,
      clinicName,
      clinicAddress,
      examDate,
      observation
    }, company);
  };

'''
        content = content[:idx1] + new_print + content[idx2:]

with open('apps/web/app/dashboard/management/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
