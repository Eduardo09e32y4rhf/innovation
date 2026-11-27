'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { validateResume } from '@/app/carreiras/_lib/public-jobs';
import {
  candidateApi,
  EDUCATION_LEVELS,
  EDUCATION_STATUS,
  LICENSE_CATEGORIES,
  type CandidateProfile,
  type EducationItem,
  type ExperienceItem,
} from '@/app/carreiras/_lib/candidate-api';
import { profileStrength } from '@/app/carreiras/_lib/profile-insights';
import { useCandidateSession } from '../_components/candidate-layout';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useGuard } from '@/app/hooks/use-action';
import { useI18n } from '@/app/contexts/I18nContext';

const digits = (value: string) => value.replace(/\D/g, '');

function normalizePhoneDigits(value: string, defaultCountry = '55'): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  let d = digits(trimmed);
  if (!d) return '';

  if (trimmed.startsWith('00')) {
    d = d.slice(2);
  } else if (!trimmed.startsWith('+') && d.length <= 11 && !d.startsWith(defaultCountry)) {
    d = `${defaultCountry}${d}`;
  }

  return d.slice(0, 15);
}

function maskCpf(value: string) {
  const d = digits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskPhone(value: string) {
  const d = normalizePhoneDigits(value);
  if (!d) return '';

  if (d.startsWith('55') && d.length > 2) {
    const cc = d.slice(0, 2);
    const area = d.slice(2, 4);
    const local = d.slice(4);
    if (!area) return `+${cc}`;
    if (local.length <= 4) return `+${cc} (${area}) ${local}`.trim();
    if (local.length <= 8) return `+${cc} (${area}) ${local.slice(0, 4)}-${local.slice(4)}`;
    return `+${cc} (${area}) ${local.slice(0, 5)}-${local.slice(5)}`;
  }

  const ccLen = d.length > 11 ? (d.startsWith('1') ? 1 : d.length >= 13 ? 3 : 2) : 1;
  const cc = d.slice(0, ccLen);
  const rest = d.slice(ccLen);
  if (!rest) return `+${cc}`;

  const areaLen = rest.length > 8 ? 2 : 0;
  const area = areaLen ? rest.slice(0, areaLen) : '';
  const local = areaLen ? rest.slice(areaLen) : rest;
  const grouped =
    local.length > 6
      ? `${local.slice(0, local.length - 4)}-${local.slice(-4)}`
      : local.length > 4
        ? `${local.slice(0, 3)} ${local.slice(3)}`
        : local;

  return area ? `+${cc} (${area}) ${grouped}` : `+${cc} ${grouped}`;
}

const maskCep = (value: string) => digits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

const MAX_SKILLS = 15;
const MAX_EXPERIENCE = 10;
const SKILL_IDEAS = [
  'Excel',
  'Atendimento ao cliente',
  'Comunicação',
  'Trabalho em equipe',
  'Pacote Office',
  'Vendas',
  'Organização',
  'Inglês',
];

function toForm(profile: CandidateProfile) {
  return {
    name: profile.name ?? '',
    cpf: profile.cpf ? maskCpf(profile.cpf) : '',
    phone: profile.phone ? maskPhone(profile.phone) : '',
    cep: profile.cep ? maskCep(profile.cep) : '',
    street: profile.street ?? '',
    streetNumber: profile.streetNumber ?? '',
    addressComplement: profile.addressComplement ?? '',
    neighborhood: profile.neighborhood ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    birthDate: profile.birthDate ?? '',
    profession: profile.profession ?? '',
    about: profile.about ?? '',
    hasDriverLicense:
      profile.hasDriverLicense === null || profile.hasDriverLicense === undefined
        ? ''
        : profile.hasDriverLicense
          ? 'sim'
          : 'nao',
    driverLicenseCategory: profile.driverLicenseCategory ?? [],
    consent: Boolean(profile.consent),
    admissionShareConsent: Boolean(profile.admissionShareConsent),
    talentPoolConsent: Boolean(profile.talentPoolConsent),
  };
}

function resolveProfileResponse(res: unknown, fallback: CandidateProfile): CandidateProfile {
  if (!res || typeof res !== 'object') return fallback;
  const candidateObj = 'profile' in res && res.profile && typeof res.profile === 'object'
    ? (res.profile as CandidateProfile)
    : (res as CandidateProfile);
  return { ...fallback, ...candidateObj };
}

function Section({
  id,
  title,
  description,
  done,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-[18px] border border-[#ebe6f3] bg-white p-5 shadow-[0_1px_2px_rgba(30,17,69,0.04)] sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-base font-bold text-[#1e1145]">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-[#5b5473]">{description}</p>}
        </div>
        {done !== undefined && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {done ? `✓ ${t('Completo')}` : t('Pendente')}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function ProfileForm() {
  const { t } = useI18n();
  const { profile, setProfile, signOut } = useCandidateSession();
  const [form, setForm] = useState(() => toForm(profile));
  const [education, setEducation] = useState<EducationItem[]>(profile.education ?? []);
  const [experience, setExperience] = useState<ExperienceItem[]>(profile.experience ?? []);
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [languages, setLanguages] = useState((profile.languages ?? []).join(', '));
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => { if (!celebrate) return; const timer = setTimeout(() => setCelebrate(false), 800); return () => clearTimeout(timer); }, [celebrate]);
  const [skillDraft, setSkillDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resumeBusy, setResumeBusy] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const lastSyncedEmail = useRef(profile.email);
  const lastCep = useRef(digits(profile?.cep ?? ''));
  const numberInput = useRef<HTMLInputElement>(null);
  const [cepState, setCepState] = useState<'idle' | 'loading' | 'ok' | 'notfound'>('idle');

  useEffect(() => {
    if (!profile) return;
    if (!dirty || lastSyncedEmail.current !== profile.email) {
      setForm(toForm(profile));
      setEducation(profile.education ?? []);
      setExperience(profile.experience ?? []);
      setSkills(profile.skills ?? []);
      setLanguages((profile.languages ?? []).join(', '));
      lastCep.current = digits(profile.cep ?? '');
      lastSyncedEmail.current = profile.email;
    }
  }, [profile, dirty]);

  const set = (key: keyof typeof form, value: string | string[] | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const input = 'input-v2 min-h-11 text-base sm:text-sm';
  const label = 'text-sm font-medium text-[#3b2f5c]';

  const preview = useMemo(
    () =>
      profileStrength({
        ...profile,
        ...form,
        phone: normalizePhoneDigits(form.phone),
        languages: languages.split(',').map(value => value.trim()).filter(Boolean),
        skills,
        education,
        experience,
      }),
    [profile, form, skills, education, experience, languages],
  );

  const doneKeys = new Set(preview.items.filter((item) => item.done).map((item) => item.key));

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const rawUpdated = await candidateApi.update({
        name: form.name.trim(),
        cpf: digits(form.cpf),
        phone: normalizePhoneDigits(form.phone),
        cep: digits(form.cep),
        street: form.street.trim(),
        streetNumber: form.streetNumber.trim(),
        addressComplement: form.addressComplement.trim(),
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        birthDate: form.birthDate,
        profession: form.profession.trim(),
        about: form.about.trim(),
        skills,
        experience: experience.filter((item) => item.role.trim()),
        ...(form.hasDriverLicense
          ? {
              hasDriverLicense: form.hasDriverLicense === 'sim',
              driverLicenseCategory: form.hasDriverLicense === 'sim' ? form.driverLicenseCategory : [],
            }
          : {}),
        education,
        consent: form.consent,
        admissionShareConsent: form.admissionShareConsent,
        talentPoolConsent: form.talentPoolConsent,
      } as never);

      const updated = resolveProfileResponse(rawUpdated, profile);
      setProfile(updated);
      setForm(toForm(updated));
      setEducation(updated.education ?? education);
      setExperience(updated.experience ?? []);
      setSkills(updated.skills ?? skills);
      setLanguages((updated.languages ?? []).join(', '));
      setDirty(false);

      const gained = profileStrength(updated).score - profileStrength(profile).score;
      setCelebrate(gained > 0);
      setMessage({
        kind: 'ok',
        text: gained > 0 ? `Perfil salvo! Sua força subiu ${gained} pontos.` : 'Perfil salvo.',
      });
    } catch (cause) {
      const fields = (cause as { fields?: Record<string, string> }).fields;
      if (fields) setFieldErrors(fields);
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendResume(file: File | null) {
    if (!file || resumeBusy) return;
    const issue = validateResume(file);
    if (issue) {
      setMessage({ kind: 'error', text: issue });
      if (fileInput.current) fileInput.current.value = '';
      return;
    }

    setResumeBusy(true);
    setMessage(null);

    try {
      const uploaded = await candidateApi.uploadResume(file);
      const updated = resolveProfileResponse(uploaded, {
        ...profile,
        resume:
          (uploaded as { resume?: CandidateProfile['resume'] })?.resume ??
          profile.resume ?? { name: file.name, type: file.type, size: file.size },
      });
      setProfile(updated);
      setCelebrate(profileStrength(updated).score > profileStrength(profile).score);
      setMessage({ kind: 'ok', text: `Currículo "${file.name}" enviado e salvo com sucesso.` });
    } catch (cause) {
      setMessage({
        kind: 'error',
        text:
          cause instanceof Error
            ? cause.message
            : 'Não foi possível enviar o currículo. Verifique o arquivo (PDF ou DOCX até 5 MB) e tente novamente.',
      });
    } finally {
      setResumeBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const askConfirm = useConfirm();
  const { guard } = useGuard();

  const removeAccount = guard('removeAccount', async () => {
    if (
      !(await askConfirm({
        title: t('Excluir minha conta'),
        description:
          t('Excluir sua conta apaga seu perfil e currículo salvos. Candidaturas já enviadas continuam com as empresas.'),
        confirmText: t('Excluir minha conta'),
      }))
    ) {
      return;
    }
    try {
      await candidateApi.remove();
      await signOut();
    } catch (cause) {
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Não foi possível excluir a conta.',
      });
    }
  });

  const updateEdu = (index: number, patch: Partial<EducationItem>) => {
    setEducation((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setDirty(true);
  };

  const updateExp = (index: number, patch: Partial<ExperienceItem>) => {
    setExperience((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setDirty(true);
  };

  const addSkill = (raw: string) => {
    const value = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (
      !value ||
      skills.length >= MAX_SKILLS ||
      skills.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      setSkillDraft('');
      return;
    }
    setSkills((list) => [...list, value]);
    setSkillDraft('');
    setDirty(true);
  };

  const onSkillKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill(skillDraft);
    }
    if (event.key === 'Backspace' && !skillDraft && skills.length) {
      setSkills((list) => list.slice(0, -1));
      setDirty(true);
    }
  };

  async function onCepChange(value: string) {
    const masked = maskCep(value);
    set('cep', masked);
    const cep = digits(masked);
    if (cep.length < 8) {
      setCepState('idle');
      return;
    }
    if (cep === lastCep.current) return;
    lastCep.current = cep;
    setCepState('loading');
    try {
      const found = await candidateApi.cep(cep);
      if (lastCep.current !== cep) return;
      setForm((current) => ({
        ...current,
        street: found.street || current.street,
        neighborhood: found.neighborhood || current.neighborhood,
        city: found.city || current.city,
        state: (found.state || current.state).toUpperCase(),
      }));
      setDirty(true);
      setCepState('ok');
      window.setTimeout(() => numberInput.current?.focus(), 0);
    } catch {
      if (lastCep.current === cep) setCepState('notfound');
    }
  }

  const err = (key: string) =>
    fieldErrors[key] && (
      <span role="alert" className="text-sm text-rose-700">
        {fieldErrors[key]}
      </span>
    );

  const nav = [
    { id: 'resumo', label: 'Resumo profissional', done: doneKeys.has('about') },
    { id: 'experiencia', label: 'Experiência', done: doneKeys.has('experience') },
    { id: 'formacao', label: 'Formação', done: doneKeys.has('education') },
    { id: 'competencias', label: 'Competências', done: doneKeys.has('skills') },
    { id: 'idiomas', label: 'Idiomas', done: doneKeys.has('languages') },
    { id: 'curriculo', label: 'Currículo', done: doneKeys.has('resume') },
    { id: 'dados', label: 'Dados pessoais', done: doneKeys.has('contact') },
    { id: 'endereco', label: 'Endereço', done: doneKeys.has('contact') },
    { id: 'autorizacoes', label: 'Privacidade' },
  ];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      {celebrate && <span role="status" className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-700 p-4 text-white motion-safe:animate-bounce">✓ Item do perfil concluído</span>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">{t('Meu perfil profissional')}</h1>
          <p className="text-sm text-[#5b5473]">{t('Quanto mais completo, mais vagas combinam com você e mais recrutadores te encontram.')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[18px] bg-[linear-gradient(135deg,#1e1145,#5b29be)] p-5 text-white">
            <p className="text-xs uppercase tracking-wider text-white/70">{t('Força do perfil')}</p>
            <p className="mt-1 text-3xl font-extrabold">
              {preview.score}
              <span className="text-base font-semibold text-white/70">/100</span>
            </p>
            <p className="text-sm font-semibold">{t(preview.level.name)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${preview.score}%` }} />
            </div>
            {preview.next[0] && (
              <p className="mt-3 text-xs leading-5 text-white/85">
                {t('Próximo:')} <strong>{t(preview.next[0].label)}</strong> (+{preview.next[0].points})
              </p>
            )}
          </div>
          <nav aria-label={t('Seções do perfil')} className="mt-3 hidden rounded-[18px] border border-[#ebe6f3] bg-white p-2 lg:block">
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex min-h-10 items-center justify-between rounded-[10px] px-3 text-sm font-medium hover:bg-[#f6f2ff]"
              >
                {t(item.label)}
                {item.done !== undefined && (
                  <span
                    aria-label={t(item.done ? 'completo' : 'pendente')}
                    className={`h-2.5 w-2.5 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  />
                )}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {message && (
            <p
              role={message.kind === 'error' ? 'alert' : 'status'}
              className={`rounded-[12px] p-3 text-sm font-medium ${
                message.kind === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {message.text}
            </p>
          )}

          <form id="profile-form" onSubmit={save} className="space-y-5" noValidate>
            <fieldset disabled={busy} className="space-y-5">
              <Section
                id="resumo"
                title={t('Resumo profissional')}
                description={t('Como você se apresenta para o RH.')}
                done={doneKeys.has('about')}
              >
                <div className="space-y-4">
                  <label className="block space-y-1">
                    <span className={label}>{t('Título profissional')}</span>
                    <input
                      className={input}
                      maxLength={120}
                      placeholder={t('Ex.: Analista contábil · Vendedor · Estudante de Administração')}
                      value={form.profession}
                      onChange={(e) => set('profession', e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('Sobre você')}</span>
                    <textarea
                      className={`${input} min-h-[120px] py-3`}
                      maxLength={1200}
                      placeholder={t('Ex.: Tenho 4 anos de experiência em departamento pessoal, com folha, admissões e eSocial. Busco crescer na área contábil.')}
                      value={form.about}
                      onChange={(e) => set('about', e.target.value)}
                    />
                    <span className="flex justify-between text-xs text-[#7a7290]">
                      <span>{t(form.about.trim().length < 40 ? 'Escreva pelo menos 2 frases.' : 'Ótimo!')}</span>
                      <span>{form.about.length}/1200</span>
                    </span>
                  </label>
                </div>
              </Section>

              <Section
                id="experiencia"
                title={t('Experiência profissional')}
                description={t('Do emprego mais recente para o mais antigo. Estágio, freelancer e trabalho voluntário também contam.')}
                done={doneKeys.has('experience')}
              >
                <div className="space-y-3">
                  {experience.length === 0 && (
                    <p className="rounded-[12px] border border-dashed border-[#d5cceb] p-4 text-sm text-[#5b5473]">
                      {t('Nenhuma experiência ainda. Primeiro emprego? Adicione estágios, cursos práticos ou trabalhos informais.')}
                    </p>
                  )}
                  {experience.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-[14px] border border-[#ebe6f3] bg-[#fcfbfe] p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className={label}>{t('Cargo *')}</span>
                          <input
                            className={input}
                            maxLength={120}
                            placeholder={t('Ex.: Assistente administrativo')}
                            value={item.role}
                            onChange={(e) => updateExp(index, { role: e.target.value })}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className={label}>{t('Empresa')}</span>
                          <input
                            className={input}
                            maxLength={120}
                            value={item.company}
                            onChange={(e) => updateExp(index, { company: e.target.value })}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className={label}>{t('Início')}</span>
                          <input
                            className={input}
                            type="month"
                            value={item.start ?? ''}
                            onChange={(e) => updateExp(index, { start: e.target.value || null })}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className={label}>{t('Fim')}</span>
                          <input
                            className={input}
                            type="month"
                            disabled={item.current}
                            value={item.current ? '' : item.end ?? ''}
                            onChange={(e) => updateExp(index, { end: e.target.value || null })}
                          />
                        </label>
                      </div>
                      <label className="flex min-h-10 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={item.current}
                          onChange={(e) =>
                            updateExp(index, { current: e.target.checked, end: e.target.checked ? null : item.end })
                          }
                        />
                        {t('Trabalho aqui atualmente')}
                      </label>
                      <label className="block space-y-1">
                        <span className={label}>{t('Principais atividades e resultados')}</span>
                        <textarea
                          className={`${input} min-h-[90px] py-3`}
                          maxLength={600}
                          placeholder={t('Ex.: Atendimento a 40 clientes por dia, controle de estoque, emissão de notas fiscais.')}
                          value={item.description}
                          onChange={(e) => updateExp(index, { description: e.target.value })}
                        />
                      </label>
                      <button
                        type="button"
                        className="min-h-10 text-sm font-semibold text-rose-700 hover:underline"
                        onClick={() => {
                          setExperience((list) => list.filter((_, i) => i !== index));
                          setDirty(true);
                        }}
                      >
                        {t('Remover experiência')}
                      </button>
                    </div>
                  ))}
                  {experience.length < MAX_EXPERIENCE && (
                    <button
                      type="button"
                      className="min-h-11 rounded-[10px] border border-dashed border-[#b9a5ea] px-4 text-sm font-semibold text-[#5b29be] hover:bg-[#f6f2ff]"
                      onClick={() => {
                        setExperience((list) => [
                          ...list,
                          { role: '', company: '', start: null, end: null, current: list.length === 0, description: '' },
                        ]);
                        setDirty(true);
                      }}
                    >
                      {t('+ Adicionar experiência')}
                    </button>
                  )}
                </div>
              </Section>

              <Section
                id="formacao"
                title={t('Formação')}
                description={t('Escola, curso técnico, faculdade ou pós. Informe o curso e a instituição.')}
                done={doneKeys.has('education')}
              >
                <div className="space-y-3">
                  {education.length === 0 && (
                    <p className="rounded-[12px] border border-dashed border-[#d5cceb] p-4 text-sm text-[#5b5473]">
                      {t('Adicione seu ensino fundamental, médio, técnico, superior ou pós.')}
                    </p>
                  )}
                  {education.map((item, index) => (
                    <div key={index} className="grid gap-3 rounded-[14px] border border-[#ebe6f3] bg-[#fcfbfe] p-4 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className={label}>{t('Nível')}</span>
                        <select className={input} value={item.level} onChange={(e) => updateEdu(index, { level: e.target.value })}>
                          {EDUCATION_LEVELS.map((level) => (
                            <option key={level} value={level}>{t(level)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className={label}>{t('Situação')}</span>
                        <select className={input} value={item.status} onChange={(e) => updateEdu(index, { status: e.target.value })}>
                          {EDUCATION_STATUS.map((status) => (
                            <option key={status} value={status}>{t(status)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className={label}>
                          {t(item.level.startsWith('Ensino') ? 'Curso / ênfase (opcional)' : 'Nome do curso')}
                        </span>
                        <input
                          className={input}
                          maxLength={120}
                          placeholder={item.level === 'Superior' ? t('Ex.: Ciências Contábeis') : ''}
                          value={item.course}
                          onChange={(e) => updateEdu(index, { course: e.target.value })}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className={label}>
                          {t(item.level.startsWith('Ensino') ? 'Nome da escola' : 'Faculdade / instituição')}
                        </span>
                        <input
                          className={input}
                          maxLength={120}
                          value={item.school}
                          onChange={(e) => updateEdu(index, { school: e.target.value })}
                        />
                      </label>
                      <button
                        type="button"
                        className="min-h-10 justify-self-start text-sm font-semibold text-rose-700 hover:underline"
                        onClick={() => {
                          setEducation((list) => list.filter((_, i) => i !== index));
                          setDirty(true);
                        }}
                      >
                        {t('Remover formação')}
                      </button>
                    </div>
                  ))}
                  {education.length < 8 && (
                    <button
                      type="button"
                      className="min-h-11 rounded-[10px] border border-dashed border-[#b9a5ea] px-4 text-sm font-semibold text-[#5b29be] hover:bg-[#f6f2ff]"
                      onClick={() => {
                        setEducation((list) => [...list, { level: 'Ensino médio', status: 'Completo', course: '', school: '' }]);
                        setDirty(true);
                      }}
                    >
                      {t('+ Adicionar formação')}
                    </button>
                  )}
                </div>
              </Section>

              <Section
                id="competencias"
                title={t('Competências e habilitação')}
                description={t('Usamos suas competências para recomendar vagas. Digite e aperte Enter.')}
                done={doneKeys.has('skills')}
              >
                <div className="space-y-4">
                  <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-[12px] border border-[#d5cceb] bg-white p-2 focus-within:border-[#7240da]">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f0eafa] py-1 pl-3 pr-1 text-sm font-medium text-[#5b29be]"
                      >
                        {skill}
                        <button
                          type="button"
                          aria-label={`Remover ${skill}`}
                          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#e0d4f7]"
                          onClick={() => {
                            setSkills((list) => list.filter((item) => item !== skill));
                            setDirty(true);
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {skills.length < MAX_SKILLS && (
                      <input
                        aria-label={t('Nova competência')}
                        className="min-w-[160px] flex-1 border-0 bg-transparent px-2 text-base outline-none sm:text-sm"
                        placeholder={t(skills.length ? 'Adicionar…' : 'Ex.: Excel, SPED, Atendimento')}
                        value={skillDraft}
                        maxLength={40}
                        onChange={(e) => setSkillDraft(e.target.value)}
                        onKeyDown={onSkillKey}
                        onBlur={() => addSkill(skillDraft)}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-[#7a7290]">{t('Sugestões:')}</span>
                    {SKILL_IDEAS.filter((idea) => !skills.some((s) => s.toLowerCase() === idea.toLowerCase()))
                      .slice(0, 6)
                      .map((idea) => (
                        <button
                          key={idea}
                          type="button"
                          onClick={() => addSkill(idea)}
                          className="rounded-full border border-[#e4dcf3] px-2.5 py-0.5 text-xs hover:bg-[#f6f2ff]"
                        >
                          + {t(idea)}
                        </button>
                      ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className={label}>{t('Possui habilitação (CNH)?')}</span>
                      <select
                        className={input}
                        value={form.hasDriverLicense}
                        onChange={(e) => set('hasDriverLicense', e.target.value)}
                      >
                        <option value="">{t('Prefiro não informar')}</option>
                        <option value="sim">{t('Sim')}</option>
                        <option value="nao">{t('Não')}</option>
                      </select>
                    </label>
                    {form.hasDriverLicense === 'sim' && (
                      <label className="block space-y-1">
                        <span className={label}>{t('Categoria')}</span>
                        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Categorias da CNH')}>
                          {LICENSE_CATEGORIES.map((category) => {
                            const selected = form.driverLicenseCategory.includes(category);
                            return <button key={category} type="button" aria-pressed={selected} onClick={() => set('driverLicenseCategory', selected ? form.driverLicenseCategory.filter((item) => item !== category) : [...form.driverLicenseCategory, category])} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6a3de0] ${selected ? 'border-[#6a3de0] bg-[#f0eafa] text-[#5b29be]' : 'border-[#e9e5f0] bg-white text-[#736d80]'}`}>{category}</button>;
                          })}
                        </div>
                        {err('driverLicenseCategory')}
                      </label>
                    )}
                  </div>
                </div>
              </Section>
              <Section id="idiomas" title="Idiomas" description="Separe os idiomas por vírgula. Ex.: Português, Inglês." done={doneKeys.has('languages')}>
                <label className="block text-sm font-medium">Idiomas que voc? conhece
                  <input value={languages} maxLength={600} onChange={event => { setLanguages(event.target.value); setDirty(true); }} className="input-v2 mt-2 min-h-11 w-full" placeholder="Português, Inglês" />
                </label>
              </Section>
            </fieldset>
          </form>

          <Section
            id="curriculo"
            title={t('Currículo')}
            description={t('Enviado junto com suas candidaturas. PDF ou DOCX até 5 MB.')}
            done={doneKeys.has('resume')}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#ebe6f3] bg-[#fcfbfe] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0eafa] text-xs font-extrabold text-[#5b29be]"
                >
                  {profile.resume?.name?.split('.').pop()?.toUpperCase() ?? 'CV'}
                </span>
                <div className="min-w-0">
                  {profile.resume?.name ? (
                    <>
                      <p className="truncate text-sm font-semibold">{profile.resume.name}</p>
                      {profile.resume.size ? (
                        <p className="text-xs text-[#7a7290]">{(profile.resume.size / 1024 / 1024).toFixed(2)} MB</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-[#5b5473]">{t('Nenhum currículo salvo.')}</p>
                  )}
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]">
                {resumeBusy ? t('Enviando…') : profile.resume?.name ? t('Trocar currículo') : t('Enviar currículo')}
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  disabled={resumeBusy}
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => void sendResume(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </Section>

          <fieldset form="profile-form" disabled={busy} className="space-y-5">
            <Section
              id="dados"
              title={t('Dados pessoais')}
              description={t('Usados só quando você se candidata. Nunca aparecem no banco de talentos.')}
              done={doneKeys.has('contact')}
            >
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className={label}>{t('Nome completo')}</span>
                  <input
                    form="profile-form"
                    className={input}
                    autoComplete="name"
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                  {err('name')}
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className={label}>{t('CPF')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={(e) => set('cpf', maskCpf(e.target.value))}
                    />
                    {err('cpf')}
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('Telefone')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+55 (11) 91234-5678"
                      value={form.phone}
                      onChange={(e) => set('phone', maskPhone(e.target.value))}
                    />
                    {err('phone')}
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('Data de nascimento')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      type="date"
                      autoComplete="bday"
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.birthDate}
                      onChange={(e) => set('birthDate', e.target.value)}
                    />
                    {err('birthDate')}
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('E-mail (seu usuário)')}</span>
                    <input className={`${input} bg-[#fbfafc]`} value={profile.email} readOnly aria-readonly="true" />
                  </label>
                </div>
              </div>
            </Section>

            <Section
              id="endereco"
              title={t('Endereço')}
              description={t('Com sua cidade, priorizamos vagas perto de você.')}
              done={doneKeys.has('address')}
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <label className="block space-y-1">
                    <span className={label}>{t('CEP')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.cep}
                      onChange={(e) => void onCepChange(e.target.value)}
                    />
                    {err('cep')}
                    <span
                      className={`block text-xs ${cepState === 'notfound' ? 'text-amber-700' : 'text-[#7a7290]'}`}
                      role="status"
                    >
                      {cepState === 'loading'
                        ? t('Buscando endereço…')
                        : cepState === 'ok'
                          ? t('✓ Endereço preenchido')
                          : cepState === 'notfound'
                            ? t('CEP não encontrado. Preencha à mão.')
                            : t('Digite o CEP e preenchemos o resto.')}
                    </span>
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('Rua')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      autoComplete="address-line1"
                      maxLength={160}
                      value={form.street}
                      onChange={(e) => set('street', e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className={label}>{t('Número')}</span>
                    <input
                      ref={numberInput}
                      form="profile-form"
                      className={input}
                      maxLength={20}
                      value={form.streetNumber}
                      onChange={(e) => set('streetNumber', e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className={label}>{t('Complemento')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      maxLength={80}
                      value={form.addressComplement}
                      onChange={(e) => set('addressComplement', e.target.value)}
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px]">
                  <label className="block space-y-1">
                    <span className={label}>{t('Bairro')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      maxLength={100}
                      value={form.neighborhood}
                      onChange={(e) => set('neighborhood', e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('Cidade')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      maxLength={100}
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={label}>{t('UF')}</span>
                    <input
                      form="profile-form"
                      className={input}
                      maxLength={2}
                      value={form.state}
                      onChange={(e) => set('state', e.target.value.toUpperCase())}
                    />
                    {err('state')}
                  </label>
                </div>
              </div>
            </Section>

            <Section id="autorizacoes" title={t('Privacidade e visibilidade')}>
              <div className="space-y-3">
                <label className="flex min-h-11 items-start gap-3 rounded-[12px] border border-[#d9ccf7] bg-[#faf7ff] p-3">
                  <input
                    form="profile-form"
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={form.talentPoolConsent}
                    onChange={(e) => set('talentPoolConsent', e.target.checked)}
                  />
                  <span className="text-sm leading-6">
                    <strong>{t('Quero ser encontrado por recrutadores (banco de talentos).')}</strong> {t('O RH de empresas parceiras vê nome, título, cidade, formação, experiências e currículo e pode te convidar para vagas. E-mail, telefone e CPF não são compartilhados.')}
                  </span>
                </label>
                <label className="flex min-h-11 items-start gap-3">
                  <input
                    form="profile-form"
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={form.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                  />
                  <span className="text-sm leading-6">
                    {t('Autorizo guardar estes dados para me candidatar mais rápido. Posso corrigir ou excluir a qualquer momento.')}
                  </span>
                </label>
                <label className="flex min-h-11 items-start gap-3">
                  <input
                    form="profile-form"
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    checked={form.admissionShareConsent}
                    onChange={(e) => set('admissionShareConsent', e.target.checked)}
                  />
                  <span className="text-sm leading-6">
                    {t('Se eu for contratado, autorizo a empresa a aproveitar estes dados no meu cadastro de funcionário (opcional).')}
                  </span>
                </label>
              </div>
            </Section>
          </fieldset>

          <section className="rounded-[18px] border border-rose-200 bg-white p-5">
            <h2 className="text-sm font-bold">{t('Excluir minha conta')}</h2>
            <p className="mt-1 text-sm text-[#5b5473]">
              {t('Apaga perfil, currículo salvo e acessos. Candidaturas já enviadas permanecem com as empresas.')}
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-[10px] border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              onClick={() => void removeAccount()}
            >
              {t('Excluir conta')}
            </button>
          </section>
          <div className="h-16" aria-hidden="true" />
        </div>
      </div>

      {(dirty || busy) && (
        <div className="sticky bottom-0 z-30 -mx-4 border-t border-[#ebe6f3] bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_rgba(30,17,69,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="min-w-0 text-xs text-[#5b5473] sm:text-sm">
              <strong className="text-[#1e1145]">{t('Alterações não salvas')}</strong>
              <span className="hidden sm:inline"> · {t('força prevista')} {preview.score}/100</span>
            </p>
            <Button
              type="submit"
              form="profile-form"
              isLoading={busy}
              disabled={!dirty || busy}
              className="!min-h-11 !shrink-0 !bg-[#7240da] px-4 hover:!bg-[#5b29be] sm:px-6"
            >
              {t('Salvar perfil')}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
