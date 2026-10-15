/**
 * RH - R&S alcanca: pagina inicial do dashboard (painel de recrutamento), Vagas, Configuracoes (perfil, senha e,
 * na conta autonoma, dados da empresa) e, dentro de Gestao, somente a Agenda (kanban de compromissos e entrevistas).
 * Rotas sem item de menu que casam por prefixo com "dashboard" (ex.: /dashboard/qualquer-coisa) continuam bloqueadas.
 */
export function isRouteAllowedForRecruiter(ownerId: string | undefined, pathname: string, dashboardRoute: string): boolean {
  if (ownerId === 'jobs' || ownerId === 'settings') return true;
  const normalize = (value: string) => value.replace(/\/+$/, '');
  if (ownerId === 'management') {
    const management = `${normalize(dashboardRoute)}/management`;
    // A raiz de Gestao so redireciona para a Agenda (feito no layout de Gestao).
    return normalize(pathname) === management || isAgendaPath(pathname, management);
  }
  return ownerId === 'dashboard' && normalize(pathname) === normalize(dashboardRoute);
}

/** Dentro de Gestao, so a Agenda (e suas subrotas). */
export function isAgendaPath(pathname: string, managementRoute: string): boolean {
  const path = pathname.replace(/\/+$/, '');
  const agenda = `${managementRoute.replace(/\/+$/, '')}/agenda`;
  return path === agenda || path.startsWith(`${agenda}/`);
}
