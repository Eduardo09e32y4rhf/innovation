/** Endereços das telas da Plataforma. Todo link interno passa por aqui, para uma rota mudar de lugar em um só arquivo. */
const qs = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : '';
};

export function platformLinks(tenant: string) {
  const base = `/${tenant}/dashboard/platform`;
  return {
    base,
    visaoGeral: base,
    clientes: (busca?: string) => `${base}/clientes${qs({ q: busca })}`,
    ficha: (companyId: string, aba?: string) => `${base}/clientes/${encodeURIComponent(companyId)}${qs({ aba })}`,
    contratos: (companyId?: string) => `${base}/clientes/contratos${qs({ company: companyId })}`,
    propostas: `${base}/clientes/propostas`,
    financeiro: (aba?: string, busca?: string) => `${base}/financeiro${qs({ aba, q: busca })}`,
    suporte: (companyId?: string) => `${base}/suporte${qs({ companyId })}`,
    sistema: (aba?: string) => `${base}/sistema${qs({ aba })}`,
    contabilidade: (companyId?: string, name?: string) => `/${tenant}/dashboard/contabilidade${qs({ company: companyId, cn: name })}`,
    empresaFaturas: `/${tenant}/dashboard/faturas`,
  };
}
