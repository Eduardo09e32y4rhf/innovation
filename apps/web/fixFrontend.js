const fs = require('fs');

const file = 'C:/Users/eduar/Desktop/innovation.ia/apps/web/app/dashboard/platform/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update updateLicense signature
code = code.replace(
  "({ id, maxUsers, maxEmployees }: { id: string; maxUsers: number; maxEmployees: number }) =>",
  "({ id, maxUsers, maxEmployees, plan, billingStatus, trialEndsAt }: { id: string; maxUsers: number; maxEmployees: number; plan?: 'FREE' | 'STARTER' | 'PRO'; billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; trialEndsAt?: string }) =>"
);
code = code.replace(
  "api.platform.updateCompany(id, { maxUsers, maxEmployees }),",
  "api.platform.updateCompany(id, { maxUsers, maxEmployees, plan, billingStatus, trialEndsAt }),"
);

// 2. Table Headers
code = code.replace(
  '<th className="pb-3 pr-4">Assinatura</th>',
  '<th className="pb-3 pr-4">Plano</th><th className="pb-3 pr-4">Financeiro</th><th className="pb-3 pr-4">Criada em</th>'
);

// 3. Table Rows
code = code.replace(
  '<td className="py-3 pr-4">{formatDate(c.subscriptionStartedAt ?? c.createdAt)}</td>',
  `<td className="py-3 pr-4">
    <span className="inline-flex rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">{c.plan ?? 'FREE'}</span>
  </td>
  <td className="py-3 pr-4">
    <span className={\`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold \${c.billingStatus === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : c.billingStatus === 'TRIAL' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}\`}>
      {c.billingStatus ?? 'TRIAL'}
    </span>
  </td>
  <td className="py-3 pr-4">{formatDate(c.createdAt)}</td>`
);

// 4. Update LicenseModal call
code = code.replace(
  "onSave={(maxUsers, maxEmployees) => updateLicense.mutate({ id: licenseCompany.id, maxUsers, maxEmployees }).catch(() => {})}",
  "onSave={(maxUsers, maxEmployees, plan, billingStatus, trialEndsAt) => updateLicense.mutate({ id: licenseCompany.id, maxUsers, maxEmployees, plan, billingStatus, trialEndsAt }).catch(() => {})}"
);

// 5. Update LicenseModal definition
code = code.replace(
  "function LicenseModal({ company, onClose, onSave, loading, error }: { company: PlatformCompany; onClose: () => void; onSave: (maxUsers: number, maxEmployees: number) => void; loading: boolean; error: string | null }) {",
  "function LicenseModal({ company, onClose, onSave, loading, error }: { company: PlatformCompany; onClose: () => void; onSave: (maxUsers: number, maxEmployees: number, plan: any, billingStatus: any, trialEndsAt: string) => void; loading: boolean; error: string | null }) {"
);

const stateAndLogic = `  const [maxUsers, setMaxUsers] = useState(company.maxUsers);
  const [maxEmployees, setMaxEmployees] = useState(company.maxEmployees);
  const [plan, setPlan] = useState<any>(company.plan ?? 'FREE');
  const [billingStatus, setBillingStatus] = useState<any>(company.billingStatus ?? 'TRIAL');
  const [trialEndsAt, setTrialEndsAt] = useState(company.trialEndsAt ? new Date(company.trialEndsAt).toISOString().split('T')[0] : '');

  const changed = maxUsers !== company.maxUsers || maxEmployees !== company.maxEmployees || plan !== (company.plan ?? 'FREE') || billingStatus !== (company.billingStatus ?? 'TRIAL') || trialEndsAt !== (company.trialEndsAt ? new Date(company.trialEndsAt).toISOString().split('T')[0] : '');`;

code = code.replace(
  /const \[maxUsers, setMaxUsers\] = useState\(company\.maxUsers\);[\s\S]*?const changed = maxUsers !== company\.maxUsers \|\| maxEmployees !== company\.maxEmployees;/,
  stateAndLogic
);

// 6. Update LicenseModal body to include new fields
const fields = `
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Plano</span>
                <select value={plan} onChange={e => setPlan(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Status Financeiro</span>
                <select value={billingStatus} onChange={e => setBillingStatus(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                  <option value="TRIAL">Trial</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="PAST_DUE">Inadimplente</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600 col-span-2">
                <span>Vencimento do Trial</span>
                <input type="date" value={trialEndsAt} onChange={e => setTrialEndsAt(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              </label>
            </div>
`;

code = code.replace(
  '<div className="space-y-4">\n          <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 space-y-3">',
  '<div className="space-y-4">\n' + fields + '          <div className="rounded-[10px] border border-slate-100 bg-slate-50 p-4 space-y-3">'
);

// 7. Update onSave call in LicenseModal
code = code.replace(
  "onClick={() => valid && changed && onSave(maxUsers, maxEmployees)}",
  "onClick={() => valid && changed && onSave(maxUsers, maxEmployees, plan, billingStatus, trialEndsAt ? new Date(trialEndsAt).toISOString() : '')}"
);

fs.writeFileSync(file, code);
console.log('Fixed page.tsx');
