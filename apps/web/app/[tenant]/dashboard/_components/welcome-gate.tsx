'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { request } from '@/app/lib/api';

/** Estilos escopados (prefixo iw-) do modal de boas-vindas. */
const CSS = `
.iw-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,20,38,.63);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.iw-modal{position:relative;width:min(100%,1050px);min-height:610px;display:grid;grid-template-columns:53% 47%;overflow:hidden;border-radius:28px;background:linear-gradient(145deg,#fff 0%,#fefeff 60%,#f5efff 100%);box-shadow:0 40px 100px rgba(5,5,25,.42);animation:iw-enter .55s cubic-bezier(.16,1,.3,1)}
@keyframes iw-enter{from{opacity:0;transform:translateY(35px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.iw-content{position:relative;z-index:5;padding:52px 30px 42px 54px}
.iw-first{display:inline-flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;background:linear-gradient(90deg,#eee5ff,#e4d8ff);color:#6521ef;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
.iw-title{margin-top:22px;max-width:530px;color:#11172d;font-size:clamp(35px,4vw,49px);line-height:1.08;letter-spacing:-1.8px;font-weight:800}
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
.iw-visual{position:relative;overflow:hidden;min-height:610px;background:radial-gradient(circle at 55% 38%,rgba(255,255,255,.4),transparent 25%),linear-gradient(145deg,#b991ff 0%,#8e55ff 38%,#6d2bea 100%)}
.iw-circle{position:absolute;width:530px;height:530px;top:-250px;left:-110px;border-radius:50%;background:rgba(255,255,255,.14)}
.iw-bubble{position:absolute;top:68px;right:35px;min-width:230px;height:92px;display:flex;align-items:center;gap:16px;padding:0 24px;border-radius:24px 24px 24px 8px;background:rgba(255,255,255,.95);box-shadow:0 20px 40px rgba(55,20,132,.25);transform:rotate(5deg)}
.iw-logo{position:relative;width:50px;height:40px}
.iw-logo i{position:absolute;width:18px;height:42px;border-radius:9px;transform:skew(-25deg)}
.iw-logo i:nth-child(1){left:7px;background:linear-gradient(#843eff,#5620d5)}
.iw-logo i:nth-child(2){left:25px;background:linear-gradient(#c18cff,#7c36ef)}
.iw-name{color:#22233b;font-size:20px;font-weight:750}
.iw-heart{position:absolute;top:175px;right:42px;width:70px;height:70px;display:grid;place-items:center;border-radius:20px 20px 20px 7px;font-size:30px;color:#fff;background:linear-gradient(145deg,#8c46ff,#5520d6);box-shadow:0 15px 28px rgba(57,18,162,.25);animation:iw-float 3s ease-in-out infinite alternate}
@keyframes iw-float{from{transform:translateY(-5px)}to{transform:translateY(8px)}}
.iw-char{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100%;height:470px}
.iw-head{position:absolute;top:80px;left:50%;transform:translateX(-50%);width:135px;height:145px;border-radius:48% 48% 45% 45%;background:linear-gradient(145deg,#f8a577,#e87850);z-index:5}
.iw-hair{position:absolute;top:42px;left:50%;transform:translateX(-50%);width:200px;height:235px;border-radius:47% 47% 42% 42%;background:linear-gradient(145deg,#3b1b2e,#1c1020);z-index:3}
.iw-body{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);width:270px;height:240px;border-radius:50% 50% 10px 10px;background:linear-gradient(145deg,#8747ff,#5420d8);z-index:4}
.iw-eye{position:absolute;top:65px;width:14px;height:7px;border-bottom:3px solid #3b1d24;border-radius:50%}
.iw-eye.l{left:33px}.iw-eye.r{right:33px}
.iw-smile{position:absolute;left:50%;bottom:33px;width:45px;height:22px;transform:translateX(-50%);border-bottom:6px solid #fff;border-radius:0 0 40px 40px}
.iw-arm{position:absolute;left:32px;top:100px;width:48px;height:160px;border-radius:25px;background:linear-gradient(#8750ff,#6528e5);transform:rotate(-20deg);z-index:2}
.iw-hand{position:absolute;left:12px;top:-40px;width:45px;height:55px;border-radius:50%;background:#f39567}
.iw-laptop{position:absolute;left:50%;bottom:35px;transform:translateX(-50%);width:315px;height:175px;border-radius:15px 15px 8px 8px;background:linear-gradient(145deg,#282237,#15111f);box-shadow:0 22px 30px rgba(22,9,50,.3);z-index:10}
.iw-laptop-logo{position:absolute;top:70px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;color:#b380ff;font-size:14px;font-weight:750}
.iw-mini{position:relative;width:28px;height:20px}
.iw-mini i{position:absolute;width:10px;height:23px;border-radius:5px;transform:skew(-25deg);background:linear-gradient(#9050ff,#5d21d9)}
.iw-mini i:nth-child(1){left:3px}.iw-mini i:nth-child(2){left:14px}
.iw-desk{position:absolute;left:0;right:0;bottom:0;height:80px;background:linear-gradient(180deg,#faf9ff,#eae0f8);z-index:1}
.iw-plant{position:absolute;right:30px;bottom:69px;z-index:7}
.iw-pot{width:65px;height:60px;border-radius:10px 10px 25px 25px;background:#fff;box-shadow:0 10px 20px rgba(40,20,90,.15)}
.iw-leaf{position:absolute;width:32px;height:80px;bottom:48px;border-radius:100% 0 100% 0;background:linear-gradient(#61a74c,#2f7d43)}
.iw-leaf.a{left:5px;transform:rotate(-25deg)}.iw-leaf.b{left:30px;transform:rotate(15deg)}.iw-leaf.c{left:20px;bottom:53px}
.iw-spark{position:absolute;color:#fff;font-size:25px;animation:iw-spark 2.5s ease-in-out infinite alternate}
.iw-spark.a{top:70px;left:60px}.iw-spark.b{top:125px;left:30px;color:#6e28e9}.iw-spark.c{top:250px;right:40px;color:#ffc145}
@keyframes iw-spark{from{transform:translateY(-4px) rotate(0)}to{transform:translateY(7px) rotate(15deg)}}
@media (max-width:900px){.iw-modal{grid-template-columns:1fr;max-height:calc(100vh - 30px);overflow-y:auto}.iw-content{padding:40px 35px}.iw-visual{min-height:430px}.iw-char{transform:translateX(-50%) scale(.85);transform-origin:bottom center}.iw-bubble{top:30px}}
@media (max-width:560px){.iw-overlay{padding:10px}.iw-modal{border-radius:20px}.iw-content{padding:28px 20px}.iw-title{font-size:34px}.iw-desc{font-size:14px}.iw-feature{min-height:70px}.iw-start{width:100%}.iw-visual{min-height:350px}.iw-bubble{transform:scale(.8) rotate(5deg);right:-5px}.iw-char{transform:translateX(-50%) scale(.7)}}
@media (prefers-reduced-motion:reduce){.iw-modal,.iw-heart,.iw-spark{animation:none}}
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
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || token === 'innovation-rh-connect-local-session') return;
    let alive = true;
    request<{ show: boolean; name: string }>('/welcome/status', { silent: true, keepSessionOn401: true })
      .then((r) => { if (alive && r.show) { setName(r.name); setShow(true); } })
      .catch(() => undefined); // sem resposta, a tela simplesmente não aparece
    return () => { alive = false; };
  }, [token]);

  async function start() {
    setSaving(true);
    try { await request('/welcome/seen', { method: 'POST', silent: true, keepSessionOn401: true }); } catch { /* tenta de novo no próximo login */ }
    setShow(false); setSaving(false);
  }

  const first = name.trim().split(' ')[0];

  return (
    <>
      {children}
      {show && (
        <div className="iw-overlay" role="dialog" aria-modal="true" aria-labelledby="iw-title">
          <style>{CSS}</style>
          <section className="iw-modal">
            <div className="iw-content">
              <div className="iw-first"><span aria-hidden="true">🎉</span> Primeiro acesso</div>
              <h1 id="iw-title" className="iw-title">{first ? `${first}, seja` : 'Seja'} muito bem-vindo(a) à plataforma <span>Innovation!</span></h1>
              <p className="iw-desc">Estamos felizes em ter você aqui! 🎉<br />Agora você faz parte de um ambiente criado para conectar pessoas, processos e oportunidades.</p>
              <div className="iw-features">
                {FEATURES.map((f) => (
                  <div key={f.title} className="iw-feature"><div className="iw-icon">{f.icon}</div><div><h3>{f.title}</h3><p>{f.text}</p></div></div>
                ))}
              </div>
              <button type="button" className="iw-start" onClick={start} disabled={saving} autoFocus>Começar agora <span className="iw-arrow" aria-hidden="true">→</span></button>
            </div>

            <div className="iw-visual" aria-hidden="true">
              <div className="iw-circle" />
              <div className="iw-bubble"><div className="iw-logo"><i /><i /></div><span className="iw-name">Innovation</span></div>
              <div className="iw-heart">♥</div>
              <span className="iw-spark a">✦</span><span className="iw-spark b">✦</span><span className="iw-spark c">★</span>
              <div className="iw-char">
                <div className="iw-hair" />
                <div className="iw-arm"><div className="iw-hand" /></div>
                <div className="iw-body" />
                <div className="iw-head"><div className="iw-eye l" /><div className="iw-eye r" /><div className="iw-smile" /></div>
                <div className="iw-laptop"><div className="iw-laptop-logo"><div className="iw-mini"><i /><i /></div>Innovation</div></div>
              </div>
              <div className="iw-plant"><span className="iw-leaf a" /><span className="iw-leaf b" /><span className="iw-leaf c" /><div className="iw-pot" /></div>
              <div className="iw-desk" />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
