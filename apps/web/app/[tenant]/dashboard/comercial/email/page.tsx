'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Mail, Megaphone, Send, Upload } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { request } from '@/app/lib/api';
import { useRouter } from 'next/navigation';

type Recipient = { email: string; name?: string };
type Preview = { totalValid: number; readyToSend: number; skipped: number };
type Tab = 'campaign' | 'notice' | 'history';
function parseRecipients(text: string): Recipient[] {
  const result = new Map<string, Recipient>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/[;,\t]/).map(value => value.trim().replace(/^['"]|['"]$/g, ''));
    const email = (parts.find(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) || '').toLowerCase();
    if (email && email !== 'email' && !result.has(email)) result.set(email, { email, name: parts.find(value => value && value !== email && !value.includes('@')) });
  }
  return [...result.values()];
}

export default function CommercialEmailPage() {
  const { user } = useAuth(); const router = useRouter(); const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('campaign'); const [raw, setRaw] = useState('');
  const [campaignType, setCampaignType] = useState<'TRIAL_INVITE' | 'INFO'>('TRIAL_INVITE');
  const recipients = useMemo(() => parseRecipients(raw), [raw]);
  const [preview, setPreview] = useState<Preview | null>(null); const [subject, setSubject] = useState('Você foi convidado para testar a Innovation por 30 dias');
  const [body, setBody] = useState('{Nome}, boa tarde!\n\nVocê foi convidado para conhecer a Innovation. Acesse seu link pessoal para ativar 30 dias grátis:\n{LinkTeste}\n\nEsperamos você!');
  const [notice, setNotice] = useState({ title: '', body: '', type: 'FEATURE' });
  const [history, setHistory] = useState<Array<{ id: string; subject: string; createdAt: string; recipientCount: number }>>([]);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (user && String(user.profile ?? user.role).toUpperCase() !== 'COMERCIAL') router.replace('/dashboard'); }, [user, router]);
  useEffect(() => {
    let canceled = false;
    if (!recipients.length) { setPreview(null); return; }
    const timer = setTimeout(() => request<Preview>('/commercial/email/preview', { method: 'POST', body: { recipients, type: campaignType }, silent: true }).then(value => { if (!canceled) setPreview(value); }).catch(() => { if (!canceled) setPreview(null); }), 300);
    return () => { canceled = true; clearTimeout(timer); };
  }, [recipients, campaignType]);
  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';

  async function importFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { const content = await file.text(); setRaw(value => [value, content].filter(Boolean).join('\n')); } event.target.value = ''; }
  async function sendCampaign() {
    if (!preview?.readyToSend || busy) return;
    setBusy(true); setMessage('');
    try { const result = await request<{ queued: number; skipped: number }>('/commercial/email/campaigns', { method: 'POST', body: { subject, bodyText: body, type: campaignType, recipients } }); setMessage(`Envio iniciado: ${result.queued} emails personalizados na fila; ${result.skipped} bloqueados pelas travas.`); setRaw(''); setPreview(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o envio.'); }
    finally { setBusy(false); }
  }
  async function publishNotice() {
    setBusy(true); setMessage('');
    try { await request('/commercial/email/notices', { method: 'POST', body: notice }); setMessage('Comunicado publicado para administradores de todas as empresas.'); setNotice({ ...notice, title: '', body: '' }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível publicar o comunicado.'); }
    finally { setBusy(false); }
  }
  async function showHistory() {
    setTab('history');
    try { setHistory(await request<Array<{ id: string; subject: string; createdAt: string; recipientCount: number }>>('/commercial/email/campaigns')); } catch { setMessage('Não foi possível carregar o histórico.'); }
  }

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
    <header className="mb-6"><div className="flex items-center gap-2 text-sm font-semibold text-violet-700"><Mail size={17}/> Marketing comercial</div><h1 className="mt-1 text-2xl font-bold text-slate-950">Email e comunicados</h1><p className="mt-1 text-sm text-slate-600">Convites personalizados, envio em lote e avisos para administradores.</p></header>
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Ferramentas de comunicação">
      {([['campaign', 'Novo email'], ['notice', 'Aviso para ADM']] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-violet-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{label}</button>)}
      <button onClick={showHistory} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'history' ? 'bg-violet-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Histórico de emails</button>
    </nav>
    {message && <p role="status" className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">{message}</p>}
    {tab === 'campaign' && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div><label htmlFor="recipients" className="mb-2 block text-sm font-semibold">Destinatários</label><textarea id="recipients" className={`${field} min-h-28`} value={raw} onChange={event => setRaw(event.target.value)} placeholder={'email@empresa.com, Nome da pessoa\nemail2@empresa.com; Outro nome'}/><p className="mt-1 text-xs text-slate-500">Cole uma lista ou importe CSV. Use email e nome por linha.</p><div className="mt-2 flex flex-wrap items-center gap-3"><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium"><Upload size={16}/> Importar CSV</button><input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={importFile}/><span className="text-xs text-slate-500">{recipients.length} contatos válidos e únicos</span></div></div>
      <label htmlFor="campaign-type" className="block text-sm font-semibold">Tipo de email<select id="campaign-type" className={`${field} mt-2`} value={campaignType} onChange={event => setCampaignType(event.target.value as typeof campaignType)}><option value="TRIAL_INVITE">Convite de teste grátis (30 dias)</option><option value="INFO">Comunicado por email</option></select></label>
      <div><label htmlFor="subject" className="mb-2 block text-sm font-semibold">Título do email</label><input id="subject" className={field} value={subject} onChange={event => setSubject(event.target.value)} maxLength={180}/></div>
      <div><label htmlFor="body" className="mb-2 block text-sm font-semibold">Mensagem</label><textarea id="body" className={`${field} min-h-48 leading-6`} value={body} onChange={event => setBody(event.target.value)} maxLength={20000}/><p className="mt-1 text-xs text-slate-500">Variáveis: {'{Nome}'} e {'{LinkTeste}'}. O rodapé e o link de descadastro são automáticos.</p></div>
      <div className="rounded-xl bg-slate-50 p-4" aria-live="polite"><div className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle size={17} className="text-amber-600"/> Prévia do envio</div><p className="text-sm text-slate-700">{preview ? <>{preview.totalValid} na lista → <b>{preview.readyToSend} serão enviados</b>, {preview.skipped} bloqueados por envio recente, ativação anterior, bounce ou descadastro.</> : 'Adicione destinatários para verificar as travas de envio.'}</p><p className="mt-1 text-xs text-slate-500">{campaignType === 'TRIAL_INVITE' ? 'Convites de teste têm intervalo de 60 dias. Emails já ativados, descadastrados ou com bounce não recebem outro convite.' : 'Emails descadastrados ou com bounce são sempre bloqueados.'}</p></div>
      <button type="button" disabled={!preview?.readyToSend || busy || !subject.trim() || !body.trim()} onClick={sendCampaign} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17}/>{busy ? 'Enfileirando…' : `Enviar para ${preview?.readyToSend ?? 0} contatos`}</button>
    </section>}
    {tab === 'notice' && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center gap-2 text-violet-800"><Megaphone size={18}/><h2 className="font-semibold">Comunicado para administradores</h2></div><p className="text-sm text-slate-600">Será disponibilizado no painel ADM para empresas novas e atuais.</p><label className="block text-sm font-semibold">Tipo<select className={`${field} mt-2`} value={notice.type} onChange={event => setNotice({ ...notice, type: event.target.value })}><option value="FEATURE">Nova funcionalidade</option><option value="TERMS">Termos e condições</option></select></label><label className="block text-sm font-semibold">Título<input className={`${field} mt-2`} value={notice.title} onChange={event => setNotice({ ...notice, title: event.target.value })} maxLength={180}/></label><label className="block text-sm font-semibold">Mensagem<textarea className={`${field} mt-2 min-h-36`} value={notice.body} onChange={event => setNotice({ ...notice, body: event.target.value })} maxLength={10000}/></label><button disabled={busy || notice.title.trim().length < 3 || notice.body.trim().length < 5} onClick={publishNotice} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 font-semibold text-white disabled:opacity-50">Publicar para todos</button></section>}
    {tab === 'history' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{history.length ? history.map(item => <article key={item.id} className="flex flex-col gap-1 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">{item.subject}</h2><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('pt-BR')}</p></div><span className="text-sm text-slate-600">{item.recipientCount} destinatários</span></article>) : <p className="p-6 text-sm text-slate-600">Nenhuma campanha registrada.</p>}</section>}
  </main>;
}
