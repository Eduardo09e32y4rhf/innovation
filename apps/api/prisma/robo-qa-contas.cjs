'use strict';
/**
 * Contas fixas do robo de QA. Sem dependencias, para poder ser testado sem banco.
 * O robo do site (apps/web/app/_components/robo-qa/engine/contasFixas.ts) usa os mesmos e-mails;
 * tests/unit/web/robo-qa-contas-fixas.spec.ts confere que os dois lados continuam iguais.
 */

const PERFIS = [
  { perfil: 'DEV', rotulo: 'Desenvolvedor' }, // login do proprio robo: e quem liga o teste e faz a limpeza
  { perfil: 'ADMIN', rotulo: 'Administrador' },
  { perfil: 'RH', rotulo: 'RH - Empresas' },
  { perfil: 'RH_RS', rotulo: 'RH - R&S' },
  { perfil: 'GESTOR', rotulo: 'Gestor' },
  { perfil: 'FUNCIONARIO', rotulo: 'Funcionário' },
  { perfil: 'CONSULTA', rotulo: 'Consulta' },
  { perfil: 'COMERCIAL', rotulo: 'Comercial' },
  { perfil: 'CONTABIL', rotulo: 'Contábil' },
];

const EMPRESA = { slug: 'robo-qa', nome: 'ROBO-QA Empresa de Teste' };

const emailFixo = (perfil) => `robo-qa.${String(perfil).toLowerCase().replace(/_/g, '')}@example.com`;
const nomeFixo = (rotulo) => `ROBO-QA ${rotulo}`;

/** Mesma regra da API: 10+ caracteres com maiuscula, minuscula, numero e simbolo. */
const senhaForte = (senha) =>
  typeof senha === 'string' && senha.length >= 10 && /[a-z]/.test(senha) && /[A-Z]/.test(senha) && /\d/.test(senha) && /[^A-Za-z0-9]/.test(senha);

function hostDoBanco(url) {
  try { return new URL(String(url)).hostname.replace(/^\[|\]$/g, ''); } catch { return ''; }
}

const ehHostLocal = (host) => ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(host) || (host !== '' && !host.includes('.'));

/**
 * O seed grava um usuario DEV com senha conhecida: so roda em banco de teste/homologacao, com confirmacao explicita.
 * Devolve { ok: true } ou { ok: false, motivo }.
 */
function avaliarAmbiente(env) {
  if (env.NODE_ENV === 'production' && env.ROBO_QA_PERMITIR_PRODUCAO !== 'sim') {
    return { ok: false, motivo: 'NODE_ENV=production. Este seed cria um DEV com senha conhecida. Em homologacao que roda em modo producao, defina ROBO_QA_PERMITIR_PRODUCAO=sim; nunca no banco dos clientes.' };
  }
  if (env.ROBO_QA_BANCO_DE_TESTE !== 'sim') return { ok: false, motivo: 'Defina ROBO_QA_BANCO_DE_TESTE=sim para confirmar que o DATABASE_URL e um banco de TESTE.' };
  if (!senhaForte(env.ROBO_QA_SENHA)) return { ok: false, motivo: 'Defina ROBO_QA_SENHA com 10+ caracteres, com maiuscula, minuscula, numero e simbolo.' };
  const host = hostDoBanco(env.DATABASE_URL);
  if (!host) return { ok: false, motivo: 'DATABASE_URL ausente ou invalida.' };
  if (!ehHostLocal(host) && env.ROBO_QA_PERMITIR_BANCO_REMOTO !== 'sim') {
    return { ok: false, motivo: `O banco "${host}" nao parece local. Se for um banco de homologacao descartavel, defina ROBO_QA_PERMITIR_BANCO_REMOTO=sim.` };
  }
  return { ok: true };
}

module.exports = { PERFIS, EMPRESA, emailFixo, nomeFixo, senhaForte, avaliarAmbiente, ehHostLocal };
