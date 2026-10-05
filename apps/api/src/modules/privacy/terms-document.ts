import { createHash } from 'crypto';
import { CURRENT_TERMS_VERSION } from './privacy.constants';

export interface TermsParty {
  name: string;
  email: string;
  cpf?: string | null;
  rg?: string | null;
  position?: string | null;
  department?: string | null;
  registration?: string | null;
  profile?: string | null;
}

export interface TermsCompany {
  name: string;
  legalName?: string | null;
  document?: string | null;
  address?: string | null;
}

export interface TermsSection { title: string; clauses: string[] }

export interface TermsDocument {
  version: string;
  title: string;
  preamble: string;
  signer: TermsParty;
  company: TermsCompany;
  sections: TermsSection[];
  closing: string;
  contentHash: string;
}

const PROFILE_LABEL: Record<string, string> = {
  DEV: 'Desenvolvedor da plataforma', CEO: 'Diretoria', CONTABIL: 'Contabilidade', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'Recursos Humanos', GESTOR: 'Gestor', FUNCIONARIO: 'Colaborador', CONSULTA: 'Consulta',
};

export function formatCpf(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : digits || 'não informado';
}

export function formatCnpj(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return formatCpf(digits);
  return digits || 'não informado';
}

export function buildTermsDocument(input: { signer: TermsParty; company: TermsCompany }): TermsDocument {
  const { signer, company } = input;
  const companyName = company.legalName || company.name;
  const profile = PROFILE_LABEL[String(signer.profile ?? '').toUpperCase()] ?? 'Usuário';

  const preamble =
    `Pelo presente instrumento, de um lado ${companyName}, inscrita no CNPJ/CPF sob o nº ${formatCnpj(company.document)}` +
    `${company.address ? `, com sede em ${company.address}` : ''}, doravante denominada EMPRESA (Controladora dos dados pessoais), ` +
    `e, de outro, ${signer.name}, e-mail ${signer.email}, CPF nº ${formatCpf(signer.cpf)}` +
    `${signer.rg ? `, RG nº ${signer.rg}` : ''}${signer.position ? `, ocupante do cargo de ${signer.position}` : ''}` +
    `${signer.registration ? `, matrícula ${signer.registration}` : ''}, com perfil de acesso "${profile}", doravante denominado(a) USUÁRIO(A), ` +
    `têm entre si justo e acordado o presente Termo de Uso e Política de Privacidade do sistema Innovation RH, ` +
    `fornecido por Innovation System e consultoria (OPERADORA), que se regerá pelas cláusulas a seguir.`;

  const sections: TermsSection[] = [
    {
      title: 'Cláusula 1 – Objeto',
      clauses: [
        '1.1. O presente Termo disciplina o acesso e o uso, pelo USUÁRIO, do sistema Innovation RH, plataforma web de gestão de pessoas que reúne cadastro de colaboradores, controle de ponto, escalas, férias, ocorrências disciplinares, comunicados, documentos, folha operacional e demais módulos contratados pela EMPRESA.',
        '1.2. O acesso é pessoal e destina-se exclusivamente ao exercício das atividades profissionais do USUÁRIO na EMPRESA, dentro das permissões do seu perfil.',
      ],
    },
    {
      title: 'Cláusula 2 – Cadastro, credenciais e segurança',
      clauses: [
        '2.1. O USUÁRIO declara que os dados do seu cadastro são verdadeiros e compromete-se a mantê-los atualizados.',
        '2.2. Login e senha são pessoais e intransferíveis. É vedado compartilhar credenciais, permitir que terceiros acessem o sistema com a sua conta ou deixar a sessão aberta em equipamento de uso comum.',
        '2.3. Toda ação realizada com as credenciais do USUÁRIO presume-se por ele realizada, sendo registrada em trilha de auditoria com data, hora, endereço IP e dispositivo, nos termos do art. 37 da Lei nº 13.709/2018 (LGPD) e do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).',
        '2.4. Em caso de suspeita de acesso indevido, o USUÁRIO deve alterar a senha imediatamente e comunicar a EMPRESA ou o suporte.',
      ],
    },
    {
      title: 'Cláusula 3 – Condutas permitidas e vedadas',
      clauses: [
        '3.1. O USUÁRIO deve acessar apenas as informações necessárias à sua função, observando os princípios da finalidade, necessidade e minimização (art. 6º da LGPD).',
        '3.2. É vedado: (a) extrair, copiar ou divulgar dados de colaboradores fora das finalidades da EMPRESA; (b) alterar registros de ponto, escalas ou ocorrências sem justificativa e autorização; (c) tentar burlar controles de segurança ou acessar áreas não autorizadas; (d) inserir informações falsas ou ofensivas.',
        '3.3. O descumprimento deste Termo e das políticas internas poderá acarretar medidas disciplinares previstas na legislação trabalhista (advertência, suspensão ou, nos casos graves, rescisão por justa causa, art. 482 da CLT), sem prejuízo de responsabilização civil e penal.',
      ],
    },
    {
      title: 'Cláusula 4 – Tratamento de dados pessoais (LGPD)',
      clauses: [
        '4.1. A EMPRESA atua como Controladora e a Innovation System e consultoria como Operadora dos dados pessoais tratados no sistema, nos termos do art. 5º, VI e VII, da LGPD. A Operadora trata os dados somente conforme as instruções documentadas da Controladora.',
        '4.2. São tratados, conforme o módulo utilizado: dados de identificação e contato; dados funcionais e contratuais; registros de jornada e geolocalização do ponto, quando habilitada; dados de saúde ocupacional (ASO/atestados), considerados sensíveis; dados de acesso (IP, dispositivo, data e hora).',
        '4.3. As bases legais são o cumprimento de obrigação legal ou regulatória (art. 7º, II), a execução de contrato (art. 7º, V), o exercício regular de direitos (art. 7º, VI) e, para dados sensíveis, o art. 11, II, "a" e "d", da LGPD.',
        '4.4. Os dados são mantidos pelos prazos exigidos pela legislação trabalhista, previdenciária e fiscal (em regra de 5 a 30 anos, conforme o documento) e, após, eliminados ou anonimizados.',
        '4.5. O titular pode solicitar confirmação, acesso, correção, anonimização, portabilidade e informações sobre o tratamento (art. 18 da LGPD) por meio da EMPRESA, que é a Controladora. A Operadora prestará o suporte técnico necessário.',
        '4.6. A plataforma adota criptografia em trânsito, controle de acesso por perfil, autenticação em duas etapas opcional ou obrigatória por perfil, registro de auditoria e cópias de segurança.',
        '4.7. Ferramentas de inteligência artificial eventualmente disponíveis apoiam análises e sugestões; não substituem a decisão humana e os dados pessoais dos colaboradores não são utilizados para treinar modelos de uso público.',
      ],
    },
    {
      title: 'Cláusula 5 – Confidencialidade',
      clauses: [
        '5.1. O USUÁRIO obriga-se a manter sigilo sobre todas as informações a que tiver acesso por meio do sistema, durante a vigência do vínculo e pelo prazo de 5 (cinco) anos após o seu término, respondendo por eventual vazamento a que der causa.',
      ],
    },
    {
      title: 'Cláusula 6 – Propriedade intelectual e disponibilidade',
      clauses: [
        '6.1. O sistema, sua marca, código e documentação são de propriedade da Operadora. Este Termo não transfere ao USUÁRIO qualquer direito além do uso pessoal e limitado da plataforma.',
        '6.2. A Operadora empenha-se em manter o sistema disponível, ressalvadas manutenções programadas, falhas de terceiros e casos fortuitos ou de força maior.',
      ],
    },
    {
      title: 'Cláusula 7 – Assinatura eletrônica e prova',
      clauses: [
        '7.1. As partes reconhecem como válida a assinatura eletrônica deste Termo, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e do art. 107 do Código Civil, por meio de autenticação com credenciais pessoais e confirmação expressa.',
        '7.2. No ato do aceite são registrados: identificação do USUÁRIO, data e hora (horário de Brasília), endereço IP, dispositivo, versão e código de integridade (hash SHA-256) do texto aceito e, quando disponível, assinatura digital da plataforma. Tais registros constituem prova do aceite.',
        '7.3. O texto do Termo é identificado por versão. Havendo nova versão, será solicitado novo aceite.',
      ],
    },
    {
      title: 'Cláusula 8 – Vigência e rescisão',
      clauses: [
        '8.1. Este Termo vigora enquanto o USUÁRIO mantiver acesso ao sistema. O acesso poderá ser suspenso ou encerrado a qualquer tempo pela EMPRESA, por término do vínculo, ou pela Operadora em caso de violação deste Termo ou de inadimplência da EMPRESA.',
      ],
    },
    {
      title: 'Cláusula 9 – Disposições gerais e foro',
      clauses: [
        '9.1. Este Termo é regido pelas leis da República Federativa do Brasil. Eventuais controvérsias serão dirimidas no foro da comarca da sede da EMPRESA, com renúncia a qualquer outro, por mais privilegiado que seja.',
        '9.2. A tolerância de qualquer das partes quanto ao descumprimento de cláusula não importa renúncia ou novação.',
      ],
    },
  ];

  const closing = 'E, por estarem de acordo, as partes firmam eletronicamente o presente Termo, que produz efeitos a partir da data e hora do aceite registrados abaixo.';

  const contentHash = createHash('sha256')
    .update(JSON.stringify({ v: CURRENT_TERMS_VERSION, preamble, sections, closing }))
    .digest('hex');

  return {
    version: CURRENT_TERMS_VERSION,
    title: 'TERMO DE USO E POLÍTICA DE PRIVACIDADE',
    preamble,
    signer,
    company,
    sections,
    closing,
    contentHash,
  };
}
