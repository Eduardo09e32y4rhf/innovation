'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';
import { carregarContas, carregarRelatorio, contagem, criarMotor, limparContas, PERFIS_DE_TESTE, textoParaCopiar, type Modo, type Motor, type Ritmo } from './engine';

const ROTULO_PERFIL: Record<string, string> = { ADMIN: 'Administrador', RH: 'RH - Empresas', RH_RS: 'RH - R&S', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta', COMERCIAL: 'Comercial', CONTABIL: 'Contábil' };

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Robo de teste PROVISORIO. So existe quando NEXT_PUBLIC_ROBO_QA=on (ver docs/ROBO-QA.md) e so um DEV inicia.
 * Ele usa a tela como uma pessoa: nao tem acesso especial; todas as permissoes do servidor continuam valendo.
 */
export default function RoboQa() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [, forcar] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [verRelatorio, setVerRelatorio] = useState(false);
  const [perfis, setPerfis] = useState<string[]>([...PERFIS_DE_TESTE]);
  const [ritmo, setRitmo] = useState<Ritmo>('normal');
  const [copiado, setCopiado] = useState('');

  const usuarioRef = useRef(user); usuarioRef.current = user;
  const logoutRef = useRef(logout); logoutRef.current = logout;
  const routerRef = useRef(router); routerRef.current = router;

  const motor = useMemo<Motor>(() => criarMotor({
    navegar: (caminho) => routerRef.current.push(caminho),
    sair: () => { logoutRef.current(); routerRef.current.replace('/login'); },
    caminhoAtual: () => window.location.pathname + window.location.search,
    usuario: () => (usuarioRef.current ? { nome: usuarioRef.current.name ?? '', email: usuarioRef.current.email ?? '', perfil: resolveUserRole(usuarioRef.current) } : null),
    tenant: () => window.location.pathname.match(/^\/([^/]+)\/(dashboard|portal)/)?.[1] ?? '',
  }), []);

  useEffect(() => motor.aoMudar(() => forcar((n) => n + 1)), [motor]);
  // Depois de um recarregamento (login/logout), continua de onde parou, quando o login terminou de carregar.
  useEffect(() => { if (!loading) void motor.continuar(); }, [loading, motor]);
  // Erro da pagina NAO pausa mais o robo (era isso que o deixava parado numa tela quebrada): o coletor registra o erro
  // como defeito e o motor detecta a queda, volta ao painel e segue para a proxima etapa (engine/queda.ts, error.tsx, global-error.tsx).

  const estado = motor.estado();
  const relatorio = carregarRelatorio();
  const ativo = Boolean(estado?.ativo);
  const ehDev = resolveUserRole(user) === 'DEV';
  if (!ativo && !ehDev && !relatorio) return null;

  const c = estado ? contagem(estado) : null;
  const contasSalvas = Object.keys(carregarContas()).length;
  const icone = (s: string) => (s === 'ok' ? '✅' : s === 'falha' ? '❌' : s === 'inconclusivo' ? '⚠️' : '⏭️');
  const iniciar = (modo: Modo) => motor.iniciar(perfis, modo === 'rapido' ? 'rapido' : ritmo, modo);
  const ultimosPassos = estado ? estado.passos.slice(-6).reverse() : [];
  const abas = estado?.abas ?? [];
  const textoTudo = estado ? textoParaCopiar(estado) : '';
  const copiar = (chave: string, texto: string) => {
    const ok = () => { setCopiado(chave); setTimeout(() => setCopiado(''), 1800); };
    navigator.clipboard?.writeText(texto).then(ok, () => {
      const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } finally { ta.remove(); }
    });
  };
  const concluidos =estado ? estado.usuarios.filter((u) => u.situacao === 'testado' || u.situacao === 'erro').length : 0;

  return (
    <div id="robo-qa-raiz" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 2147483000, fontFamily: 'system-ui, sans-serif' }} data-pathname={pathname}>
      {aberto && (
        <section aria-label="Robô de teste" style={{ width: 'min(92vw, 380px)', maxHeight: '75vh', overflow: 'auto', background: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,.3)', padding: 14, marginBottom: 10 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>🤖 Robô de teste <span style={{ fontWeight: 400, color: '#6b7280' }}>(provisório)</span></strong>
            <button type="button" onClick={() => setAberto(false)} aria-label="Minimizar o robô" style={{ minHeight: 36, minWidth: 36, border: 0, background: 'transparent', fontSize: 18, cursor: 'pointer' }}>–</button>
          </header>

          {!ativo && (
            <>
              <p style={{ fontSize: 13, color: '#374151' }}>Abre cada página como uma pessoa usaria, <b>cria usuários de teste</b> (nome “ROBO-QA …”), sai e entra como cada um, e no final mostra um relatório do que não funcionou.</p>
              <button type="button" disabled={perfis.length === 0 || !ehDev} onClick={() => iniciar('completo')} style={{ width: '100%', minHeight: 56, borderRadius: 12, border: 0, background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', margin: '6px 0', opacity: perfis.length === 0 || !ehDev ? 0.5 : 1 }}>▶ LIGAR O TESTE</button>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Testa como um analista de qualidade / cliente: todos os perfis, aba por aba. No fim de cada aba aparece um resumo que dá para copiar.</p>
              <details>
              <summary style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>Opções (perfis, velocidade, teste rápido)</summary>
              <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, margin: '8px 0' }}>
                <legend style={{ fontSize: 12, color: '#6b7280' }}>Perfis a testar (além do DEV)</legend>
                {PERFIS_DE_TESTE.map((p) => (
                  <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '3px 10px 3px 0', fontSize: 13, minHeight: 28 }}>
                    <input type="checkbox" checked={perfis.includes(p)} onChange={(ev) => setPerfis((atual) => (ev.target.checked ? [...atual, p] : atual.filter((x) => x !== p)))} />{ROTULO_PERFIL[p] ?? p}
                  </label>
                ))}
              </fieldset>
              <label style={{ fontSize: 13 }}>Velocidade{' '}
                <select value={ritmo} onChange={(ev) => setRitmo(ev.target.value as Ritmo)} style={{ minHeight: 32 }}>
                  <option value="devagar">Devagar (dá para acompanhar tudo)</option><option value="normal">Normal</option><option value="rapido">Rápido</option>
                </select>
              </label>
              <p style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 8 }}>⚠️ Usuários de teste reais serão criados nesta empresa e a sua sessão será encerrada ao final. Não mexe em dados existentes.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={perfis.length === 0 || !ehDev} onClick={() => iniciar('rapido')} title="Login, menus e telas principais de cada perfil" style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '2px solid #7c3aed', background: '#f5f3ff', color: '#5b21b6', fontWeight: 700, cursor: 'pointer', opacity: perfis.length === 0 || !ehDev ? 0.5 : 1 }}>⚡ Teste rápido</button>
                <button type="button" disabled={perfis.length === 0 || !ehDev} onClick={() => iniciar('completo')} title="Todos os perfis e as funcionalidades previstas" style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 0, background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: perfis.length === 0 || !ehDev ? 0.5 : 1 }}>🔎 Teste completo</button>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>Rápido: login, menus e telas principais. Completo: todas as funcionalidades previstas.</p>
              </details>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Contas de teste salvas: {contasSalvas}. Elas são reaproveitadas (só criadas na primeira vez).{contasSalvas > 0 && <> <button type="button" onClick={() => { if (window.confirm('Esquecer as contas de teste salvas? Na próxima execução o robô cria contas novas.')) { limparContas(); forcar((n) => n + 1); } }} style={{ border: 0, background: 'transparent', color: '#7c3aed', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>Recriar contas de teste</button></>}</p>
              {!ehDev && <p style={{ fontSize: 12, color: '#b91c1c' }}>Só um usuário DEV pode iniciar.</p>}
            </>
          )}

          {ativo && estado && (
            <>
              <p style={{ margin: '10px 0 4px', fontSize: 13 }}><b>Agora:</b> {estado.perfilAtual} — {estado.agora}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Fase: {estado.fase === 'dev' ? 'testando como DEV' : estado.fase === 'criando' ? 'criando usuários de teste' : 'testando cada usuário'} · usuários {concluidos}/{estado.usuarios.length} · modo {estado.modo === 'rapido' ? 'rápido' : 'completo'}</p>
              {c && <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600 }}>✅ {c.passou} · ❌ {c.falhou} · ⚠️ {c.inconclusivo} · ⏭️ {c.naoTestado}</p>}
              <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
                {estado.pausado
                  ? <button type="button" onClick={() => motor.retomar()} style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>▶ Continuar</button>
                  : <button type="button" onClick={() => motor.pausar()} style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>⏸ Pausar</button>}
                <button type="button" onClick={() => { if (window.confirm('Parar o teste agora? O relatório mostrará só o que já foi testado.')) motor.cancelar(); }} style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer' }}>■ Parar</button>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                {ultimosPassos.map((p, i) => <div key={`${p.quando}-${i}`}>{icone(p.status)} {p.nome.slice(0, 70)}</div>)}
              </div>
            </>
          )}

          {abas.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13 }}>Resumo por aba ({abas.length})</b>
                <button type="button" onClick={() => copiar('tudo', textoTudo)} style={{ minHeight: 32, borderRadius: 8, border: '1px solid #7c3aed', background: '#f5f3ff', padding: '0 10px', cursor: 'pointer', fontSize: 12 }}>{copiado === 'tudo' ? '✔ Copiado' : '📋 Copiar tudo'}</button>
              </div>
              {abas.slice().reverse().map((a, i) => (
                <details key={`${a.perfil}-${a.aba}-${i}`} open={a.falhou > 0 || a.inconclusivo > 0} style={{ padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                  <summary style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
                    <span style={{ flex: 1 }}>{a.falhou ? '❌' : a.inconclusivo ? '⚠️' : '✅'} <b>{a.perfil}</b> · {a.aba} <span style={{ color: '#6b7280' }}>({a.passou}✅ {a.falhou}❌ {a.inconclusivo}⚠️ {a.naoTestado}⏭️)</span></span>
                    <button type="button" onClick={(ev) => { ev.preventDefault(); copiar(`${a.perfil}-${a.aba}-${i}`, a.texto); }} aria-label={`Copiar resumo de ${a.aba}`} style={{ minHeight: 28, minWidth: 28, borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>{copiado === `${a.perfil}-${a.aba}-${i}` ? '✔' : '📋'}</button>
                  </summary>
                  <pre style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, fontFamily: 'ui-monospace, monospace' }}>{a.texto}</pre>
                </details>
              ))}
            </div>
          )}

          {!ativo && (estado?.fase === 'fim' || relatorio) && (
            <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13 }}><b>Último relatório</b>{relatorio ? ` — ${new Date(relatorio.quando).toLocaleString('pt-BR')}` : ''}</p>
              <p style={{ margin: '0 0 8px', fontSize: 13 }}>{relatorio?.resumo}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button type="button" onClick={() => setVerRelatorio(true)} style={{ minHeight: 40, borderRadius: 8, border: '1px solid #7c3aed', background: '#f5f3ff', padding: '0 12px', cursor: 'pointer' }}>Ver relatório</button>
                {relatorio && <button type="button" onClick={() => baixar('relatorio-robo-qa.html', relatorio.html, 'text/html')} style={{ minHeight: 40, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', padding: '0 12px', cursor: 'pointer' }}>Baixar .html</button>}
                {relatorio && <button type="button" onClick={() => baixar('relatorio-robo-qa.md', relatorio.markdown, 'text/markdown')} style={{ minHeight: 40, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', padding: '0 12px', cursor: 'pointer' }}>Baixar .md</button>}
              </div>
              {relatorio && relatorio.usuarios.length > 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>Usuários de teste criados: {relatorio.usuarios.length}. Cancele o acesso deles em Usuários.</p>}
            </div>
          )}
        </section>
      )}

      <button type="button" onClick={() => setAberto((v) => !v)} aria-label={ativo ? 'Robô de teste em execução' : 'Abrir o robô de teste'} aria-expanded={aberto}
        style={{ display: 'block', marginLeft: 'auto', width: 56, height: 56, borderRadius: '50%', border: '3px solid #fff', background: ativo ? '#16a34a' : '#7c3aed', color: '#fff', fontSize: 26, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,.35)' }}>🤖</button>

      {verRelatorio && relatorio && (
        <div role="dialog" aria-modal="true" aria-label="Relatório do robô" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div style={{ background: '#fff', width: 'min(96vw, 1000px)', height: '90vh', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #e5e7eb' }}>
              <strong style={{ padding: '6px 8px' }}>Relatório do robô</strong>
              <button type="button" onClick={() => setVerRelatorio(false)} style={{ minHeight: 40, padding: '0 14px', cursor: 'pointer' }}>Fechar</button>
            </div>
            <iframe title="Relatório" srcDoc={relatorio.html} sandbox="" style={{ flex: 1, border: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}