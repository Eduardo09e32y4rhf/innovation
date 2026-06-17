"use client";

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  Pencil,
  Plus,
  Save,
  Search,
  TimerReset,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

type PunchStatus = 'Completo' | 'Atraso' | 'Ajuste' | 'Domingo/Feriado';

type PunchForm = {
  date: string;
  person: string;
  role: string;
  salary: string;
  holiday: boolean;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  note: string;
};

type PunchCalc = {
  totalMinutes: number;
  balanceMinutes: number;
  nightReducedMinutes: number;
  normalNightReducedMinutes: number;
  extraDay50Minutes: number;
  extraNight50Minutes: number;
  extraDay100Minutes: number;
  extraNight100Minutes: number;
  additionalValue: number;
  hourlyRate: number;
  status: PunchStatus;
};

type PunchRecord = PunchForm & PunchCalc & { id: string };

const DAILY_TARGET_MINUTES = 8 * 60 + 48;
const NIGHT_START = 22 * 60;
const NIGHT_END = 5 * 60;
const NIGHT_REDUCED_FACTOR = 60 / 52.5;
const MONTHLY_HOURS = 220;

const people = [
  { name: 'Eduardo Silva', role: 'RH' },
  { name: 'Marina Costa', role: 'Candidata / admissao' },
  { name: 'Renan Alves', role: 'Colaborador' },
  { name: 'Bianca Rocha', role: 'Colaboradora' },
];

const emptyForm: PunchForm = {
  date: new Date().toISOString().slice(0, 10),
  person: people[0].name,
  role: people[0].role,
  salary: '2200',
  holiday: false,
  entry1: '08:00',
  exit1: '12:00',
  entry2: '13:00',
  exit2: '18:00',
  note: '',
};

const initialRecords: PunchRecord[] = [
  buildRecord({ ...emptyForm, date: '2026-06-03', entry1: '08:04', exit1: '12:01', entry2: '13:05', exit2: '18:02' }),
  buildRecord({ ...emptyForm, date: '2026-06-04', entry1: '08:12', exit1: '12:03', entry2: '13:02', exit2: '18:11', note: 'Atraso justificado pelo RH.' }),
  buildRecord({ ...emptyForm, date: '2026-06-07', person: 'Renan Alves', role: 'Colaborador', holiday: true, entry1: '20:00', exit1: '23:30', entry2: '00:00', exit2: '03:00', note: 'Plantao em descanso semanal.' }),
];

