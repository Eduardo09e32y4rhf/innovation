import Link from 'next/link';
import type { Company } from '@/app/contexts/AuthContext';

export function RecruitmentStart({ company, tenant }: { company: Company | null; tenant: string }) {
  if (!company?.activeModules?.includes('recruitment')) return null;
  const recruiter = company.recruitmentAccountType === 'RECRUITER';
  const end = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
  return (
    <section aria-label="Comece seu recrutamento" className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950">
      <h2 className="font-semibold">{recruiter ? 'Seu espaço de recrutamento está pronto' : 'Vamos encontrar alguém para o seu negócio?'}</h2>
      {company.billingStatus === 'TRIAL' && end && <p className="mt-2 text-sm">Seu teste grátis vai até {end.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}, sem cartão.</p>}
      <ol className="mt-3 list-inside list-decimal space-y-2 text-sm">
        <li><Link className="font-semibold underline" href={`/${tenant}/dashboard/settings?section=empresa`}>Confira o nome, a logo e os dados do seu negócio.</Link></li>
        <li><Link className="font-semibold underline" href={`/${tenant}/dashboard/jobs/new`}>Crie sua primeira vaga</Link> com cargo, local, salário e etapas do processo.</li>
        <li>Publique e compartilhe o link da vaga. O candidato cria uma conta gratuita e acompanha a candidatura no portal.</li>
      </ol>
      <p className="mt-3 text-sm">Sua assinatura já está vinculada à empresa. <Link className="font-semibold underline" href={`/${tenant}/dashboard/faturas`}>Consulte o plano, os vencimentos e o cancelamento em Faturas.</Link></p>
    </section>
  );
}
