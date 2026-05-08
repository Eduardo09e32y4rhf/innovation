import type { ReactNode } from 'react';

export function SettingsHero({
  eyebrow = 'Control plane',
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="crystal-dark hero-crystal relative overflow-hidden rounded-[16px] px-6 py-6 text-white">
      <div className="absolute right-0 top-0 h-48 w-72 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.34),transparent_56%)]" />
      <div className="absolute right-32 top-[-56px] h-52 w-52 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.25),transparent_58%)]" />
      <div className="relative flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-2 max-w-xl text-xs text-slate-300">{description}</p>
        </div>
        <span className="rounded-lg border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[10px] font-black text-teal-100">
          Supabase ativo
        </span>
      </div>
    </section>
  );
}

export function SettingsPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="settings-panel overflow-hidden rounded-[16px] border border-slate-300 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  defaultValue,
}: {
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-800">{label}</span>
      <input
        defaultValue={defaultValue}
        className="h-9 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-xs text-slate-900 shadow-inner outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}
