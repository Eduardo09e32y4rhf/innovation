import { Throttle } from '@nestjs/throttler';
import { outboundFetch } from '../../common/http/outbound';
import { BadRequestException, Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

async function getJson(url: string, timeoutMs = 6000): Promise<any | null> {
  try {
    const res = await outboundFetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'InnovationRH/1.0' } }, { timeoutMs });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// A Receita devolve nomes em MAIÚSCULAS e sem acento. Reescreve em caixa de título e recoloca o acento nas palavras mais comuns.
const ACCENTED: Record<string, string> = {
  solucoes: 'Soluções', servicos: 'Serviços', comercio: 'Comércio', industria: 'Indústria', administracao: 'Administração', gestao: 'Gestão',
  negocios: 'Negócios', participacoes: 'Participações', construcao: 'Construção', educacao: 'Educação', logistica: 'Logística', informatica: 'Informática',
  tecnologia: 'Tecnologia', alimenticios: 'Alimentícios', farmacia: 'Farmácia', mecanica: 'Mecânica', eletronica: 'Eletrônica', consultoria: 'Consultoria',
  seguranca: 'Segurança', saude: 'Saúde', transportes: 'Transportes', publicidade: 'Publicidade', representacoes: 'Representações', producoes: 'Produções',
  comunicacao: 'Comunicação', instalacoes: 'Instalações', manutencao: 'Manutenção', distribuicao: 'Distribuição', importacao: 'Importação', exportacao: 'Exportação',
  agricola: 'Agrícola', pecuaria: 'Pecuária', veiculos: 'Veículos', pecas: 'Peças', acessorios: 'Acessórios', brasil: 'Brasil', assessoria: 'Assessoria',
  clinica: 'Clínica', medica: 'Médica', odontologica: 'Odontológica', juridica: 'Jurídica', contabil: 'Contábil', contabilidade: 'Contabilidade', ambiental: 'Ambiental',
};
const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const LEGAL_SUFFIX = /\s+(ltda|me|epp|eireli|mei|s\.?\/?a\.?|sa|ss|slu)\.?$/i;

function prettyName(raw: unknown): string {
  const text = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.toLocaleLowerCase('pt-BR').split(' ').map((word, i) => {
    if (i > 0 && SMALL_WORDS.has(word)) return word;
    if (ACCENTED[word]) return ACCENTED[word];
    if (/^(ltda|epp|eireli|mei|slu|me|sa|ss|s\/a|s\.a\.)$/.test(word)) return word.toUpperCase();
    return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
  }).join(' ');
}

/** Endereço pelo CEP (BrasilAPI, com ViaCEP de reserva). Compartilhado com a Área do candidato. */
export async function lookupCep(raw: string) {
  const cep = String(raw ?? '').replace(/\D/g, '');
  if (cep.length !== 8) throw new BadRequestException('CEP inválido. Informe os 8 números.');

  const brasil = await getJson(`https://brasilapi.com.br/api/cep/v1/${cep}`);
  if (brasil?.street || brasil?.city) {
    return { cep, street: brasil.street ?? '', neighborhood: brasil.neighborhood ?? '', city: brasil.city ?? '', state: brasil.state ?? '' };
  }
  const via = await getJson(`https://viacep.com.br/ws/${cep}/json/`);
  if (via && !via.erro) {
    return { cep, street: via.logradouro ?? '', neighborhood: via.bairro ?? '', city: via.localidade ?? '', state: via.uf ?? '' };
  }
  throw new NotFoundException('CEP não encontrado. Preencha o endereço manualmente.');
}

/** Consulta CEP e CNPJ pelo servidor: o navegador não depende de serviços externos (CORS/bloqueios). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR')
@Controller('lookup')
export class LookupController {
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('cep/:cep')
  cep(@Param('cep') raw: string) {
    return lookupCep(raw);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('cnpj/:cnpj')
  async cnpj(@Param('cnpj') raw: string) {
    const cnpj = raw.replace(/\D/g, '');
    if (cnpj.length !== 14) throw new BadRequestException('CNPJ inválido. Informe os 14 números.');

    const data = (await getJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, 8000)) ?? (await getJson(`https://publica.cnpj.ws/cnpj/${cnpj}`, 8000));
    if (!data) throw new NotFoundException('Não encontramos esse CNPJ na Receita. Preencha os dados manualmente.');

    // BrasilAPI e CNPJ.ws usam formatos diferentes.
    const est = data.estabelecimento;
    return {
      cnpj,
      legalName: prettyName(data.razao_social),
      // Sem nome fantasia na Receita, usa a razão social sem o sufixo societário (LTDA, ME...).
      tradeName: prettyName(data.nome_fantasia ?? est?.nome_fantasia) || prettyName(String(data.razao_social ?? '').replace(LEGAL_SUFFIX, '')),
      street: prettyName(data.logradouro ?? est?.logradouro),
      streetNumber: data.numero ?? est?.numero ?? '',
      addressComplement: data.complemento ?? est?.complemento ?? '',
      neighborhood: prettyName(data.bairro ?? est?.bairro),
      city: prettyName(data.municipio ?? est?.cidade?.nome),
      state: data.uf ?? est?.estado?.sigla ?? '',
      cep: String(data.cep ?? est?.cep ?? '').replace(/\D/g, ''),
      phone: data.ddd_telefone_1 ?? '',
      email: data.email ?? est?.email ?? '',
    };
  }
}
