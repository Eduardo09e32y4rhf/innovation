/** Manifesto: somente IDs devolvidos por criações autorizadas nesta execução. Não varre dados por prefixo. */
export interface RecursoQa { id: string; nome: string; rota: string; status: 'pendente' | 'removido'; }
interface Manifesto { nomes: string[]; recursos: RecursoQa[]; }
const CHAVE = 'roboQa.recursos.v1';
export function manifesto(): Manifesto {
  return JSON.parse(localStorage.getItem(CHAVE) ?? '{"nomes":[],"recursos":[]}');
}
function guardar(m: Manifesto) { localStorage.setItem(CHAVE, JSON.stringify(m)); }
export function autorizarNome(nome: string) {
  if (!nome.startsWith('ROBO-QA ')) throw new Error('Nome fora do escopo de teste');
  const m = manifesto(); if (!m.nomes.includes(nome)) { m.nomes.push(nome); guardar(m); }
}
export function recursoDaResposta(rota: string, corpo: Record<string, unknown>, resposta: Record<string, unknown>, nomes: string[]): RecursoQa | null {
  if (!['/users', '/employees', '/jobs', '/platform/companies', '/platform/plans'].includes(rota)) return null;
  const nome = String(corpo.name ?? corpo.title ?? '');
  if (!nomes.some((n) => n.trim().toLowerCase() === nome.trim().toLowerCase())) return null;
  const registro = (rota === '/users' ? resposta.user ?? resposta : rota === '/employees' ? resposta.employee ?? resposta : resposta) as Record<string, unknown>;
  const id = registro.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return { id, nome, rota, status: 'pendente' };
}
export function registrarCriacao(rota: string, corpo: Record<string, unknown>, resposta: Record<string, unknown>) {
  const m = manifesto(); const r = recursoDaResposta(rota, corpo, resposta, m.nomes);
  if (r && !m.recursos.some((x) => x.id === r.id && x.rota === r.rota)) { m.recursos.push(r); guardar(m); }
}
export async function limparRecursos(excluir: (caminho: string) => Promise<void>): Promise<string[]> {
  const erros: string[] = [];
  for (const r of manifesto().recursos.slice().reverse()) {
    if (r.status === 'removido') continue;
    try {
      // Empresas: exclusão lógica oficial, sem purge/cascata irreversível.
      const sufixo = ['/users', '/employees'].includes(r.rota) ? '/permanent' : '';
      if (r.rota === '/users') await excluir(`${r.rota}/${r.id}`);
      await excluir(`${r.rota}/${r.id}${sufixo}`);
      if (r.rota === '/platform/plans') await excluir(`${r.rota}/${r.id}/permanent`);
      const m = manifesto(); const salvo = m.recursos.find((x) => x.id === r.id && x.rota === r.rota);
      if (salvo) salvo.status = 'removido'; guardar(m);
    } catch { erros.push(`${r.rota}/${r.id} (${r.nome})`); }
  }
  return erros;
}
