import Link from 'next/link';
import { Layers3, ArrowRight } from 'lucide-react';

export function PlatformPlansSection({
  tenant,
}: {
  tenant: string;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Layers3 size={19} />
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950">
              Gestão dos planos da plataforma
            </h3>

            <p className="text-xs font-medium text-slate-500">
              Crie, edite e controle os planos comercializados
              pelo Innovation RH.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5">
          <p className="text-sm font-black text-slate-950">
            Administração de planos
          </p>

          <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">
            Gerencie preços, ciclos, limites de usuários,
            quantidade de funcionários, módulos liberados e
            visibilidade comercial de cada plano.
          </p>

          <Link
            href={`/${tenant}/dashboard/platform/plans`}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-black text-white transition hover:bg-violet-700"
          >
            Gerenciar planos
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
