import { BadRequestException, ValidationError } from '@nestjs/common';

/** Nomes que o usuario reconhece para os campos tecnicos da API. */
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome', email: 'E-mail', password: 'Senha', newPassword: 'Nova senha', cpf: 'CPF', cnpj: 'CNPJ', document: 'CPF/CNPJ',
  phone: 'Telefone', secondaryPhone: 'Telefone secundário', birthDate: 'Data de nascimento', admissionDate: 'Data de admissão',
  terminationDate: 'Data de desligamento', registration: 'Matrícula', rg: 'RG', rgIssuer: 'Órgão emissor do RG', rgState: 'UF do RG',
  rgIssueDate: 'Data de emissão do RG', cep: 'CEP', zipCode: 'CEP', street: 'Rua', streetNumber: 'Número', neighborhood: 'Bairro',
  city: 'Cidade', state: 'Estado', addressComplement: 'Complemento', position: 'Cargo', department: 'Departamento', salary: 'Salário',
  contractType: 'Tipo de contrato', workScale: 'Escala de trabalho', dailyWorkload: 'Carga horária diária', managerId: 'Gestor',
  legalName: 'Razão social', tradeName: 'Nome fantasia', role: 'Perfil de acesso', employeeId: 'Funcionário', companyId: 'Empresa',
  planId: 'Plano', seatQuantity: 'Quantidade de usuários', couponCode: 'Cupom', title: 'Título', description: 'Descrição',
  reason: 'Motivo', startDate: 'Data de início', endDate: 'Data de fim', dueDate: 'Vencimento', amount: 'Valor', type: 'Tipo',
  motherName: 'Nome da mãe', fatherName: 'Nome do pai', pis: 'PIS', gender: 'Sexo', maritalStatus: 'Estado civil', nationality: 'Nacionalidade',
  bankName: 'Banco', bankAgency: 'Agência', bankAccount: 'Conta', standardEntry: 'Horário de entrada', standardExit: 'Horário de saída',
  standardLunchStart: 'Saída para almoço', standardLunchReturn: 'Volta do almoço', code: 'Código', token: 'Código de acesso',
};

export function fieldLabel(field: string): string {
  const last = field.split('.').pop() ?? field;
  return FIELD_LABELS[last] ?? last.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function translate(constraint: string, raw: string, label: string): string {
  const num = /(-?\d+(?:\.\d+)?)/.exec(raw)?.[1];
  switch (constraint) {
    case 'isNotEmpty': case 'isDefined': return `${label}: preencha este campo.`;
    case 'isEmail': return `${label}: informe um e-mail válido (ex.: nome@empresa.com.br).`;
    case 'isString': return `${label}: informe um texto.`;
    case 'isInt': case 'isNumber': return `${label}: informe um número válido.`;
    case 'isBoolean': return `${label}: escolha sim ou não.`;
    case 'isDateString': case 'isISO8601': case 'isDate': return `${label}: informe uma data válida.`;
    case 'isUUID': return `${label}: selecione uma opção da lista.`;
    case 'isEnum': case 'isIn': return `${label}: escolha uma das opções disponíveis.`;
    case 'minLength': return `${label}: precisa ter pelo menos ${num} caracteres.`;
    case 'maxLength': return `${label}: pode ter no máximo ${num} caracteres.`;
    case 'min': return `${label}: o valor mínimo é ${num}.`;
    case 'max': return `${label}: o valor máximo é ${num}.`;
    case 'isPositive': return `${label}: informe um valor maior que zero.`;
    case 'matches': return `${label}: formato inválido. Confira o que foi digitado.`;
    case 'isArray': return `${label}: selecione ao menos uma opção.`;
    case 'whitelistValidation': return `${label}: campo não reconhecido.`;
    default: return `${label}: valor inválido.`;
  }
}

function collect(errors: ValidationError[], parent = ''): Array<{ field: string; message: string }> {
  const out: Array<{ field: string; message: string }> = [];
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const label = fieldLabel(path);
    for (const [constraint, raw] of Object.entries(error.constraints ?? {})) {
      out.push({ field: path, message: translate(constraint, raw, label) });
    }
    if (error.children?.length) out.push(...collect(error.children, path));
  }
  return out;
}

/** exceptionFactory do ValidationPipe: diz exatamente qual campo esta errado, em portugues. */
export function friendlyValidationFactory(errors: ValidationError[]) {
  const fields = collect(errors);
  const messages = fields.map((f) => f.message);
  return new BadRequestException({
    message: messages.length === 1 ? messages[0] : `Revise ${messages.length} campos: ${messages.join(' ')}`,
    code: 'VALIDATION_FIELDS',
    fields,
  });
}
