import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] });

export default function TermosPage() {
  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-300 py-16 px-6`}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar para a página inicial
        </Link>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <FileText size={24} />
          </div>
          <h1 className="text-3xl font-black text-white">Termos de Serviço</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
          <p>
            Bem-vindo aos Termos de Serviço da <strong>Innovation RH Connect</strong>. Ao utilizar nossa plataforma de gestão, você concorda em cumprir as diretrizes aqui estabelecidas.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Licença de Uso</h2>
          <p>Concedemos à sua empresa uma licença limitada, não exclusiva e intransferível para o uso do nosso software como serviço (SaaS), destinada exclusivamente à gestão interna do seu departamento de recursos humanos e controle de jornada.</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Responsabilidade sobre os Dados</h2>
          <p>A Innovation RH Connect atua como operadora dos dados, processando as informações de acordo com as diretrizes da sua empresa (controladora). A exatidão e a validade legal das informações inseridas na plataforma são de inteira responsabilidade da empresa contratante.</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Disponibilidade e SLA</h2>
          <p>Garantimos um Service Level Agreement (SLA) de 99.8% de disponibilidade (uptime) da plataforma, assegurando que o seu DP e os registros de ponto dos seus colaboradores operem sem interrupções em horários críticos.</p>
        </div>
      </div>
    </main>
  );
}
