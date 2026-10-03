'use client';

import { Archive, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { can } from '@/app/lib/schedule-access';
import { hubApi } from '../_lib/hub-api';
import { WEEKDAYS, errorMessage } from '../_lib/format';
import type { Geofence, Overview, PunchPolicy, ScheduleTemplate } from '../_lib/types';

const input = 'input-v2 w-full text-base sm:text-sm';
const SCALE_TYPES = ['5x2', '6x1', '12x36', '4x2', 'PERSONALIZADA', 'PLANTAO'];

function Section({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-v2 space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-0.5 text-sm text-fg-sub">{description}</p>}</div>{actions}
      </header>
      {children}
    </section>
  );
}

// ─── Escalas (modelos) ─────────────────────────────────────────────
function ScheduleEditor({ item, onClose, onSaved }: { item: ScheduleTemplate | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const editing = item && item !== 'new' ? item : null;
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!item) return;
    setForm(editing ? { ...editing, cycleStartDate: editing.cycleStartDate?.slice(0, 10) ?? '' } : { name: '', scaleType: '5x2', entryTime: '08:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '17:00', workDays: [1, 2, 3, 4, 5], restDays: [0, 6], isNightShift: false });
  }, [item, editing]);

  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const toggleDay = (day: number) => {
    const work = new Set<number>(form.workDays ?? []);
    if (work.has(day)) work.delete(day); else work.add(day);
    setForm((current) => ({ ...current, workDays: [...work].sort(), restDays: [0, 1, 2, 3, 4, 5, 6].filter((d) => !work.has(d)) }));
  };

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: String(form.name ?? '').trim(), description: form.description || undefined, scaleType: form.scaleType,
        entryTime: form.entryTime || undefined, lunchStartTime: form.lunchStartTime || undefined, lunchReturnTime: form.lunchReturnTime || undefined, exitTime: form.exitTime || undefined,
        workDays: form.workDays, restDays: form.restDays, isNightShift: Boolean(form.isNightShift),
        nightStartTime: form.isNightShift ? form.nightStartTime || '22:00' : undefined, nightEndTime: form.isNightShift ? form.nightEndTime || '05:00' : undefined,
      };
      if (form.scaleType === '12x36') { body.cycleWorkHours = 12; body.cycleRestHours = 36; if (form.cycleStartDate) body.cycleStartDate = form.cycleStartDate; }
      if (editing) await hubApi.updateSchedule(editing.id, body); else await hubApi.createSchedule(body);
      toast.success('Escala salva.'); onSaved(); onClose();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível salvar a escala.')); }
    finally { setBusy(false); }
  }

  return (
    <Modal isOpen={Boolean(item)} onClose={() => !busy && onClose()} title={editing ? 'Editar escala' : 'Nova escala'} maxWidth="max-w-xl">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (String(form.name ?? '').trim()) void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">Nome *<input className={input} value={form.name ?? ''} onChange={(event) => set('name', event.target.value)} placeholder="Ex.: Comercial 08–17" /></label>
          <label className="space-y-1.5 text-sm font-medium">Tipo<select className={input} value={form.scaleType ?? '5x2'} onChange={(event) => set('scaleType', event.target.value)}>{SCALE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
          {([['entryTime', 'Entrada'], ['exitTime', 'Saída'], ['lunchStartTime', 'Início do intervalo'], ['lunchReturnTime', 'Fim do intervalo']] as const).map(([key, label]) => (
            <label key={key} className="space-y-1.5 text-sm font-medium">{label}<input type="time" className={input} value={form[key] ?? ''} onChange={(event) => set(key, event.target.value)} /></label>
          ))}
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Dias de trabalho</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => <button key={label} type="button" aria-pressed={(form.workDays ?? []).includes(day)} onClick={() => toggleDay(day)} className={`h-10 min-w-12 rounded-lg border px-3 text-sm font-medium ${(form.workDays ?? []).includes(day) ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{label}</button>)}
          </div>
        </fieldset>
        {form.scaleType === '12x36' && <label className="block space-y-1.5 text-sm font-medium">Início do ciclo 12x36 (um dia de trabalho)<input type="date" className={input} value={form.cycleStartDate ?? ''} onChange={(event) => set('cycleStartDate', event.target.value)} /></label>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.isNightShift)} onChange={(event) => set('isNightShift', event.target.checked)} /> Turno noturno (adicional e hora reduzida)</label>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!String(form.name ?? '').trim()}>Salvar escala</Button></div>
      </form>
    </Modal>
  );
}

function SchedulesPanel({ canEdit, onLaunch }: { canEdit: boolean; onLaunch: () => void }) {
  const list = useQuery(() => hubApi.schedules(), []);
  const [editing, setEditing] = useState<ScheduleTemplate | 'new' | null>(null);
  const rows = (list.data ?? []).filter((item) => item.status === 'ACTIVE');

  return (
    <Section title="Modelos de escala" description="Defina uma vez e atribua a quem precisar. Alterar um modelo vale para todos que o usam."
      actions={<div className="flex gap-2">{<Button variant="outline" onClick={onLaunch}>Lançar escala</Button>}{canEdit && <Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Nova escala</Button>}</div>}>
      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {list.loading && !list.data ? <LoadingState label="Carregando escalas…" /> : rows.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-fg-sub">Nenhuma escala criada. {canEdit ? 'Crie a primeira em "Nova escala".' : ''}</p> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-fg-sub">{item.scaleType}{item.entryTime ? ` · ${item.entryTime}–${item.exitTime}` : ''}{item.isNightShift ? ' · noturno' : ''}</p>
                <p className="mt-1 text-xs text-fg-sub">Trabalha: {item.workDays.map((day) => WEEKDAYS[day]).join(', ') || '—'}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="btn-icon" aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><Pencil size={15} /></button>
                  <button type="button" className="btn-icon text-rose-600" aria-label={`Arquivar ${item.name}`} onClick={async () => { try { await hubApi.archiveSchedule(item.id); toast.success('Escala arquivada.'); list.refetch(); } catch (cause) { toast.error(errorMessage(cause, 'Falha ao arquivar.')); } }}><Archive size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ScheduleEditor item={editing} onClose={() => setEditing(null)} onSaved={list.refetch} />
    </Section>
  );
}

// ─── Regras de ponto + cercas ──────────────────────────────────────
function simulate(policy: PunchPolicy, distance: number, accuracy: number, radius: number) {
  if (accuracy > policy.maxAccuracyMeters) return { tone: 'bad', text: `Rejeitado: precisão do GPS (${accuracy} m) acima do máximo (${policy.maxAccuracyMeters} m). O funcionário precisa tentar de novo.` };
  if (policy.fencePolicy === 'OFF' || distance <= radius) return { tone: 'good', text: 'Aceito normalmente.' };
  if (policy.fencePolicy === 'BLOCK') return { tone: 'bad', text: `Bloqueado: ${distance} m do local (raio ${radius} m). O funcionário precisa bater o ponto no local.` };
  return { tone: 'warn', text: `Aceito com pendência: ${distance} m do local (raio ${radius} m). ${policy.requireJustificationOutside ? 'Pede justificativa e ' : ''}vai para aprovação do gestor/RH.` };
}

function PolicyPanel() {
  const policy = useQuery(() => hubApi.policy(), []);
  const [form, setForm] = useState<PunchPolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState({ distance: 220, accuracy: 30, radius: 150 });
  useEffect(() => { if (policy.data) setForm(policy.data); }, [policy.data]);
  if (!form) return <Section title="Regras de ponto">{policy.error ? <ErrorState message={policy.error} onRetry={policy.refetch} /> : <LoadingState label="Carregando…" />}</Section>;

  const set = <K extends keyof PunchPolicy>(key: K, value: PunchPolicy[K]) => setForm((current) => (current ? { ...current, [key]: value } : current));
  const result = simulate(form, sim.distance, sim.accuracy, sim.radius);

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const { configured, ...body } = form;
      void configured;
      await hubApi.savePolicy(body); toast.success('Regras de ponto salvas.'); policy.refetch();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível salvar.')); }
    finally { setBusy(false); }
  }

  const num = (label: string, key: keyof PunchPolicy, hint: string, min = 0, max = 9999) => (
    <label className="space-y-1.5 text-sm font-medium">{label}<input type="number" min={min} max={max} className={input} value={Number(form[key])} onChange={(event) => set(key, Number(event.target.value) as never)} /><span className="block text-xs font-normal text-fg-sub">{hint}</span></label>
  );

  return (
    <Section title="Regras de ponto" description="Aplicadas no servidor a cada batida. A localização é sempre registrada; aqui você define o que acontece fora do local."
      actions={<Button isLoading={busy} onClick={save}>Salvar regras</Button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm md:col-span-2">
          <input type="checkbox" className="mt-1" checked={form.requireLocation} onChange={(event) => set('requireLocation', event.target.checked)} />
          <span><strong>Exigir localização para bater o ponto</strong><span className="block text-xs text-fg-sub">Sem GPS ativo o funcionário não consegue registrar. Desmarque para trabalho remoto sem controle de local.</span></span>
        </label>
        <label className="space-y-1.5 text-sm font-medium md:col-span-2">Fora do local de trabalho
          <select className={input} value={form.fencePolicy} onChange={(event) => set('fencePolicy', event.target.value as PunchPolicy['fencePolicy'])}>
            <option value="FLAG">Aceitar com justificativa e enviar para aprovação (recomendado)</option>
            <option value="BLOCK">Bloquear: só permite bater no local</option>
            <option value="OFF">Ignorar a cerca (somente registrar a localização)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.requireJustificationOutside} onChange={(event) => set('requireJustificationOutside', event.target.checked)} /> Exigir justificativa quando bater fora do local</label>
        {num('Precisão máxima do GPS (m)', 'maxAccuracyMeters', 'Acima disso a batida é recusada.', 10, 5000)}
        {num('Intervalo mínimo entre batidas (s)', 'minIntervalSeconds', 'Evita toques duplicados.', 0, 3600)}
        {num('Máximo de batidas por dia', 'maxPunchesPerDay', 'Entrada, intervalo e saída = 4.', 2, 12)}
        {num('Prazo para pedir ajuste (dias)', 'adjustmentDeadlineDays', 'Depois disso só o RH ajusta.', 0, 60)}
        {num('Velocidade máxima plausível (km/h)', 'maxSpeedKmh', 'Posição que "salta" mais rápido é sinalizada.', 30, 1200)}
      </div>

      <div className="rounded-xl bg-bg-sub p-4">
        <p className="mb-3 text-sm font-semibold">Simulador — o que acontece se…</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([['distance', 'Distância do local (m)'], ['accuracy', 'Precisão do GPS (m)'], ['radius', 'Raio da cerca (m)']] as const).map(([key, label]) => (
            <label key={key} className="space-y-1.5 text-xs font-medium">{label}<input type="number" min={0} className={input} value={sim[key]} onChange={(event) => setSim({ ...sim, [key]: Number(event.target.value) })} /></label>
          ))}
        </div>
        <p className={`mt-3 rounded-lg p-3 text-sm ${result.tone === 'good' ? 'bg-emerald-50 text-emerald-800' : result.tone === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-rose-50 text-rose-800'}`}>{result.text}</p>
      </div>
    </Section>
  );
}

function GeofencesPanel() {
  const fences = useQuery(() => hubApi.geofences(), []);
  const [editing, setEditing] = useState<Geofence | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '150' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!editing) return;
    setForm(editing === 'new' ? { name: '', latitude: '', longitude: '', radiusMeters: '150' } : { name: editing.name, latitude: String(editing.latitude), longitude: String(editing.longitude), radiusMeters: String(editing.radiusMeters) });
  }, [editing]);

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (position) => setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) })),
      () => toast.error('Não foi possível obter sua localização.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function save() {
    setBusy(true);
    try {
      const body = { name: form.name.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude), radiusMeters: Number(form.radiusMeters), active: editing && editing !== 'new' ? editing.active : true };
      if (editing && editing !== 'new') await hubApi.updateGeofence(editing.id, body); else await hubApi.createGeofence(body);
      toast.success('Local salvo.'); setEditing(null); fences.refetch();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível salvar o local.')); }
    finally { setBusy(false); }
  }

  const valid = form.name.trim() && form.latitude && form.longitude && Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude));
  return (
    <Section title="Locais de trabalho (cercas)" description="Cada local tem um ponto no mapa e um raio. A batida dentro de qualquer um deles é considerada no local."
      actions={<Button onClick={() => setEditing('new')}><Plus size={16} aria-hidden="true" /> Novo local</Button>}>
      {fences.error && <ErrorState message={fences.error} onRetry={fences.refetch} />}
      {(fences.data ?? []).length === 0 ? <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-fg-sub">Nenhum local cadastrado. Sem locais, o sistema usa o endereço da empresa quando houver; sem nenhum, a localização é só registrada.</p> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {(fences.data ?? []).map((fence) => (
            <li key={fence.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
              <div><p className="flex items-center gap-1.5 text-sm font-semibold"><MapPin size={14} aria-hidden="true" />{fence.name}</p><p className="text-xs text-fg-sub">{fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)} · raio {fence.radiusMeters} m{fence.active ? '' : ' · inativo'}</p></div>
              <div className="flex gap-1">
                <button type="button" className="btn-icon" aria-label={`Editar ${fence.name}`} onClick={() => setEditing(fence)}><Pencil size={15} /></button>
                <button type="button" className="btn-icon text-rose-600" aria-label={`Excluir ${fence.name}`} onClick={async () => { try { await hubApi.deleteGeofence(fence.id); toast.success('Local removido.'); fences.refetch(); } catch (cause) { toast.error(errorMessage(cause, 'Falha ao remover.')); } }}><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={Boolean(editing)} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? 'Novo local' : 'Editar local'}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (valid) void save(); }}>
          <label className="block space-y-1.5 text-sm font-medium">Nome *<input className={input} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Matriz, Obra Centro" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm font-medium">Latitude *<input className={input} inputMode="decimal" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} /></label>
            <label className="space-y-1.5 text-sm font-medium">Longitude *<input className={input} inputMode="decimal" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} /></label>
          </div>
          <Button variant="outline" size="sm" onClick={useMyLocation}><MapPin size={14} aria-hidden="true" /> Usar minha localização atual</Button>
          <label className="block space-y-1.5 text-sm font-medium">Raio (metros)<input type="number" min={20} max={5000} className={input} value={form.radiusMeters} onChange={(event) => setForm({ ...form, radiusMeters: event.target.value })} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!valid}>Salvar</Button></div>
        </form>
      </Modal>
    </Section>
  );
}

