import fs from 'node:fs';
import path from 'node:path';
import { GRAVIDADE_ORDEM } from './explicacoes.mjs';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const caminho = (url) => { try { return new URL(url).pathname; } catch { return String(url ?? ''); } };
const ROTULO_GRAV = { alta: 'GRAVE', media: 'MÉDIO', baixa: 'LEVE' };
const COR_GRAV = { alta: '#dc2626', media: '#d97706', baixa: '#6b7280' };

export function agrupar(achados) {
  const mapa = new Map();
  for (const a of achados) {
    const tecnico = String(a.tecnico ?? '').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\d+/g, '#');
    const chave = [a.gravidade, a.titulo, tecnico || a.explicacao].join('|');
    if (!mapa.has(chave)) mapa.set(chave, { gravidade: a.gravidade, titulo: a.titulo, explicacao: a.explicacao, tecnico: a.tecnico, perfis: new Set(), locais: new Set(), passos: [], foto: a.foto, total: 0 });
    const g = mapa.get(chave);
    g.total++;
    g.perfis.add(a.perfil);
    g.locais.add(caminho(a.url));
    if (g.passos.length < 3 && !g.passos.includes(a.passo)) g.passos.push(a.passo);
    g.foto ??= a.foto;
  }
  return [...mapa.values()].sort((x, y) => GRAVIDADE_ORDEM[x.gravidade] - GRAVIDADE_ORDEM[y.gravidade] || y.total - x.total);
}

export class Relatorio {
  constructor({ pasta, estado, meta }) {
    this.pasta = pasta;
    this.estado = estado;
    this.meta = meta;
    this.ultimaGravacao = 0;
    fs.mkdirSync(path.join(pasta, 'fotos'), { recursive: true });
  }

  /** Atualiza o arquivo "ao-vivo.html" (abra em outra janela: ele se atualiza sozinho). */
  aoVivo() {
    if (Date.now() - this.ultimaGravacao < 1500) return;
    this.ultimaGravacao = Date.now();
    fs.writeFileSync(path.join(this.pasta, 'ao-vivo.html'), this.html({ final: false }));
  }

  finalizar() {
    fs.writeFileSync(path.join(this.pasta, 'relatorio.html'), this.html({ final: true }));
    fs.writeFileSync(path.join(this.pasta, 'relatorio.md'), this.markdown());
    fs.writeFileSync(path.join(this.pasta, 'ao-vivo.html'), this.html({ final: true }));
    return path.join(this.pasta, 'relatorio.html');
  }

  resumoPorPerfil() {
    const linhas = [];
    for (const [perfil, info] of Object.entries(this.estado.perfis)) {
      const passos = this.estado.passos.filter((p) => p.perfil === perfil);
      linhas.push({ perfil, situacao: info.situacao, motivo: info.motivo, total: passos.length, ok: passos.filter((p) => p.status === 'ok').length, avisos: passos.filter((p) => p.status === 'aviso').length, falhas: passos.filter((p) => p.status === 'falha').length });
    }
    return linhas;
  }

  veredito(grupos) {
    const graves = grupos.filter((g) => g.gravidade === 'alta').length;
    if (!grupos.length) return { texto: 'Nenhum problema encontrado nos testes feitos.', cor: '#16a34a' };
    return { texto: `${grupos.length} problema(s) diferente(s) encontrado(s), ${graves} grave(s).`, cor: graves ? '#dc2626' : '#d97706' };
  }

