import { GRAVIDADE_ORDEM } from './explicacoes';
import { limpar } from './seguranca';
import type { Achado, Estado, Gravidade, PassoRegistro, ResumoAba } from './tipos';

const esc = (v: unknown) => String(limpar(v ?? '')).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const caminho = (url: string) => { try { return new URL(url, 'http://x').pathname; } catch { return url; } };
export const ROTULO_GRAV: Record<Gravidade, string> = { alta: 'GRAVE', media: 'MÉDIO', baixa: 'LEVE' };
const COR_GRAV: Record<Gravidade, string> = { alta: '#dc2626', media: '#d97706', baixa: '#6b7280' };

export type Resultado = 'falha' | 'inconclusivo' | 'nao-testado';
export const SECOES: Array<{ resultado: Resultado; icone: string; titulo: string; ajuda: string }> = [
  { resultado: 'falha', icone: '❌', titulo: 'Falhou', ajuda: 'Defeito com evidência: erro do servidor, erro de programação, vazamento de permissão ou algo que deveria aparecer e não apareceu.' },
  { resultado: 'inconclusivo', icone: '⚠️', titulo: 'Inconclusivo', ajuda: 'O robô não conseguiu concluir (botão não encontrado, tela lenta, permissão negada). Não é defeito confirmado: confira à mão.' },
  { resultado: 'nao-testado', icone: '⏭️', titulo: 'Não testado', ajuda: 'O robô não chegou a testar (e diz por quê).' },
];

export interface Grupo {
  resultado: Resultado; gravidade: Gravidade; titulo: string; explicacao: string;
  perfis: string[]; telas: string[]; acoes: string[]; esperado: string; obtido: string; evidencia: string; total: number;
}

export function agrupar(achados: Achado[], resultado?: Resultado): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const a of achados) {
    if (resultado && a.resultado !== resultado) continue;
    const tecnico = String(a.tecnico ?? '').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\d+/g, '#');
    const chave = [a.resultado, a.gravidade, a.titulo, tecnico || a.explicacao].join('|');
    let g = mapa.get(chave);
    if (!g) { g = { resultado: a.resultado, gravidade: a.gravidade, titulo: a.titulo, explicacao: a.explicacao, perfis: [], telas: [], acoes: [], esperado: a.esperado, obtido: a.obtido, evidencia: a.evidencia, total: 0 }; mapa.set(chave, g); }
    g.total++;
    if (!g.perfis.includes(a.perfil)) g.perfis.push(a.perfil);
    const tela = `${a.cenario} (${caminho(a.url)})`;
    if (!g.telas.includes(tela)) g.telas.push(tela);
    if (g.acoes.length < 3 && !g.acoes.includes(a.acao)) g.acoes.push(a.acao);
  }
  return [...mapa.values()].sort((x, y) => GRAVIDADE_ORDEM[x.gravidade] - GRAVIDADE_ORDEM[y.gravidade] || y.total - x.total);
}

export function resumoPorPerfil(e: Estado) {
  return ['DEV', ...e.usuarios.map((u) => u.perfil)].map((perfil) => {
    const passos = e.passos.filter((p) => p.perfil === perfil);
    const u = e.usuarios.find((x) => x.perfil === perfil);
    const conta = (s: string) => passos.filter((p) => p.status === s).length;
    return { perfil, situacao: u ? u.situacao : 'testado', motivo: u?.motivo, passou: conta('ok'), falhou: conta('falha'), inconclusivo: conta('inconclusivo'), naoTestado: conta('nao-testado') };
  });
}

export function contagem(e: Estado) {
  const conta = (s: string) => e.passos.filter((p) => p.status === s).length;
  return { passou: conta('ok'), falhou: conta('falha'), inconclusivo: conta('inconclusivo'), naoTestado: conta('nao-testado') };
}