// ─── Regras de jornada (CLT) ───────────────────────────────────────
const RULE_FIELDS: { key: string; label: string; hint: string; type?: 'time' }[] = [
  { key: 'dailyMinutes', label: 'Jornada diária (min)', hint: '480 = 8h' },
  { key: 'weeklyMinutes', label: 'Jornada semanal (min)', hint: '2640 = 44h' },
  { key: 'breakMinutes', label: 'Intervalo padrão (min)', hint: 'Mínimo de 60 para jornadas acima de 6h' },
  { key: 'lateToleranceMinutes', label: 'Tolerância de atraso (min)', hint: 'CLT: até 10 min por dia' },
  { key: 'earlyLeaveToleranceMinutes', label: 'Tolerância de saída antecipada (min)', hint: '' },
  { key: 'overtimeToleranceMinutes', label: 'Tolerância de hora extra (min)', hint: '' },
  { key: 'maxDailyOvertimeMinutes', label: 'Limite de HE por dia (min)', hint: 'CLT: 120' },
  { key: 'maxMonthlyOvertimeMinutes', label: 'Limite de HE por mês (min)', hint: '' },
  { key: 'normalOvertimePercent', label: 'Adicional de HE (%)', hint: 'Mínimo 50' },
  { key: 'holidayOvertimePercent', label: 'Adicional em domingo/feriado (%)', hint: 'Normalmente 100' },
  { key: 'nightShiftPercent', label: 'Adicional noturno (%)', hint: 'Mínimo 20' },
];

