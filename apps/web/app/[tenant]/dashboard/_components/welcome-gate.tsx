'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { request } from '@/app/lib/api';

/** Estilos escopados (prefixo iw-) do modal de boas-vindas. */
const CSS = `
.iw-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,20,38,.63);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.iw-modal{position:relative;width:min(100%,1050px);align-items:end;max-height:calc(100vh - 48px);overflow-y:auto;display:grid;grid-template-columns:53% 47%;border-radius:28px;background:linear-gradient(145deg,#fff 0%,#fefeff 60%,#f5efff 100%);box-shadow:0 40px 100px rgba(5,5,25,.42);animation:iw-enter .55s cubic-bezier(.16,1,.3,1)}
@keyframes iw-enter{from{opacity:0;transform:translateY(35px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.iw-content{position:relative;z-index:5;padding:44px 30px 36px 54px}
.iw-first{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;background:linear-gradient(90deg,#eee5ff,#e4d8ff);color:#6521ef;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
.iw-title{margin-top:22px;max-width:530px;color:#11172d;font-size:clamp(30px,3.5vw,44px);line-height:1.1;letter-spacing:-1.5px;font-weight:800}
.iw-title span{background:linear-gradient(90deg,#7838ff,#ad66ff);color:transparent;-webkit-background-clip:text;background-clip:text}
.iw-desc{max-width:520px;margin-top:17px;color:#646b86;font-size:15px;line-height:1.6}
.iw-features{display:flex;flex-direction:column;gap:10px;margin-top:28px}
.iw-feature{width:100%;max-width:490px;min-height:76px;display:flex;align-items:center;gap:16px;padding:12px 17px;border:1px solid #efeaf8;border-radius:17px;background:linear-gradient(135deg,#fbfaff,#f5f0ff);transition:.25s ease}
.iw-feature:hover{transform:translateX(4px);border-color:#d9c8fa;box-shadow:0 10px 30px rgba(87,40,180,.08)}
.iw-icon{flex:0 0 auto;width:50px;height:50px;display:grid;place-items:center;border-radius:14px;color:#6521ef;background:linear-gradient(145deg,#eee3ff,#e3d4ff)}
.iw-icon svg{width:25px;height:25px}
.iw-feature h3{margin:0 0 3px;color:#15182e;font-size:14px;font-weight:750}
.iw-feature p{margin:0;color:#747991;font-size:11px;line-height:1.35}
.iw-start{margin-top:27px;min-width:220px;height:55px;display:inline-flex;align-items:center;justify-content:center;gap:18px;border:none;border-radius:15px;color:#fff;cursor:pointer;font-size:14px;font-weight:750;background:linear-gradient(110deg,#843cff,#6720ef 50%,#5013cc);box-shadow:0 14px 30px rgba(103,32,239,.32);transition:transform .2s ease,box-shadow .2s ease}
.iw-start:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 18px 35px rgba(103,32,239,.42)}
.iw-start:disabled{opacity:.7;cursor:wait}
.iw-start .iw-arrow{font-size:22px;transition:transform .2s ease}
.iw-start:hover:not(:disabled) .iw-arrow{transform:translateX(5px)}
.iw-visual{align-self:end;line-height:0}
.iw-visual img{display:block;width:100%;height:auto;user-select:none;-webkit-user-drag:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 16%),linear-gradient(180deg,transparent 0,#000 8%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 16%),linear-gradient(180deg,transparent 0,#000 8%);mask-composite:intersect}
@media (max-width:900px){.iw-modal{grid-template-columns:1fr;max-height:calc(100vh - 30px);overflow-y:auto}.iw-content{padding:40px 35px}.iw-visual{width:min(100%,440px);margin:0 auto;align-self:center}}
@media (max-width:560px){.iw-overlay{padding:10px}.iw-modal{border-radius:20px}.iw-content{padding:28px 20px}.iw-title{font-size:34px}.iw-desc{font-size:14px}.iw-feature{min-height:70px}.iw-start{width:100%}}
@media (prefers-reduced-motion:reduce){.iw-modal{animation:none}}
`;

const FEATURES: Array<{ title: string; text: string; icon: ReactNode }> = [
  { title: 'Mais agilidade', text: 'Acesse informações e serviços de forma rápida e simples.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg> },
  { title: 'Tudo em um só lugar', text: 'Processos, comunicados, solicitações e muito mais para o seu dia a dia.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><path d="M14 13a6 6 0 0 1 7 5v2" /></svg> },
  { title: 'Seu desenvolvimento', text: 'Encontre oportunidades, treinamentos e ferramentas para continuar crescendo.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 6 7 .9-5 4.8 1.3 7-6.3-3.3-6.3 3.3 1.3-7-5-4.8L9 8z" /></svg> },
];

/** Boas-vindas do primeiro acesso: aparece uma única vez, depois do aceite do termo, e só some com "Começar agora". */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || token === 'innovation-rh-connect-local-session') return;
    let alive = true;
    request<{ show: boolean; name: string }>('/welcome/status', { silent: true, keepSessionOn401: true })
      .then((r) => { if (alive && r.show) setShow(true); })
      .catch(() => undefined); // sem resposta, a tela simplesmente não aparece
    return () => { alive = false; };
  }, [token]);

  async function start() {
    setSaving(true);
    try { await request('/welcome/seen', { method: 'POST', silent: true, keepSessionOn401: true }); } catch { /* tenta de novo no próximo login */ }
    setShow(false); setSaving(false);
  }

  return (
    <>
      {children}
      {show && (
        <div className="iw-overlay" role="dialog" aria-modal="true" aria-labelledby="iw-title">
          <style>{CSS}</style>
          <section className="iw-modal">
            <div className="iw-content">
              <div className="iw-first"><span aria-hidden="true">🎉</span> Primeiro acesso</div>
              <h1 id="iw-title" className="iw-title">Seja muito bem-vindo(a) à plataforma <span>Innovation!</span></h1>
              <p className="iw-desc">Estamos felizes em ter você aqui! 🎉<br />Agora você faz parte de um ambiente criado para conectar pessoas, processos e oportunidades.</p>
              <div className="iw-features">
                {FEATURES.map((f) => (
                  <div key={f.title} className="iw-feature"><div className="iw-icon">{f.icon}</div><div><h3>{f.title}</h3><p>{f.text}</p></div></div>
                ))}
              </div>
              <button type="button" className="iw-start" onClick={start} disabled={saving} autoFocus>Começar agora <span className="iw-arrow" aria-hidden="true">→</span></button>
            </div>

            <div className="iw-visual" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/welcome-art.png" alt="" draggable={false} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
