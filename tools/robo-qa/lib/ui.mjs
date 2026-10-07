// Tudo o que o usuario VE: faixa com o que o robo esta fazendo, cursor falso, clique em onda e destaque do botao.

export const SCRIPT_OVERLAY = `
(() => {
  if (window.__roboInstalado) return;
  window.__roboInstalado = true;
  const montar = () => {
    if (document.getElementById('robo-banner')) return;
    const estilo = document.createElement('style');
    estilo.textContent = \`
      #robo-banner{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:92vw;background:#111827;color:#fff;
        font:600 14px/1.35 system-ui,sans-serif;padding:8px 14px;border-radius:10px;border-left:6px solid #a855f7;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none}
      #robo-cursor{position:fixed;left:0;top:0;z-index:2147483647;width:22px;height:22px;pointer-events:none;transition:transform .35s ease;
        transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
      #robo-cursor svg{width:22px;height:22px}
      .robo-onda{position:fixed;z-index:2147483646;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #a855f7;pointer-events:none;animation:robo-onda .6s ease-out forwards}
      @keyframes robo-onda{to{transform:scale(4);opacity:0}}
      .robo-destaque{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid #a855f7;border-radius:8px;background:rgba(168,85,247,.12);animation:robo-sumir 1.2s ease forwards}
      @keyframes robo-sumir{0%{opacity:1}80%{opacity:1}100%{opacity:0}}\`;
    document.documentElement.appendChild(estilo);
    const faixa = document.createElement('div'); faixa.id = 'robo-banner'; faixa.textContent = '🤖 Robô QA iniciando…';
    const cursor = document.createElement('div'); cursor.id = 'robo-cursor';
    cursor.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l7 18 2.5-7.5L20 10z" fill="#a855f7" stroke="#fff" stroke-width="1.5"/></svg>';
    document.documentElement.appendChild(faixa); document.documentElement.appendChild(cursor);
  };
  window.__robo = {
    faixa(texto){ montar(); document.getElementById('robo-banner').textContent = texto; },
    mover(x, y){ montar(); document.getElementById('robo-cursor').style.transform = 'translate(' + x + 'px,' + y + 'px)'; },
    clique(x, y){ montar(); const o = document.createElement('div'); o.className = 'robo-onda'; o.style.left = x + 'px'; o.style.top = y + 'px'; document.documentElement.appendChild(o); setTimeout(() => o.remove(), 700); },
    destacar(r){ montar(); const d = document.createElement('div'); d.className = 'robo-destaque'; d.style.left = r.x + 'px'; d.style.top = r.y + 'px'; d.style.width = r.w + 'px'; d.style.height = r.h + 'px'; document.documentElement.appendChild(d); setTimeout(() => d.remove(), 1300); },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
`;

export async function instalarOverlay(context) {
  await context.addInitScript(SCRIPT_OVERLAY);
}

/** Texto da faixa no topo da tela (o que o robo esta fazendo agora). */
export async function falar(ctx, texto) {
  ctx.agora = texto;
  ctx.relatorio?.aoVivo();
  try { await ctx.page.evaluate((t) => window.__robo?.faixa(t), `🤖 ${ctx.perfil} · ${texto}`); } catch { /* pagina navegando */ }
  if (ctx.log) console.log(`  ${ctx.perfil.padEnd(11)} ${texto}`);
}