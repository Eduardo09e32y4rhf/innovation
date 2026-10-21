/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Rotas antigas da Plataforma (agora abas do hub ou da tela de Faturas). Preservam favoritos e links externos.
  async redirects() {
    const platform = '/:tenant/dashboard/platform';
    const hub = (query) => `${platform}?${query}`;
    const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const dossieTabs = 'general|subscription|finance|users|documents|support|logs';
    return [
      { source: `${platform}/plans`, destination: '/:tenant/dashboard/faturas?aba=planos', permanent: true },
      { source: `${platform}/coupons`, destination: '/:tenant/dashboard/faturas?aba=cupons', permanent: true },
      { source: `${platform}/subscriptions`, destination: '/:tenant/dashboard/faturas?aba=assinaturas', permanent: true },
      { source: `${platform}/permissions`, destination: hub('tab=configuracoes&sub=permissoes'), permanent: true },
      { source: `${platform}/access`, destination: hub('tab=configuracoes&sub=acessos'), permanent: true },
      { source: `${platform}/configuration`, destination: hub('tab=configuracoes&sub=global'), permanent: true },
      { source: `${platform}/companies`, destination: hub('tab=empresas'), permanent: true },
      { source: `${platform}/intelligence`, destination: hub('tab=resumo&sub=alertas'), permanent: true },
      { source: `${platform}/audit`, destination: hub('tab=auditoria'), permanent: true },
      { source: `${platform}/support`, destination: hub('tab=suporte'), permanent: true },
      // Antigo /platform/<id-da-empresa>?tab=<aba> -> dossie da empresa no hub (so UUID, para nao capturar as paginas reais).
      { source: `${platform}/:companyId(${uuid})`, has: [{ type: 'query', key: 'tab', value: `(?<sub>${dossieTabs})` }], destination: hub('tab=dossie&sub=:sub&company=:companyId'), permanent: true },
      { source: `${platform}/:companyId(${uuid})`, destination: hub('tab=dossie&sub=general&company=:companyId'), permanent: true },
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
