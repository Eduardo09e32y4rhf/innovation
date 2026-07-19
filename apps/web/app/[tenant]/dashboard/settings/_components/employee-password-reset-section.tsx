'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Search,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { api, PasswordResetEmployee } from '@/app/lib/api';

const MIN_PASSWORD_LENGTH = 10;

export function EmployeePasswordResetSection() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PasswordResetEmployee[]>([]);
  const [selected, setSelected] =
    useState<PasswordResetEmployee | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (normalizedSearch.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setError('');

      try {
        const employees =
          await api.auth.searchEmployeesForPasswordReset(
            normalizedSearch,
          );

        setResults(employees);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível buscar os funcionários.',
        );
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const passwordErrors: string[] = [];

  if (
    newPassword &&
    newPassword.length < MIN_PASSWORD_LENGTH
  ) {
    passwordErrors.push(
      `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`,
    );
  }

  if (newPassword && !/[A-Z]/.test(newPassword)) {
    passwordErrors.push('Inclua uma letra maiúscula');
  }

  if (newPassword && !/[a-z]/.test(newPassword)) {
    passwordErrors.push('Inclua uma letra minúscula');
  }

  if (newPassword && !/[0-9]/.test(newPassword)) {
    passwordErrors.push('Inclua um número');
  }

  if (
    newPassword &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(
      newPassword,
    )
  ) {
    passwordErrors.push('Inclua um caractere especial');
  }

  const valid =
    Boolean(selected) &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    passwordErrors.length === 0;

  async function resetPassword() {
    if (!selected || !valid) return;

    const confirmed = window.confirm(
      `Redefinir a senha de ${selected.name}?\n\nO funcionário será obrigado a criar uma nova senha no próximo acesso.`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.auth.resetEmployeePassword(
        selected.id,
        newPassword,
      );

      setSuccess(
        `Senha de ${selected.name} redefinida com sucesso.`,
      );

      setSearch('');
      setResults([]);
      setSelected(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível redefinir a senha.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <KeyRound size={19} />
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950">
              Redefinir senha de funcionário
            </h3>

            <p className="text-xs font-medium text-slate-500">
              Busque pelo nome ou pela matrícula.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={15} />
            {success}
          </div>
        )}

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelected(null);
              setSuccess('');
            }}
            placeholder="Digite o nome ou a matrícula..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          />
        </div>

        {searching && (
          <p className="text-xs font-semibold text-slate-500">
            Buscando funcionários...
          </p>
        )}

        {!searching && results.length > 0 && !selected && (
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {results.map((employee) => (
              <button
                type="button"
                key={employee.id}
                onClick={() => {
                  setSelected(employee);
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">
                    {employee.name}
                  </p>

                  <p className="truncate text-xs font-medium text-slate-500">
                    Matrícula: {employee.registration || 'Não informada'}
                    {employee.position
                      ? ` • ${employee.position}`
                      : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">
                Funcionário selecionado
              </p>

              <p className="mt-1 text-sm font-black text-slate-950">
                {selected.name}
              </p>

              <p className="text-xs font-medium text-slate-500">
                Matrícula: {selected.registration || 'Não informada'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                label="Senha temporária"
                value={newPassword}
                show={showPassword}
                onChange={setNewPassword}
                onToggle={() =>
                  setShowPassword((current) => !current)
                }
              />

              <PasswordField
                label="Confirmar senha"
                value={confirmPassword}
                show={showPassword}
                onChange={setConfirmPassword}
                onToggle={() =>
                  setShowPassword((current) => !current)
                }
              />
            </div>

            {passwordErrors.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                {passwordErrors.map((item) => (
                  <p
                    key={item}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-800"
                  >
                    <ShieldAlert size={13} />
                    {item}
                  </p>
                ))}
              </div>
            )}

            {confirmPassword &&
              newPassword !== confirmPassword && (
                <p className="text-xs font-bold text-rose-600">
                  As senhas não coincidem.
                </p>
              )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!valid || saving}
                onClick={resetPassword}
                className="h-10 rounded-xl bg-violet-600 px-5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Redefinindo...'
                  : 'Redefinir senha do funcionário'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSearch('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              O funcionário deverá criar uma senha pessoal no
              próximo acesso.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-11 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
