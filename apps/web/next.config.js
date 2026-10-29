const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  typescript: {
    ignoreBuildErrors: false,
  },
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Rotas antigas da Plataforma (hub com ?tab=, páginas soltas e abas de Faturas) -> as 6 áreas novas. Preservam favoritos e links externos.
  async redirects() {
    const platform = '/:tenant/dashboard/platform';
    const clientes = `${platform}/clientes`;
    const financeiro = (aba) => `${platform}/financeiro?aba=${aba}`;
    const sistema = (aba) => `${platform}/sistema?aba=${aba}`;
    const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const hubTab = (value) => [{ type: 'query', key: 'tab', value }];
    const hubSub = (tab, sub) => [{ type: 'query', key: 'tab', value: tab }, { type: 'query', key: 'sub', value: sub }];
    const permanent = (source, destination, has) => ({ source, destination, permanent: true, ...(has ? { has } : {}) });
    // Aba do dossiê antigo (?sub= / ?tab= da empresa) -> aba da ficha do cliente.
    const fichaAbas = [['general', 'geral'], ['subscription', 'assinatura'], ['finance', 'faturas'], ['users', 'usuarios'], ['documents', 'documentos'], ['support', 'suporte'], ['logs', 'auditoria']];

    return [
      // ---- hub antigo: /platform?tab=...&sub=... ----
      ...fichaAbas.map(([old, nova]) => permanent(platform, `${clientes}/:company?aba=${nova}`, [...hubSub('dossie', old), { type: 'query', key: 'company', value: '(?<company>.+)' }])),
      permanent(platform, `${clientes}/:company?aba=geral`, [...hubTab('dossie'), { type: 'query', key: 'company', value: '(?<company>.+)' }]),
      permanent(platform, `${clientes}/:company?aba=geral`, [...hubTab('(resumo|empresas)'), { type: 'query', key: 'company', value: '(?<company>.+)' }]),
      permanent(platform, clientes, hubTab('empresas')),
      permanent(platform, `${platform}/clientes/contratos`, hubSub('comercial', 'contratos')),
      permanent(platform, `${platform}/clientes/propostas`, hubSub('comercial', 'propostas')),
      permanent(platform, `${platform}/clientes/contratos`, hubTab('comercial')),
      permanent(platform, '/:tenant/dashboard/contabilidade', hubTab('contabilidade')),
      permanent(platform, financeiro('faturas'), hubTab('financeiro')),
      permanent(platform, `${platform}/suporte?companyId=:company`, [...hubTab('suporte'), { type: 'query', key: 'company', value: '(?<company>.+)' }]),
      permanent(platform, `${platform}/suporte`, hubTab('suporte')),
      permanent(platform, `${platform}/sistema?aba=auditoria&empresa=:company`, [...hubTab('auditoria'), { type: 'query', key: 'company', value: '(?<company>.+)' }]),
      permanent(platform, sistema('auditoria'), hubTab('auditoria')),
      permanent(platform, sistema('permissoes'), hubSub('configuracoes', 'permissoes')),
      permanent(platform, sistema('acessos'), hubSub('configuracoes', 'acessos')),
      permanent(platform, sistema('configuracao'), hubTab('configuracoes')),
      permanent(platform, `${clientes}/:company?aba=geral`, [{ type: 'query', key: 'company', value: '(?<company>.+)' }]),
      // ---- páginas soltas ----
      permanent(`${platform}/companies`, clientes),
      permanent(`${platform}/intelligence`, platform),
      permanent(`${platform}/audit`, sistema('auditoria')),
      permanent(`${platform}/support`, `${platform}/suporte`),
      permanent(`${platform}/permissions`, sistema('permissoes')),
      permanent(`${platform}/access`, sistema('acessos')),
      permanent(`${platform}/configuration`, sistema('configuracao')),
      permanent(`${platform}/visitas`, sistema('visitas')),
      permanent(`${platform}/contracts`, `${platform}/clientes/contratos`),
      permanent(`${platform}/proposals`, `${platform}/clientes/propostas`),
      permanent(`${platform}/accounting`, '/:tenant/dashboard/contabilidade'),
      permanent(`${platform}/finance`, `${financeiro('faturas')}&q=:search`, [{ type: 'query', key: 'search', value: '(?<search>.+)' }]),
      permanent(`${platform}/finance`, financeiro('faturas')),
      permanent(`${platform}/plans`, financeiro('planos')),
      permanent(`${platform}/coupons`, financeiro('cupons')),
      permanent(`${platform}/subscriptions`, financeiro('assinaturas')),
      // Antigo /platform/<id-da-empresa>?tab=<aba> -> ficha do cliente (só UUID, para não capturar páginas reais).
      ...fichaAbas.map(([old, nova]) => permanent(`${platform}/:companyId(${uuid})`, `${clientes}/:companyId?aba=${nova}`, hubTab(old))),
      permanent(`${platform}/:companyId(${uuid})`, `${clientes}/:companyId?aba=geral`),
      // ---- abas da plataforma que viviam em Faturas (a tela de faturas da EMPRESA segue em /dashboard/faturas) ----
      permanent('/:tenant/dashboard/faturas', `${financeiro(':aba')}`, [{ type: 'query', key: 'aba', value: '(?<aba>faturas|reembolsos|assinaturas|planos|cupons|ajustes-fiscais)' }]),
      permanent('/:tenant/dashboard/faturas', `${financeiro('faturas')}&q=:busca`, [{ type: 'query', key: 'q', value: '(?<busca>.+)' }]),
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
