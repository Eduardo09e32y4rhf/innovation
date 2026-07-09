import Link from 'next/link';
import { ArrowLeft, HeadphonesIcon } from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] });

export default function SuportePage() {
  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-300 py-16 px-6`}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar para a página inicial
        </Link>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <HeadphonesIcon size={24} />
          </div>
          <h1 className="text-3xl font-black text-white">Central de Suporte</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
          <p>
            Precisa de ajuda com a <strong>Innovation RH Connect</strong>? Nossa equipe especializada de Customer Success (CS) está sempre pronta para auxiliar no fechamento da folha, dúvidas sobre o sistema e integrações.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-2">Suporte Técnico</h3>
              <p className="text-slate-400 text-xs mb-4">Dúvidas operacionais e resolução de problemas na plataforma.</p>
              <a href="mailto:suporte@innovationrh.com.br" className="text-teal-400 font-bold hover:underline">suporte@innovationrh.com.br</a>
            </div>
            <div className="border border-white/10 bg-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-2">WhatsApp / Comercial</h3>
              <p className="text-slate-400 text-xs mb-4">Atualização de planos, faturamento e solicitações comerciais urgentes.</p>
              <a href="#" className="text-teal-400 font-bold hover:underline">(11) 90000-0000</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
