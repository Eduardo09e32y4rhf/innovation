const path = require('path');

/** @type {import('next').NextConfig} */
// ---- Cabecalhos de seguranca (SEG headers, Onda 1) ----
// Origem (scheme+host) de uma URL absoluta; '/api' relativo = mesma origem ('self'), nada a acrescentar.
const originOf = (url) => {
  try { return new URL(url).origin; } catch { return null; }
};

/**
 * CSP. Duas politicas (headers separados):
 *  1) ENFORCING so com o que nao depende de scripts/estilos inline: frame-ancestors, base-uri, form-action, object-src.
 *  2) REPORT-ONLY completa (default-src/script-src/style-src/...): o App Router injeta <script> inline (hidratacao RSC e os
 *     scripts do layout), entao sem nonce e preciso 'unsafe-inline' em script-src. Fica em Report-Only ate validar em navegador
 *     (console > violacoes) e so entao promover a enforcing. Nonce exigiria middleware e tornaria todas as paginas dinamicas.
 * Em dev o React precisa de 'unsafe-eval'; em producao nao.
 */
function buildCsp(isProd) {
  const turnstile = 'https://challenges.cloudflare.com';
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL || '');
  const cdnOrigin = originOf(process.env.NEXT_PUBLIC_CDN_URL || '');
  const extra = [apiOrigin, cdnOrigin].filter(Boolean);
  const uniq = (list) => [...new Set(list)].join(' ');
  const enforcing = ["frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
  const reportOnly = [
    "default-src 'self'",
    `script-src ${uniq(["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"]), turnstile])}`,
    // fonts.googleapis.com: cartaz de vagas e PDFs abrem janelas que herdam a politica.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    // Logos/avatares vem da API/CDN ou de URLs https cadastradas; QR e previas usam data:/blob:.
    `img-src ${uniq(["'self'", 'data:', 'blob:', 'https:', ...extra])}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${uniq(["'self'", ...extra, turnstile])}`,
    `frame-src ${turnstile}`,
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return { enforcing, reportOnly };
}
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { outputFileTracingRoot: path.join(__dirname, '../..') },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
    const isProd = process.env.NODE_ENV === 'production';
    const csp = buildCsp(isProd);
    return [
      {
        // Seguranca em todas as rotas (inclui /_next/static e public/). Nao define Cache-Control: o cache segue nas regras abaixo / no Next.
        // Se o nginx do host repetir estes cabecalhos eles saem duplicados: veja docs/DEPLOY-VPS.md.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Ponto usa geolocalizacao (navigator.geolocation). Camera so via <input capture> (nativo do SO, nao depende desta politica).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
          { key: 'Content-Security-Policy', value: csp.enforcing },
          { key: 'Content-Security-Policy-Report-Only', value: csp.reportOnly },
        ],
      },
      {
        // So paginas (HTML/RSC) ficam sem cache. Antes o '/:path*' pegava tambem /_next/static e os arquivos de public/
        // (logo, fontes, imagens), obrigando o navegador a rebaixa-los a cada visita. Arquivos com extensao e /_next/* ficam de fora.
        source: '/((?!_next/|.*\\..*).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        source: '/(.+)\\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|otf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

module.exports = nextConfig;
