'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { validateResume } from '../../_lib/public-jobs';
import { candidateApi, EDUCATION_LEVELS, EDUCATION_STATUS, type CandidateProfile, type EducationItem } from '../../_lib/candidate-api';
import { useCandidateSession } from '../_components/account-shell';

const digits = (value: string) => value.replace(/\D/g, '');
function maskCpf(value: string) {
  const d = digits(value).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
}
function maskPhone(value: string) {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const maskCep = (value: string) => digits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

function toForm(profile: CandidateProfile) {
  return {
    name: profile.name ?? '', cpf: profile.cpf ? maskCpf(profile.cpf) : '', phone: profile.phone ? maskPhone(profile.phone) : '',
    cep: profile.cep ? maskCep(profile.cep) : '', street: profile.street ?? '', streetNumber: profile.streetNumber ?? '', addressComplement: profile.addressComplement ?? '',
    neighborhood: profile.neighborhood ?? '', city: profile.city ?? '', state: profile.state ?? '',
    consent: profile.consent, admissionShareConsent: profile.admissionShareConsent,
  };
}

export function ProfileForm() {
  const { profile, setProfile, signOut } = useCandidateSession();
  const [form, setForm] = useState(() => toForm(profile));
  const [education, setEducation] = useState<EducationItem[]>(profile.education ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resumeBusy, setResumeBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const input = 'input-v2 min-h-11 text-base sm:text-sm';

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(null); setFieldErrors({});
    try {
      const updated = await candidateApi.update({
        name: form.name.trim(), cpf: digits(form.cpf), phone: digits(form.phone), cep: digits(form.cep),
        street: form.street.trim(), streetNumber: form.streetNumber.trim(), addressComplement: form.addressComplement.trim(),
        neighborhood: form.neighborhood.trim(), city: form.city.trim(), state: form.state.trim().toUpperCase(),
        education, consent: form.consent, admissionShareConsent: form.admissionShareConsent,
      } as never);
      setProfile(updated);
      setMessage({ kind: 'ok', text: 'Perfil salvo.' });
    } catch (cause) {
      const fields = (cause as { fields?: Record<string, string> }).fields;
      if (fields) setFieldErrors(fields);
      setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível salvar.' });
    } finally { setBusy(false); }
  }

  async function sendResume(file: File | null) {
    if (!file) return;
    const issue = validateResume(file);
    if (issue) { setMessage({ kind: 'error', text: issue }); return; }
    setResumeBusy(true); setMessage(null);
    try { setProfile(await candidateApi.uploadResume(file)); setMessage({ kind: 'ok', text: 'Currículo salvo.' }); }
    catch (cause) { setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível enviar o currículo.' }); }
    finally { setResumeBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function removeAccount() {
    if (!window.confirm('Excluir sua conta apaga seu perfil e currículo salvos. Candidaturas já enviadas continuam com as empresas. Continuar?')) return;
    try { await candidateApi.remove(); await signOut(); }
    catch (cause) { setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'Não foi possível excluir a conta.' }); }
  }

  const updateEdu = (index: number, patch: Partial<EducationItem>) => setEducation((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const err = (key: string) => fieldErrors[key] && <span role="alert" className="text-sm text-rose-700">{fieldErrors[key]}</span>;

  return (
    <main className="mx-auto max-w-[820px] space-y-6 px-6 py-8">
      <div><h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-[#5b5473]">Guardamos só o necessário para se candidatar. Você escolhe a cada vaga se quer reutilizar estes dados.</p></div>

      <div className="rounded-[14px] border border-[#e4dff0] bg-white p-4" aria-label="Progresso do perfil">
        <div className="flex items-center justify-between text-sm font-semibold"><span>Perfil {profile.completeness.percent}% completo</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#ece8f5]"><div className="h-full rounded-full bg-[#6d28d9]" style={{ width: `${profile.completeness.percent}%` }} /></div>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">{profile.checklist.map((item) => <li key={item.key} className={`rounded-full px-3 py-1 ${item.done ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f1ecfb] text-[#5b5473]'}`}>{item.done ? '✓ ' : ''}{item.label}</li>)}</ul>
      </div>

      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm font-medium ${message.kind === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}

      <form onSubmit={save} className="space-y-6" noValidate>
        <fieldset disabled={busy} className="space-y-4 rounded-[16px] border border-[#e4dff0] bg-white p-5">
          <legend className="px-1 text-sm font-bold">Dados pessoais</legend>
          <label className="block space-y-1"><span className="text-sm font-medium">Nome completo</span><input className={input} autoComplete="name" maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} />{err('name')}</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-sm font-medium">CPF</span><input className={input} inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} />{err('cpf')}</label>
            <label className="block space-y-1"><span className="text-sm font-medium">Telefone / WhatsApp (contato)</span><input className={input} type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} />{err('phone')}</label>
          </div>
          <label className="block space-y-1"><span className="text-sm font-medium">E-mail</span><input className={`${input} bg-[#f7f5fb]`} value={profile.email} readOnly aria-readonly="true" /></label>
        </fieldset>

        <fieldset disabled={busy} className="space-y-4 rounded-[16px] border border-[#e4dff0] bg-white p-5">
          <legend className="px-1 text-sm font-bold">Endereço</legend>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <label className="block space-y-1"><span className="text-sm font-medium">CEP</span><input className={input} inputMode="numeric" autoComplete="postal-code" value={form.cep} onChange={(e) => set('cep', maskCep(e.target.value))} />{err('cep')}</label>
            <label className="block space-y-1"><span className="text-sm font-medium">Rua</span><input className={input} autoComplete="address-line1" maxLength={160} value={form.street} onChange={(e) => set('street', e.target.value)} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1"><span className="text-sm font-medium">Número</span><input className={input} maxLength={20} value={form.streetNumber} onChange={(e) => set('streetNumber', e.target.value)} /></label>
            <label className="block space-y-1 sm:col-span-2"><span className="text-sm font-medium">Complemento</span><input className={input} maxLength={80} value={form.addressComplement} onChange={(e) => set('addressComplement', e.target.value)} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
            <label className="block space-y-1"><span className="text-sm font-medium">Bairro</span><input className={input} maxLength={100} value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">Cidade</span><input className={input} maxLength={100} value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
            <label className="block space-y-1"><span className="text-sm font-medium">UF</span><input className={input} maxLength={2} value={form.state} onChange={(e) => set('state', e.target.value.toUpperCase())} />{err('state')}</label>
          </div>
        </fieldset>

        <fieldset disabled={busy} className="space-y-4 rounded-[16px] border border-[#e4dff0] bg-white p-5">
          <legend className="px-1 text-sm font-bold">Formação</legend>
          {education.length === 0 && <p className="text-sm text-[#5b5473]">Adicione seu ensino fundamental, médio, técnico, superior ou pós.</p>}
          {education.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-[12px] bg-[#f7f5fb] p-3 sm:grid-cols-2">
              <label className="block space-y-1"><span className="text-sm font-medium">Nível</span><select className={input} value={item.level} onChange={(e) => updateEdu(index, { level: e.target.value })}>{EDUCATION_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label>
              <label className="block space-y-1"><span className="text-sm font-medium">Situação</span><select className={input} value={item.status} onChange={(e) => updateEdu(index, { status: e.target.value })}>{EDUCATION_STATUS.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="block space-y-1"><span className="text-sm font-medium">Curso (opcional)</span><input className={input} maxLength={120} value={item.course} onChange={(e) => updateEdu(index, { course: e.target.value })} /></label>
              <label className="block space-y-1"><span className="text-sm font-medium">Instituição (opcional)</span><input className={input} maxLength={120} value={item.school} onChange={(e) => updateEdu(index, { school: e.target.value })} /></label>
              <button type="button" className="min-h-11 justify-self-start text-sm font-semibold text-rose-700 underline" onClick={() => setEducation((list) => list.filter((_, i) => i !== index))}>Remover</button>
            </div>
          ))}
          {education.length < 8 && <button type="button" className="min-h-11 rounded-[10px] border border-[#d5cceb] px-4 text-sm font-semibold hover:bg-[#f1ecfb]" onClick={() => setEducation((list) => [...list, { level: 'Ensino médio', status: 'Completo', course: '', school: '' }])}>+ Adicionar formação</button>}
        </fieldset>

        <fieldset disabled={busy} className="space-y-3 rounded-[16px] border border-[#e4dff0] bg-white p-5">
          <legend className="px-1 text-sm font-bold">Autorizações</legend>
          <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} /><span className="text-sm leading-6">Autorizo guardar estes dados para me candidatar mais rápido. Posso corrigir ou excluir a qualquer momento.</span></label>
          <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={form.admissionShareConsent} onChange={(e) => set('admissionShareConsent', e.target.checked)} /><span className="text-sm leading-6">Se eu for contratado, autorizo a empresa a aproveitar estes dados no meu cadastro de funcionário (opcional).</span></label>
        </fieldset>
        <Button type="submit" isLoading={busy} className="!bg-[#6d28d9] hover:!bg-[#5b21b6]">Salvar perfil</Button>
      </form>

      <section className="space-y-3 rounded-[16px] border border-[#e4dff0] bg-white p-5" aria-label="Currículo">
        <h2 className="text-sm font-bold">Currículo</h2>
        {profile.resume?.name ? <p className="text-sm">✓ {profile.resume.name}{profile.resume.size ? ` · ${(profile.resume.size / 1024 / 1024).toFixed(2)} MB` : ''}</p> : <p className="text-sm text-[#5b5473]">Nenhum currículo salvo.</p>}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-[#d5cceb] px-4 text-sm font-semibold hover:bg-[#f1ecfb]">
          {resumeBusy ? 'Enviando…' : profile.resume?.name ? 'Trocar currículo' : 'Enviar currículo'}
          <input ref={fileInput} type="file" className="sr-only" disabled={resumeBusy} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => void sendResume(e.target.files?.[0] ?? null)} />
        </label>
        <p className="text-xs text-[#5b5473]">PDF ou DOCX até 5 MB.</p>
      </section>

      <section className="rounded-[16px] border border-rose-200 bg-white p-5">
        <h2 className="text-sm font-bold">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-[#5b5473]">Apaga perfil, currículo salvo e acessos. Candidaturas já enviadas permanecem com as empresas.</p>
        <button type="button" className="mt-3 min-h-11 rounded-[10px] border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50" onClick={() => void removeAccount()}>Excluir conta</button>
      </section>
    </main>
  );
}
