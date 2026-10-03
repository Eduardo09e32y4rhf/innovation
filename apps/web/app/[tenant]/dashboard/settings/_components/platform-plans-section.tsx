import Link from 'next/link';
import { Layers3, ArrowRight } from 'lucide-react';

export function PlatformPlansSection({
  tenant,
}: {
  tenant: string;
}) {
  return (
    <section className="card-v2 overflow-hidden">
      <div className="border-b border-border bg-bg-sub/70 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-v2 bg-brand/10 text-brand">
            <Layers3 size={19} />
          </div>

          <div>
            <h3 className="text-sm font-black text-fg">
              Gestão dos planos da plataforma
            </h3>

            <p className="text-xs font-medium text-fg-mut">
              Crie, edite e controle os planos comercializados
              pelo Innovation RH.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-v2 border border-brand/20 bg-brand/5 p-5">
          <p className="text-sm font-black text-fg">
            Administração de planos
          </p>

          <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-fg-mut">
            Gerencie preços, ciclos, limites de usuários,
            quantidade de funcionários, módulos liberados e
            visibilidade comercial de cada plano.
          </p>

          <Link
            href={`/${tenant}/dashboard/platform/plans`}
            className="btn-v2-primary mt-5"
          >
            Gerenciar planos
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