export default function PontoPage() {
  const [records, setRecords] = useState<PunchRecord[]>(initialRecords);
  const [form, setForm] = useState<PunchForm>(emptyForm);
  const [personFilter, setPersonFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [businessDays, setBusinessDays] = useState('25');
  const [restDays, setRestDays] = useState('5');
  const [feedback, setFeedback] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const preview = useMemo(() => calculatePunch(form), [form]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records
      .filter((record) => personFilter === 'Todos' || record.person === personFilter)
      .filter((record) => {
        if (!query) return true;
        return [record.person, record.role, record.date, record.status, record.note].join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => `${right.date}-${right.id}`.localeCompare(`${left.date}-${left.id}`));
  }, [personFilter, records, search]);

  const totals = useMemo(() => {
    const totalMinutes = filteredRecords.reduce((sum, record) => sum + record.totalMinutes, 0);
    const balanceMinutes = filteredRecords.reduce((sum, record) => sum + record.balanceMinutes, 0);
    const extra50Minutes = filteredRecords.reduce((sum, record) => sum + record.extraDay50Minutes + record.extraNight50Minutes, 0);
    const extra100Minutes = filteredRecords.reduce((sum, record) => sum + record.extraDay100Minutes + record.extraNight100Minutes, 0);
    const nightMinutes = filteredRecords.reduce((sum, record) => sum + record.nightReducedMinutes, 0);
    const additionalValue = filteredRecords.reduce((sum, record) => sum + record.additionalValue, 0);
    const dsrValue = calculateDsr(additionalValue, Number(businessDays), Number(restDays));

    return { totalMinutes, balanceMinutes, extra50Minutes, extra100Minutes, nightMinutes, additionalValue, dsrValue };
  }, [businessDays, filteredRecords, restDays]);

  const personTotals = useMemo(() => {
    return people.map((person) => {
      const personRecords = records.filter((record) => record.person === person.name);
      return {
        ...person,
        records: personRecords.length,
        totalMinutes: personRecords.reduce((sum, record) => sum + record.totalMinutes, 0),
        balanceMinutes: personRecords.reduce((sum, record) => sum + record.balanceMinutes, 0),
      };
    });
  }, [records]);

  const summaryCards = [
    { label: 'Horas lancadas', value: formatMinutes(totals.totalMinutes), detail: `${filteredRecords.length} registros no geral`, icon: Clock3, tone: 'teal' },
    { label: 'Banco de horas', value: formatSignedMinutes(totals.balanceMinutes), detail: 'saldo automatico filtrado', icon: TimerReset, tone: 'cyan' },
    { label: 'Extras calculadas', value: formatMinutes(totals.extra50Minutes + totals.extra100Minutes), detail: `${formatMinutes(totals.extra50Minutes)} 50% / ${formatMinutes(totals.extra100Minutes)} 100%`, icon: AlertTriangle, tone: 'amber' },
    { label: 'DSR estimado', value: formatMoney(totals.dsrValue), detail: `sobre ${formatMoney(totals.additionalValue)} em adicionais`, icon: CheckCircle2, tone: 'emerald' },
  ];

  const updatePerson = (personName: string) => {
    const person = people.find((item) => item.name === personName);
    setForm((current) => ({ ...current, person: personName, role: person?.role ?? current.role }));
  };

  const saveRecord = () => {
    if (!form.date || !form.person || !form.entry1 || !form.exit1 || !form.entry2 || !form.exit2) {
      setFeedback('Preencha pessoa, data e todos os horarios antes de salvar.');
      return;
    }

    const record = editingId ? buildRecordWithId(editingId, form) : buildRecord(form);
    if (record.totalMinutes <= 0) {
      setFeedback('Os horarios informados nao formam uma jornada valida.');
      return;
    }

    setRecords((current) => (editingId ? current.map((item) => (item.id === editingId ? record : item)) : [record, ...current]));
    setFeedback(`${editingId ? 'Lancamento atualizado' : 'Lancamento salvo'} para ${record.person}: ${formatMinutes(record.totalMinutes)} trabalhadas.`);
    setEditingId(null);
    setForm((current) => ({ ...emptyForm, person: current.person, role: current.role, salary: current.salary, date: current.date }));
  };

  const editRecord = (record: PunchRecord) => {
    setEditingId(record.id);
    setForm({
      date: record.date,
      person: record.person,
      role: record.role,
      salary: record.salary,
      holiday: record.holiday,
      entry1: record.entry1,
      exit1: record.exit1,
      entry2: record.entry2,
      exit2: record.exit2,
      note: record.note,
    });
    setFeedback(`Editando lancamento de ${record.person} em ${formatDate(record.date)}.`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFeedback('');
  };

  const deleteRecord = (record: PunchRecord) => {
    const confirmed = window.confirm(`Excluir o lancamento de ${record.person} em ${formatDate(record.date)}?`);
    if (!confirmed) return;
    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (editingId === record.id) cancelEdit();
    setFeedback(`Lancamento excluido: ${record.person} em ${formatDate(record.date)}.`);
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="crystal-dark hero-crystal relative overflow-hidden rounded-[22px] px-7 py-7 text-white">
          <div className="absolute right-0 top-0 h-56 w-72 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.28),transparent_56%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-200">
                <FileClock size={19} strokeWidth={1.8} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Ponto eletronico</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Espelho de ponto</h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
                Lancamento manual com calculo automatico de hora extra, adicional noturno, hora reduzida e DSR.
              </p>
            </div>
            <button className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-950 shadow-lg">
              <Download size={14} />
              Exportar geral
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="ops-card rounded-[18px] border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{card.detail}</p>
                  </div>
                  <div className={`icon-chip icon-chip-${card.tone}`}>
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[410px_1fr]">
          <aside className="space-y-5">
            <section className="ops-card rounded-[18px] border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Plus size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-950">Lancamento manual</h2>
                  <p className="text-xs font-semibold text-slate-500">{editingId ? 'Altere os dados e atualize o registro.' : 'O RH informa os horarios; o sistema calcula.'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Pessoa</span>
                  <select value={form.person} onChange={(event) => updatePerson(event.target.value)} className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950">
                    {people.map((person) => (
                      <option key={person.name} value={person.name}>{person.name}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Data" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} />
                  <Field label="Salario" type="number" value={form.salary} onChange={(value) => setForm((current) => ({ ...current, salary: value }))} />
                  <Field label="Funcao" value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value }))} />
                  <label className="flex h-[68px] items-end gap-2 rounded-[14px] border border-slate-300 bg-white px-3 pb-3 text-sm font-black text-slate-700">
                    <input type="checkbox" checked={form.holiday} onChange={(event) => setForm((current) => ({ ...current, holiday: event.target.checked }))} />
                    Feriado/folga
                  </label>
                  <Field label="Entrada" type="time" value={form.entry1} onChange={(value) => setForm((current) => ({ ...current, entry1: value }))} />
                  <Field label="Saida almoco" type="time" value={form.exit1} onChange={(value) => setForm((current) => ({ ...current, exit1: value }))} />
                  <Field label="Retorno" type="time" value={form.entry2} onChange={(value) => setForm((current) => ({ ...current, entry2: value }))} />
                  <Field label="Saida final" type="time" value={form.exit2} onChange={(value) => setForm((current) => ({ ...current, exit2: value }))} />
                </div>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Observacao</span>
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    rows={3}
                    className="w-full resize-none rounded-[14px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950"
                    placeholder="Ex.: ajuste aprovado, atestado, esquecimento..."
                  />
                </label>

                <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <PreviewMetric label="Hora base" value={formatMoney(preview.hourlyRate)} />
                    <PreviewMetric label="Total" value={formatMinutes(preview.totalMinutes)} />
                    <PreviewMetric label="Saldo" value={formatSignedMinutes(preview.balanceMinutes)} />
                    <PreviewMetric label="Noturna reduzida" value={formatMinutes(preview.nightReducedMinutes)} />
                    <PreviewMetric label="Extra 50%" value={formatMinutes(preview.extraDay50Minutes + preview.extraNight50Minutes)} />
                    <PreviewMetric label="Extra 100%" value={formatMinutes(preview.extraDay100Minutes + preview.extraNight100Minutes)} />
                  </div>
                  <div className="mt-3 rounded-[14px] bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Adicionais estimados</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{formatMoney(preview.additionalValue)}</p>
                  </div>
                </div>

                {feedback ? <p className="rounded-[14px] border border-teal-200 bg-teal-50 p-3 text-xs font-black text-teal-900">{feedback}</p> : null}

                <div className="flex gap-2">
                  <button onClick={saveRecord} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_14px_30px_rgba(2,6,23,0.22)]">
                    <Save size={15} />
                    {editingId ? 'Atualizar lancamento' : 'Salvar lancamento'}
                  </button>
                  {editingId ? (
                    <button onClick={cancelEdit} className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-300 bg-white text-slate-700 hover:border-slate-950">
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="ops-card rounded-[18px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <UserCheck size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-950">Resumo por pessoa</h2>
                  <p className="text-xs font-semibold text-slate-500">Clique para filtrar o geral</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {personTotals.map((person) => (
                  <button key={person.name} onClick={() => setPersonFilter(person.name)} className="w-full rounded-[14px] border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-950">{person.name}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{person.records} registro(s) / {formatMinutes(person.totalMinutes)}</p>
                      </div>
                      <span className={`text-xs font-black ${person.balanceMinutes >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatSignedMinutes(person.balanceMinutes)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="ops-card overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">Lancamento geral</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Valores calculados com adicional noturno na base da hora extra.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none">
                  <option value="Todos">Todos</option>
                  {people.map((person) => (
                    <option key={person.name} value={person.name}>{person.name}</option>
                  ))}
                </select>
                <div className="flex h-10 min-w-[210px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                  <Search size={14} className="text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 lg:grid-cols-4">
              <DsrField label="Dias uteis" value={businessDays} onChange={setBusinessDays} />
              <DsrField label="Domingos/feriados" value={restDays} onChange={setRestDays} />
              <PreviewMetric label="Adicionais" value={formatMoney(totals.additionalValue)} />
              <PreviewMetric label="Reflexo DSR" value={formatMoney(totals.dsrValue)} />
            </div>

            <div className="overflow-x-auto px-5 py-4">
              <table className="w-full min-w-[1260px] text-left">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Pessoa</th>
                    <th className="pb-3 pr-4">Total</th>
                    <th className="pb-3 pr-4">Saldo</th>
                    <th className="pb-3 pr-4">Noturna red.</th>
                    <th className="pb-3 pr-4">HE 50%</th>
                    <th className="pb-3 pr-4">HE not. 50%</th>
                    <th className="pb-3 pr-4">HE 100%</th>
                    <th className="pb-3 pr-4">HE not. 100%</th>
                    <th className="pb-3 pr-4">Valor adicionais</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{formatDate(record.date)}</td>
                      <td className="py-3 pr-4 text-xs">
                        <p className="font-black text-slate-950">{record.person}</p>
                        <p className="mt-0.5 font-semibold text-slate-500">{record.role}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{formatMinutes(record.totalMinutes)}</td>
                      <td className={`py-3 pr-4 text-xs font-black ${record.balanceMinutes >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatSignedMinutes(record.balanceMinutes)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatMinutes(record.nightReducedMinutes)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatMinutes(record.extraDay50Minutes)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatMinutes(record.extraNight50Minutes)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatMinutes(record.extraDay100Minutes)}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-700">{formatMinutes(record.extraNight100Minutes)}</td>
                      <td className="py-3 pr-4 text-xs font-black text-slate-950">{formatMoney(record.additionalValue)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => editRecord(record)} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-700 transition hover:border-slate-950" title="Alterar lancamento">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteRecord(record)} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-500" title="Excluir lancamento">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredRecords.length ? (
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                  Nenhum lancamento encontrado para o filtro atual.
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="h-11 w-full rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-950" />
    </label>
  );
}

function DsrField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type="number" min="0" className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 outline-none focus:border-slate-950" />
    </label>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function buildRecord(form: PunchForm): PunchRecord {
  return {
    id: `${form.date}-${form.person}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...form,
    ...calculatePunch(form),
  };
}

function buildRecordWithId(id: string, form: PunchForm): PunchRecord {
  return {
    id,
    ...form,
    ...calculatePunch(form),
  };
}

function calculatePunch(form: PunchForm): PunchCalc {
  const salary = Number(form.salary) || 0;
  const hourlyRate = salary / MONTHLY_HOURS;
  const intervals = buildIntervals(form);
  const totalMinutes = intervals.reduce((sum, interval) => sum + Math.max(0, interval.end - interval.start), 0);
  const isRestDay = form.holiday || isSunday(form.date);
  let regularRemaining = isRestDay ? 0 : DAILY_TARGET_MINUTES;

  const totals = {
    normalDayMinutes: 0,
    normalNightReducedMinutes: 0,
    extraDay50Minutes: 0,
    extraNight50Minutes: 0,
    extraDay100Minutes: 0,
    extraNight100Minutes: 0,
  };

  intervals.flatMap(splitIntervalByNight).forEach((chunk) => {
    const actualMinutes = chunk.end - chunk.start;
    const paidMinutes = chunk.isNight ? actualMinutes * NIGHT_REDUCED_FACTOR : actualMinutes;

    if (isRestDay) {
      if (chunk.isNight) totals.extraNight100Minutes += paidMinutes;
      else totals.extraDay100Minutes += paidMinutes;
      return;
    }

    const regularActual = Math.min(regularRemaining, actualMinutes);
    const extraActual = actualMinutes - regularActual;
    regularRemaining -= regularActual;

    if (regularActual > 0) {
      if (chunk.isNight) totals.normalNightReducedMinutes += regularActual * NIGHT_REDUCED_FACTOR;
      else totals.normalDayMinutes += regularActual;
    }

    if (extraActual > 0) {
      if (chunk.isNight) totals.extraNight50Minutes += extraActual * NIGHT_REDUCED_FACTOR;
      else totals.extraDay50Minutes += extraActual;
    }
  });

  const normalNightValue = (totals.normalNightReducedMinutes / 60) * hourlyRate * 0.2;
  const extraDay50Value = (totals.extraDay50Minutes / 60) * hourlyRate * 1.5;
  const extraNight50Value = (totals.extraNight50Minutes / 60) * hourlyRate * 1.8;
  const extraDay100Value = (totals.extraDay100Minutes / 60) * hourlyRate * 2;
  const extraNight100Value = (totals.extraNight100Minutes / 60) * hourlyRate * 2.4;
  const status = isRestDay ? 'Domingo/Feriado' : form.note.trim() ? 'Ajuste' : toMinutes(form.entry1) > toMinutes('08:10') ? 'Atraso' : 'Completo';

  return {
    totalMinutes,
    balanceMinutes: isRestDay ? totalMinutes : totalMinutes - DAILY_TARGET_MINUTES,
    nightReducedMinutes: totals.normalNightReducedMinutes + totals.extraNight50Minutes + totals.extraNight100Minutes,
    normalNightReducedMinutes: totals.normalNightReducedMinutes,
    extraDay50Minutes: Math.round(totals.extraDay50Minutes),
    extraNight50Minutes: Math.round(totals.extraNight50Minutes),
    extraDay100Minutes: Math.round(totals.extraDay100Minutes),
    extraNight100Minutes: Math.round(totals.extraNight100Minutes),
    additionalValue: normalNightValue + extraDay50Value + extraNight50Value + extraDay100Value + extraNight100Value,
    hourlyRate,
    status,
  };
}

function buildIntervals(form: PunchForm) {
  return [
    normalizeInterval(form.entry1, form.exit1),
    normalizeInterval(form.entry2, form.exit2),
  ].filter((interval) => interval.end > interval.start);
}

function normalizeInterval(startValue: string, endValue: string) {
  const start = toMinutes(startValue);
  let end = toMinutes(endValue);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

function splitIntervalByNight(interval: { start: number; end: number }) {
  const chunks: Array<{ start: number; end: number; isNight: boolean }> = [];
  for (let cursor = interval.start; cursor < interval.end;) {
    const dayOffset = Math.floor(cursor / (24 * 60)) * 24 * 60;
    const points = [
      dayOffset + NIGHT_END,
      dayOffset + NIGHT_START,
      dayOffset + 24 * 60 + NIGHT_END,
      interval.end,
    ].filter((point) => point > cursor).sort((left, right) => left - right);
    const next = Math.min(points[0] ?? interval.end, interval.end);
    chunks.push({ start: cursor, end: next, isNight: isNightMinute(cursor) });
    cursor = next;
  }
  return chunks;
}

function isNightMinute(minute: number) {
  const normalized = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
  return normalized >= NIGHT_START || normalized < NIGHT_END;
}

function isSunday(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() === 0;
}

function calculateDsr(additionalValue: number, businessDays: number, restDays: number) {
  if (!businessDays || businessDays <= 0 || !restDays || restDays <= 0) return 0;
  return (additionalValue / businessDays) * restDays;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function formatMinutes(total: number) {
  const safeTotal = Math.round(Math.abs(total));
  const hours = Math.floor(safeTotal / 60);
  const minutes = safeTotal % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatSignedMinutes(total: number) {
  return `${total >= 0 ? '+' : '-'}${formatMinutes(total)}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function statusClass(status: PunchStatus) {
  if (status === 'Completo') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Atraso') return 'bg-amber-100 text-amber-900';
  if (status === 'Domingo/Feriado') return 'bg-violet-100 text-violet-800';
  return 'bg-sky-100 text-sky-800';
}