  html({ final }) {
    const grupos = agrupar(this.estado.achados);
    const v = this.veredito(grupos);
    const resumo = this.resumoPorPerfil();
    const ultimos = this.estado.passos.slice(-14).reverse();
    const iconePasso = (s) => ({ ok: '✅', aviso: '⚠️', falha: '❌' }[s] ?? '•');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${final ? '' : '<meta http-equiv="refresh" content="3">'}
<title>${final ? 'Relatório' : 'Ao vivo'} · Robô QA</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#111827;--mut:#6b7280;--card:#f3f4f6;--bd:#e5e7eb}
@media(prefers-color-scheme:dark){:root{--bg:#0b0f19;--fg:#f3f4f6;--mut:#9ca3af;--card:#151b2b;--bd:#2a3350}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:16px;max-width:1100px;margin-inline:auto}
h1{margin:.2em 0}h2{margin-top:1.6em;border-bottom:1px solid var(--bd);padding-bottom:.3em}
.cartao{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin:10px 0}
.veredito{border-left:8px solid ${v.cor};font-size:1.15em;font-weight:700}
.agora{border-left:8px solid #a855f7}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid var(--bd);padding:6px 8px;text-align:left;font-size:14px}
.tag{display:inline-block;color:#fff;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700}
.mut{color:var(--mut)}img{max-width:100%;border:1px solid var(--bd);border-radius:8px;margin-top:6px}
details summary{cursor:pointer}code,pre{font-size:12px;white-space:pre-wrap;word-break:break-word}
</style></head><body>
<h1>🤖 Robô QA — ${final ? 'Relatório final' : 'Teste em andamento'}</h1>
<p class="mut">${esc(this.meta.urlBase)} · modo ${esc(this.meta.modo)} · iniciado em ${esc(this.meta.inicio)}${final ? ` · duração ${esc(this.meta.duracao ?? '')}` : ''}</p>
${final ? `<div class="cartao veredito">${esc(v.texto)}</div>` : `<div class="cartao agora"><b>Agora:</b> ${esc(this.estado.perfilAtual ?? '…')} — ${esc(this.estado.agora ?? 'iniciando')}<br><span class="mut">Esta página se atualiza sozinha a cada 3 segundos.</span></div>`}

<h2>Resumo por perfil</h2>
<table><thead><tr><th>Perfil</th><th>Situação</th><th>Passos</th><th>✅ Certos</th><th>⚠️ Avisos</th><th>❌ Falhas</th></tr></thead><tbody>
${resumo.map((l) => `<tr><td><b>${esc(l.perfil)}</b></td><td>${esc(l.situacao)}${l.motivo ? `<br><span class="mut">${esc(l.motivo)}</span>` : ''}</td><td>${l.total}</td><td>${l.ok}</td><td>${l.avisos}</td><td>${l.falhas}</td></tr>`).join('')}
</tbody></table>

<h2>Saúde das APIs</h2>
<div class="cartao"><b>${this.estado.api?.total ?? 0}</b> respostas de API observadas · <b>${Object.entries(this.estado.api?.porStatus ?? {}).map(([s, n]) => `${s}: ${n}`).join(' · ') || 'sem respostas'}</b>${(this.estado.api?.lentas?.length ?? 0) ? `<br><span class="mut">Rotas lentas (&gt;1,5 s): ${esc(this.estado.api.lentas.slice(0, 8).map((x) => `${x.metodo} ${x.rota} (${x.duracaoMs} ms)`).join(' · '))}</span>` : ''}</div>

<h2>O que não funcionou (em português simples)</h2>
${grupos.length ? grupos.map((g, i) => `<div class="cartao">
<span class="tag" style="background:${COR_GRAV[g.gravidade]}">${ROTULO_GRAV[g.gravidade]}</span> <b>${i + 1}. ${esc(g.titulo)}</b>${g.total > 1 ? ` <span class="mut">(aconteceu ${g.total}x)</span>` : ''}
<p>${esc(g.explicacao)}</p>
<p class="mut"><b>Quem foi afetado:</b> ${esc([...g.perfis].join(', '))}<br><b>Onde:</b> ${esc([...g.locais].slice(0, 6).join(' · '))}<br><b>Passo do robô:</b> ${esc(g.passos.join(' | '))}</p>
${g.foto ? `<a href="${esc(g.foto)}" target="_blank"><img loading="lazy" src="${esc(g.foto)}" alt="Foto da tela no momento do problema" width="420"></a>` : ''}
${g.tecnico ? `<details><summary class="mut">Detalhe técnico (para o programador)</summary><pre>${esc(g.tecnico)}</pre></details>` : ''}
</div>`).join('') : '<p>Nada de errado foi encontrado até agora.</p>'}

${final ? '' : `<h2>Últimos passos do robô</h2><div class="cartao">${ultimos.map((p) => `${iconePasso(p.status)} <b>${esc(p.perfil)}</b> · ${esc(p.nome)}`).join('<br>') || '…'}</div>`}

<h2>Registro de tudo que o robô fez</h2>
${Object.keys(this.estado.perfis).map((perfil) => {
    const passos = this.estado.passos.filter((p) => p.perfil === perfil);
    return `<details><summary><b>${esc(perfil)}</b> — ${passos.length} passos</summary><div class="cartao">${passos.map((p) => `${iconePasso(p.status)} <span class="mut">${esc(p.cenario)} ›</span> ${esc(p.nome)}`).join('<br>') || 'sem passos'}</div></details>`;
  }).join('')}
</body></html>`;
  }

  markdown() {
    const grupos = agrupar(this.estado.achados);
    const v = this.veredito(grupos);
    const out = [`# Relatório do Robô QA`, '', `- Endereço testado: ${this.meta.urlBase}`, `- Modo: ${this.meta.modo}`, `- Início: ${this.meta.inicio} · Duração: ${this.meta.duracao ?? ''}`, '', `**${v.texto}**`, '', '## Resumo por perfil', '', '| Perfil | Situação | Passos | Certos | Avisos | Falhas |', '|---|---|---|---|---|---|'];
    for (const l of this.resumoPorPerfil()) out.push(`| ${l.perfil} | ${l.situacao}${l.motivo ? ` (${l.motivo})` : ''} | ${l.total} | ${l.ok} | ${l.avisos} | ${l.falhas} |`);
    out.push('', '## O que não funcionou', '');
    out.splice(6, 0, '', '## Saúde das APIs', '', `- Respostas observadas: ${this.estado.api?.total ?? 0}`, `- Status: ${Object.entries(this.estado.api?.porStatus ?? {}).map(([s, n]) => `${s}: ${n}`).join(' · ') || 'sem respostas'}`, `- Rotas lentas (>1,5 s): ${(this.estado.api?.lentas ?? []).slice(0, 8).map((x) => `${x.metodo} ${x.rota} (${x.duracaoMs} ms)`).join(' · ') || 'nenhuma'}`);
    if (!grupos.length) out.push('Nada de errado foi encontrado.');
    grupos.forEach((g, i) => {
      out.push(`### ${i + 1}. [${ROTULO_GRAV[g.gravidade]}] ${g.titulo}${g.total > 1 ? ` (${g.total}x)` : ''}`, '', g.explicacao, '', `- Quem: ${[...g.perfis].join(', ')}`, `- Onde: ${[...g.locais].slice(0, 6).join(' · ')}`, `- Passo do robô: ${g.passos.join(' | ')}`);
      if (g.foto) out.push(`- Foto: ${g.foto}`);
      if (g.tecnico) out.push(`- Detalhe técnico: \`${g.tecnico}\``);
      out.push('');
    });
    return out.join('\n');
  }
}