function RulesPanel() {
  const rules = useQuery(() => hubApi.timeRules(), []);
  const active = useMemo(() => (rules.data ?? []).find((rule) => rule.status === 'ACTIVE') ?? (rules.data ?? [])[0] ?? null, [rules.data]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(active ?? { name: 'Regra padrão', dailyMinutes: 480, weeklyMinutes: 2640, breakMinutes: 60, lateToleranceMinutes: 10, earlyLeaveToleranceMinutes: 10, overtimeToleranceMinutes: 5, maxDailyOvertimeMinutes: 120, maxMonthlyOvertimeMinutes: 2400, normalOvertimePercent: 50, holidayOvertimePercent: 100, nightShiftPercent: 20, status: 'ACTIVE' }); }, [active]);

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name: String(form.name ?? 'Regra padrão'), status: 'ACTIVE' };
      for (const field of RULE_FIELDS) body[field.key] = Number(form[field.key]);
      await hubApi.saveTimeRule(active?.id ?? null, body); toast.success('Regras de jornada salvas.'); rules.refetch();
    } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível salvar.')); }
    finally { setBusy(false); }
  }

  return (
    <Section title="Regras de jornada e horas extras" description="Base do cálculo de atrasos, horas extras e adicional noturno do ponto." actions={<Button isLoading={busy} onClick={save}>Salvar</Button>}>
      {rules.error && <ErrorState message={rules.error} onRetry={rules.refetch} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RULE_FIELDS.map((field) => (
          <label key={field.key} className="space-y-1.5 text-sm font-medium">{field.label}<input type="number" min={0} className={input} value={form[field.key] ?? ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />{field.hint && <span className="block text-xs font-normal text-fg-sub">{field.hint}</span>}</label>
        ))}
      </div>
    </Section>
  );
}

export function ModelsView({ overview, onLaunch }: { overview: Overview; onLaunch: () => void }) {
  const role = overview.role;
  const [tab, setTab] = useState<'escalas' | 'ponto' | 'jornada'>('escalas');
  const canPolicy = can(role, 'policy.write');
  const tabs = [['escalas', 'Escalas'], ...(canPolicy ? [['ponto', 'Regras de ponto e locais'], ['jornada', 'Jornada e horas extras']] : [])] as ['escalas' | 'ponto' | 'jornada', string][];

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === id ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>{label}</button>)}
        </div>
      )}
      {tab === 'escalas' && <SchedulesPanel canEdit={canPolicy} onLaunch={onLaunch} />}
      {tab === 'ponto' && canPolicy && <><PolicyPanel /><GeofencesPanel /></>}
      {tab === 'jornada' && canPolicy && <RulesPanel />}
    </div>
  );
}
