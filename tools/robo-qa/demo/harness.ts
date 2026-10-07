// Cola o motor no sistema de mentira (que faz o papel do "app hospedeiro").
import { criarMotor } from '../../../apps/web/app/_components/robo-qa/engine';

declare global { interface Window { __app: { navegar(c: string): void; sair(): void; usuario(): { nome: string; email: string; perfil: string } | null }; __motor: ReturnType<typeof criarMotor> } }

const motor = criarMotor({
  navegar: (c) => window.__app.navegar(c),
  sair: () => window.__app.sair(),
  caminhoAtual: () => window.location.pathname + window.location.search,
  usuario: () => window.__app.usuario(),
  tenant: () => window.location.pathname.match(/^\/([^/]+)\/(dashboard|portal)/)?.[1] ?? '',
});
window.__motor = motor;
setTimeout(() => { void motor.continuar(); }, 400);