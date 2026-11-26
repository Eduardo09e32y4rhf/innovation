'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { request } from '@/app/lib/api';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type Invite = { email: string; name?: string };

export default function TrialInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    request<Invite>(`/commercial/email/trial-token/${encodeURIComponent(token)}`, { silent: true })
      .then(data => { if (active) setInvite(data); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Este convite não está disponível.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function continueSignup() {
    if (!invite || submitting) return;
    setSubmitting(true); setError('');
    try {
      router.push(`/cadastro?email=${encodeURIComponent(invite.email)}&trialInviteActivated=1&trialInviteToken=${encodeURIComponent(token)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível validar o convite.');
      setSubmitting(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <section className="w-full max-w-md space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="font-extrabold text-violet-800">Innovation</div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-700"/></div> : error && !invite ? <div role="alert" className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="shrink-0"/>{error}</div> : <>
        <div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14}/> Convite validado</span><h1 className="mt-3 text-xl font-extrabold text-slate-900">Comece seu cadastro</h1><p className="mt-2 text-sm text-slate-600">O convite foi enviado para <strong>{invite?.email}</strong>. Continue para o cadastro seguro da empresa e conclua a ativação do período de teste.</p></div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={submitting} onClick={continueSignup} className="w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white disabled:opacity-60">{submitting ? 'Validando convite…' : 'Continuar para cadastro'}</button>
      </>}
    </section>
  </main>;
}
