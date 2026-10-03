import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Modal } from '@/app/components/ui';
import { ROLE_LABEL } from '@/app/lib/format';
import type { CreateUserInput, PlatformCompany, UserRole } from '@/app/lib/api';
import { PasswordField, PasswordPolicy, isStrongPassword } from './password-field';
import { AccessConfirmDialog } from './access-confirm-dialog';
import { useAccessOverlay } from './use-access-overlay';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: UserRole[];
  currentRole?: string;
  companies: PlatformCompany[];
  onSubmit: (data: CreateUserInput) => Promise<void>;
}

export function UserCreateModal({ isOpen, onClose, availableRoles, currentRole, companies, onSubmit }: UserCreateModalProps) {
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const [done, setDone] = useState(false);
  const [createdName, setCreatedName] = useState('');
  const [discard, setDiscard] = useState(false);
  const policyId = useId();
  const resolvedCompanyId = companies.length === 1 ? companies[0].id : companyId;
  const selectedCompany = companies.find(company => company.id === resolvedCompanyId);
  function reset() {
    setCompanyId(''); setName(''); setEmail(''); setRole('FUNCIONARIO');
    setPassword(''); setConfirmation(''); setError(''); setEmailError(''); setDone(false); setDiscard(false);
  }
  useEffect(() => { if (!isOpen) reset(); }, [isOpen]);
  function close() {
    if (busy.current) return;
    if (!done && (name || email || password || confirmation || companyId)) setDiscard(true);
    else { reset(); onClose(); }
  }
  const ref = useAccessOverlay(isOpen && !discard, close, done ? 'Usuário criado' : 'Novo usuário');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError(''); setEmailError('');
    if (currentRole === 'DEV' && !resolvedCompanyId) { setError('Selecione uma empresa antes de criar o acesso.'); return; }
    if (!name.trim() || !email.trim() || !availableRoles.includes(role)) { setError('Revise o nome, o e-mail e o perfil.'); return; }
    if (!isStrongPassword(password)) { setError('A senha deve atender a todos os requisitos abaixo.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    busy.current = true; setLoading(true);
    try {
      await onSubmit({ ...(currentRole === 'DEV' ? { companyId: resolvedCompanyId } : {}), name: name.trim(), email: email.trim(), role, password });
      setCreatedName(name.trim()); setPassword(''); setConfirmation(''); setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar o usuário.';
      if (/e-mail|email|cadastrado|duplicado/i.test(message)) setEmailError(message);
      else setError(message);
    } finally { busy.current = false; setLoading(false); }
  }
  const fieldClass = 'input-v2 min-h-11 text-base sm:text-sm';
  return <>
    <div ref={ref}><Modal isOpen={isOpen && !discard} onClose={close} title={done ? 'Usuário criado' : 'Novo usuário'}
      description={done ? undefined : 'Defina a empresa, o perfil e uma senha temporária.'} maxWidth="max-w-xl">
      {done ? <div className="space-y-4">
        <CheckCircle2 size={32} aria-hidden="true" className="text-emerald-700" />
        <p role="status" className="text-sm text-fg"><strong>{createdName}</strong> foi cadastrado com sucesso.</p>
        <p className="text-sm text-fg-mut">A senha temporária foi definida e deverá ser trocada no primeiro login. Compartilhe as credenciais por um canal seguro.</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={close}>Fechar</Button>
          <Button type="button" onClick={reset}>Criar outro</Button>
        </div>
      </div> : <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl border border-border bg-bg-sub p-3 text-sm text-fg-mut">
          {selectedCompany ? `Empresa: ${selectedCompany.name}. ` : currentRole === 'DEV' ? 'Selecione a empresa do novo acesso. ' : 'O acesso pertence à empresa atual. '}
          Perfil: {ROLE_LABEL[role] ?? role}. Troca de senha obrigatória no primeiro login.
        </p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <fieldset disabled={loading} className="space-y-4">
          {currentRole === 'DEV' && companies.length !== 1 && <label className="block space-y-2 text-sm font-medium text-fg">
            <span>Empresa *</span>
            <select required value={companyId} onChange={event => setCompanyId(event.target.value)} className={fieldClass}>
              <option value="">Selecione a empresa</option>
              {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            {!companies.length && <span className="block text-sm text-fg-mut">Não há empresas disponíveis. Feche e atualize a lista para tentar novamente.</span>}
          </label>}
          <label className="block space-y-2 text-sm font-medium text-fg"><span>Nome completo *</span>
            <input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} className={fieldClass} />
          </label>
          <label className="block space-y-2 text-sm font-medium text-fg"><span>E-mail *</span>
            <input required type="email" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setEmailError(''); }}
              aria-invalid={!!emailError} aria-describedby={emailError ? 'create-email-error' : undefined} className={fieldClass} />
          </label>
          {emailError && <p id="create-email-error" role="alert" className="text-sm text-rose-700">{emailError}</p>}
          <label className="block space-y-2 text-sm font-medium text-fg"><span>Perfil de acesso *</span>
            <select value={role} onChange={event => setRole(event.target.value as UserRole)} className={fieldClass}>
              {availableRoles.map(value => <option key={value} value={value}>{ROLE_LABEL[value] ?? value}</option>)}
            </select>
          </label>
          {currentRole === 'DEV' && <p className="text-sm text-fg-mut">CEO, Contábil e Comercial são perfis internos da plataforma.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField label="Senha temporária" value={password} onChange={setPassword} disabled={loading} descriptionId={policyId} />
            <PasswordField label="Confirmar senha" value={confirmation} onChange={setConfirmation} disabled={loading}
              error={confirmation && password !== confirmation ? 'As senhas não coincidem.' : undefined} />
          </div>
          <PasswordPolicy password={password} id={policyId} />
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={close} disabled={loading}>Cancelar</Button>
          <Button type="submit" isLoading={loading} disabled={currentRole === 'DEV' && !resolvedCompanyId}>Criar usuário</Button>
        </div>
      </form>}
    </Modal></div>
    <AccessConfirmDialog isOpen={discard} onClose={() => setDiscard(false)} onConfirm={() => { reset(); onClose(); }}
      title="Descartar novo usuário?" description="Os dados digitados não serão salvos." confirmText="Descartar edição" />
  </>;
}
