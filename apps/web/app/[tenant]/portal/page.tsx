'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { FileText, Clock, Sun, FileCheck } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PortalHomePage() {
  const { user } = useAuth();
  const params = useParams<{ tenant: string }>();
  const tenant = params?.tenant ?? '';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Olá, {user?.name || 'Colaborador'}! 👋</h2>
        <p className="mt-1 text-slate-500 font-medium">Bem-vindo ao seu portal de autoatendimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalCard href={`/${tenant}/portal/holerites`} icon={FileText} title="Holerites" description="Baixe seus recibos de pagamento" color="bg-blue-50 text-blue-600" />
        <PortalCard href={`/${tenant}/portal/ponto`} icon={Clock} title="Meu Ponto" description="Espelho de ponto e banco de horas" color="bg-teal-50 text-teal-600" />
        <PortalCard href={`/${tenant}/portal/ferias`} icon={Sun} title="Férias" description="Saldo e solicitações" color="bg-amber-50 text-amber-600" />
        <PortalCard href={`/${tenant}/portal/documentos`} icon={FileCheck} title="Documentos" description="Admissão e informes" color="bg-violet-50 text-violet-600" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">Comunicados Recentes</h3>
        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="text-sm font-bold text-slate-900">Bem-vindo ao novo Portal!</h4>
            <p className="mt-1 text-xs font-medium text-slate-500">Agora você pode acessar seus holerites e informações de RH tudo em um só lugar.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PortalCard({ href, icon: Icon, title, description, color }: { href: string; icon: any; title: string; description: string; color: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-violet-300 hover:shadow-md">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-sm font-black text-slate-900 group-hover:text-violet-700">{title}</h3>
      <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
    </Link>
  );
}
