/**
 * RH - R&S alcanca somente Vagas e a pagina inicial do dashboard (painel exclusivo de recrutamento).
 * Rotas sem item de menu que casam por prefixo com "dashboard" (ex.: /dashboard/qualquer-coisa) continuam bloqueadas.
 */
export function isRouteAllowedForRecruiter(ownerId: string | undefined, pathname: string, dashboardRoute: string): boolean {
  if (ownerId === 'jobs') return true;
  const normalize = (value: string) => value.replace(/\/+$/, '');
  return ownerId === 'dashboard' && normalize(pathname) === normalize(dashboardRoute);
}