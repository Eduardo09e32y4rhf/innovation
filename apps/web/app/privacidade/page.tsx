import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'] });

export default function PrivacidadePage() {
  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-300 py-16 px-6`}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar para a página inicial
        </Link>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <Shield size={24} />
          </div>
          <h1 className="text-3xl font-black text-white">Política de Privacidade</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
          <p>
            Na <strong>Innovation RH Connect</strong>, a privacidade e a segurança dos dados dos seus colaboradores são nossa prioridade máxima. Esta política descreve como coletamos, usamos e protegemos as informações pessoais no nosso sistema de gestão.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Coleta de Dados</h2>
          <p>Coletamos apenas as informações estritamente necessárias para a prestação dos nossos serviços de RH e controle de jornada, incluindo dados de geolocalização e biometria facial, quando habilitados e com o consentimento explícito, para garantir a autenticidade dos registros de ponto (em conformidade com a portaria 671/MTP).</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Uso e Proteção</h2>
          <p>Seus dados são criptografados e armazenados em servidores seguros. Não compartilhamos, vendemos ou alugamos dados de colaboradores para terceiros. O acesso às informações é restrito aos gestores e administradores autorizados pela sua empresa.</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Conformidade com a LGPD</h2>
          <p>Garantimos a total aderência à Lei Geral de Proteção de Dados (LGPD). Todos os colaboradores cadastrados possuem o direito de solicitar a exclusão, portabilidade ou revisão dos seus dados diretamente junto ao RH da empresa contratante.</p>
        </div>
      </div>
    </main>
  );
}
