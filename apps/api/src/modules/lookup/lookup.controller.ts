import { BadRequestException, Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

async function getJson(url: string, timeoutMs = 6000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'InnovationRH/1.0' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Consulta CEP e CNPJ pelo servidor: o navegador não depende de serviços externos (CORS/bloqueios). */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR')
@Controller('lookup')
export class LookupController {
  @Get('cep/:cep')
  async cep(@Param('cep') raw: string) {
    const cep = raw.replace(/\D/g, '');
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
      legalName: data.razao_social ?? '',
      tradeName: data.nome_fantasia ?? est?.nome_fantasia ?? '',
      street: data.logradouro ?? est?.logradouro ?? '',
      streetNumber: data.numero ?? est?.numero ?? '',
      addressComplement: data.complemento ?? est?.complemento ?? '',
      neighborhood: data.bairro ?? est?.bairro ?? '',
      city: data.municipio ?? est?.cidade?.nome ?? '',
      state: data.uf ?? est?.estado?.sigla ?? '',
      cep: String(data.cep ?? est?.cep ?? '').replace(/\D/g, ''),
      phone: data.ddd_telefone_1 ?? '',
      email: data.email ?? est?.email ?? '',
    };
  }
}