export function veredito(e: Estado) {
  const c = contagem(e);
  const falhas = agrupar(e.achados, 'falha');
  if (!falhas.length) return { texto: `Nenhum defeito confirmado. ✅ ${c.passou} · ⚠️ ${c.inconclusivo} inconclusivo(s) · ⏭️ ${c.naoTestado} não testado(s).`, cor: c.inconclusivo ? '#d97706' : '#16a34a' };
  const graves = falhas.filter((g) => g.gravidade === 'alta').length;
  return { texto: `${falhas.length} defeito(s) confirmado(s), ${graves} grave(s). ✅ ${c.passou} · ⚠️ ${c.inconclusivo} · ⏭️ ${c.naoTestado}.`, cor: graves ? '#dc2626' : '#d97706' };
}

export function htmlRelatorio(e: Estado): string {
  const v = veredito(e);
  const duracao = Math.round(((e.fim ?? Date.now()) - e.inicio) / 1000);
  const linhas = (g: Grupo) => `<tr><td>${esc(g.perfis.join(', '))}</td><td>${esc(g.telas.slice(0, 3).join(' · '))}</td><td>${esc(g.acoes.join(' | '))}</td><td>${esc(g.esperado)}</td><td>${esc(g.obtido)}</td><td><small>${esc(g.evidencia)}</small></td></tr>`;
  const secoes = SECOES.map((s) => {
    const grupos = agrupar(e.achados, s.resultado);
    return `<h2>${s.icone} ${s.titulo} (${grupos.length})</h2><p class="m">${esc(s.ajuda)}</p>${grupos.length ? grupos.map((g, i) => `<div class="c"><span class="t" style="background:${COR_GRAV[g.gravidade]}">${ROTULO_GRAV[g.gravidade]}</span> <b>${i + 1}. ${esc(g.titulo)}</b>${g.total > 1 ? ` <span class="m">(${g.total}x)</span>` : ''}
<table><thead><tr><th>Perfil</th><th>Tela</th><th>Ação</th><th>Esperado</th><th>Obtido</th><th>Evidência</th></tr></thead><tbody>${linhas(g)}</tbody></table></div>`).join('') : '<p>Nada nesta categoria.</p>'}`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório · Robô QA</title>
<style>:root{color-scheme:light dark}body{margin:0;font:15px/1.5 system-ui,sans-serif;padding:16px;max-width:1100px;margin-inline:auto}h2{margin-top:1.6em;border-bottom:1px solid #8884;padding-bottom:.3em}
.c{border:1px solid #8884;border-radius:12px;padding:12px 14px;margin:10px 0;overflow-x:auto}.v{border-left:8px solid ${v.cor};font-size:1.1em;font-weight:700}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #8884;padding:6px 8px;text-align:left;font-size:13px;vertical-align:top}
.t{display:inline-block;color:#fff;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700}.m{opacity:.7}</style></head><body>
<h1>🤖 Robô QA — Relatório</h1><p class="m">Início ${esc(new Date(e.inicio).toLocaleString('pt-BR'))} · modo ${e.modo === 'rapido' ? 'rápido' : 'completo'} · duração ${duracao} s · ${e.passos.length} passos · sem senhas nem tokens</p>
<div class="c v">${esc(v.texto)}</div>
<h2>Resumo por perfil</h2><table><thead><tr><th>Perfil</th><th>Situação</th><th>✅ Passou</th><th>❌ Falhou</th><th>⚠️ Inconclusivo</th><th>⏭️ Não testado</th></tr></thead><tbody>
${resumoPorPerfil(e).map((l) => `<tr><td><b>${esc(l.perfil)}</b></td><td>${esc(l.situacao)}${l.motivo ? `<br><span class="m">${esc(l.motivo)}</span>` : ''}</td><td>${l.passou}</td><td>${l.falhou}</td><td>${l.inconclusivo}</td><td>${l.naoTestado}</td></tr>`).join('')}</tbody></table>
${secoes}
<h2>Usuários de teste (ficam salvos neste navegador para as próximas execuções)</h2><p class="m">Foram criados no sistema real. Cancele o acesso deles em Usuários quando não precisar mais.</p>
<table><thead><tr><th>Perfil</th><th>Nome</th><th>E-mail</th><th>Conta</th></tr></thead><tbody>${e.usuarios.filter((u) => u.criado).map((u) => `<tr><td>${esc(u.perfil)}</td><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${u.reutilizada ? 'reaproveitada' : 'criada agora'}</td></tr>`).join('') || '<tr><td colspan="4">nenhum</td></tr>'}</tbody></table>
</body></html>`;
}

const ICONE_RES: Record<string, string> = { falha: '❌', inconclusivo: '⚠️', 'nao-testado': '⏭️' };

/** Resumo curto de uma aba: contagem + o que nao passou (esperado x obtido), sem senhas/tokens. */
export function resumirAba(perfil: string, aba: string, passos: PassoRegistro[], achados: Achado[]): ResumoAba {
  const passou = passos.filter((p) => p.status === 'ok').length;
  const cont = (r: string) => achados.filter((a) => a.resultado === r).length;
  const falhou = cont('falha'); const inconclusivo = cont('inconclusivo'); const naoTestado = cont('nao-testado');
  const linhas = [`[${perfil}] ${aba}: ✅ ${passou} · ❌ ${falhou} · ⚠️ ${inconclusivo} · ⏭️ ${naoTestado}`];
  for (const a of achados.slice(0, 6)) linhas.push(`  ${ICONE_RES[a.resultado] ?? '•'} ${a.titulo} — tela: ${a.url}; esperado: ${a.esperado}; obtido: ${a.obtido}`);
  if (achados.length > 6) linhas.push(`  … e mais ${achados.length - 6}`);
  return { perfil, aba, passou, falhou, inconclusivo, naoTestado, texto: limpar(linhas.join('\n')) };
}

/** Texto unico para copiar e enviar: veredito + resumo de cada aba. */
export function textoParaCopiar(e: Estado): string {
  return [`Robô QA — ${veredito(e).texto}`, ...(e.abas ?? []).map((a) => a.texto)].join('\n');
}

export function markdownRelatorio(e: Estado): string {
  const v = veredito(e);
  const out = ['# Relatório do Robô QA', '', `- Início: ${new Date(e.inicio).toLocaleString('pt-BR')} · modo ${e.modo === 'rapido' ? 'rápido' : 'completo'} · ${e.passos.length} passos`, '- Sem senhas nem tokens', '', `**${v.texto}**`, '', '## Resumo por perfil', '', '| Perfil | Situação | ✅ Passou | ❌ Falhou | ⚠️ Inconclusivo | ⏭️ Não testado |', '|---|---|---|---|---|---|'];
  for (const l of resumoPorPerfil(e)) out.push(`| ${l.perfil} | ${l.situacao}${l.motivo ? ` (${l.motivo})` : ''} | ${l.passou} | ${l.falhou} | ${l.inconclusivo} | ${l.naoTestado} |`);
  out.push('', '## Resumo por aba', '', '```', ...(e.abas ?? []).map((a) => a.texto), '```');
  for (const s of SECOES) {
    const grupos = agrupar(e.achados, s.resultado);
    out.push('', `## ${s.icone} ${s.titulo} (${grupos.length})`, '', `_${s.ajuda}_`, '');
    if (!grupos.length) out.push('Nada nesta categoria.');
    grupos.forEach((g, i) => {
      out.push(`### ${i + 1}. [${ROTULO_GRAV[g.gravidade]}] ${g.titulo}${g.total > 1 ? ` (${g.total}x)` : ''}`, '', `- **Perfil:** ${g.perfis.join(', ')}`, `- **Tela:** ${g.telas.slice(0, 3).join(' · ')}`, `- **Ação:** ${g.acoes.join(' | ')}`, `- **Esperado:** ${limpar(g.esperado)}`, `- **Obtido:** ${limpar(g.obtido)}`, `- **Evidência:** ${limpar(g.evidencia)}`, '');
    });
  }
  out.push('', '## Usuários de teste', '', ...e.usuarios.filter((u) => u.criado).map((u) => `- ${u.perfil}: ${u.email} (${u.reutilizada ? 'reaproveitada' : 'criada agora'})`));
  return out.join('\n');
}