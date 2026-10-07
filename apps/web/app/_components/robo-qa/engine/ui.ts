// Tudo o que o usuario VE: faixa com o que o robo esta fazendo, cursor falso, clique em onda e destaque do botao.

const CSS = `
#robo-faixa{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483600;max-width:92vw;background:#111827;color:#fff;font:600 14px/1.35 system-ui,sans-serif;padding:8px 14px;border-radius:10px;border-left:6px solid #a855f7;box-shadow:0 6px 24px rgba(0,0,0,.35);pointer-events:none}
#robo-cursor{position:fixed;left:0;top:0;z-index:2147483600;width:22px;height:22px;pointer-events:none;transition:transform .35s ease;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.robo-onda{position:fixed;z-index:2147483599;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #a855f7;pointer-events:none;animation:robo-onda .6s ease-out forwards}
@keyframes robo-onda{to{transform:scale(4);opacity:0}}
.robo-destaque{position:fixed;z-index:2147483598;pointer-events:none;border:3px solid #a855f7;border-radius:8px;background:rgba(168,85,247,.12);animation:robo-sumir 1.2s ease forwards}
@keyframes robo-sumir{0%{opacity:1}80%{opacity:1}100%{opacity:0}}`;

function garantir() {
  if (document.getElementById('robo-faixa')) return;
  const estilo = document.createElement('style'); estilo.id = 'robo-estilo'; estilo.textContent = CSS; document.head.appendChild(estilo);
  const faixa = document.createElement('div'); faixa.id = 'robo-faixa'; faixa.setAttribute('role', 'status'); faixa.style.display = 'none'; document.body.appendChild(faixa);
  const cursor = document.createElement('div'); cursor.id = 'robo-cursor'; cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7 18 2.5-7.5L20 10z" fill="#a855f7" stroke="#fff" stroke-width="1.5"/></svg>';
  cursor.style.display = 'none'; document.body.appendChild(cursor);
}

export function mostrarOverlay(ligado: boolean) {
  garantir();
  const faixa = document.getElementById('robo-faixa'); const cursor = document.getElementById('robo-cursor');
  if (faixa) faixa.style.display = ligado ? 'block' : 'none';
  if (cursor) cursor.style.display = ligado ? 'block' : 'none';
}
export function faixa(texto: string) { garantir(); const el = document.getElementById('robo-faixa'); if (el) { el.style.display = 'block'; el.textContent = texto; } }
export function moverCursor(x: number, y: number) { garantir(); const el = document.getElementById('robo-cursor'); if (el) { el.style.display = 'block'; el.style.transform = `translate(${x}px,${y}px)`; } }
export function onda(x: number, y: number) { garantir(); const el = document.createElement('div'); el.className = 'robo-onda'; el.style.left = `${x}px`; el.style.top = `${y}px`; document.body.appendChild(el); setTimeout(() => el.remove(), 700); }
export function destacar(caixa: DOMRect) { garantir(); const el = document.createElement('div'); el.className = 'robo-destaque'; Object.assign(el.style, { left: `${caixa.left}px`, top: `${caixa.top}px`, width: `${caixa.width}px`, height: `${caixa.height}px` }); document.body.appendChild(el); setTimeout(() => el.remove(), 1300); }