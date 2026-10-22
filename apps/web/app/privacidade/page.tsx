import { Shield } from 'lucide-react';
import { BackLink } from '../_components/back-link';
import { CompanyIdentity, GRUPO } from '../_components/company-identity';
const display = { className: 'font-display' };

export default function PrivacidadePage() {
  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-300 py-16 px-6`}>
      <div className="max-w-3xl mx-auto">
        <BackLink fallbackHref="/" fallbackLabel="Voltar para a página inicial" className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 mb-8 transition-colors" />
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <Shield size={24} />
          </div>
          <h1 className="text-3xl font-black text-white">Política de Privacidade</h1>
        </div>
        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
          <p>
            A <strong>Innovation RH Connect</strong> é uma plataforma do grupo <strong>{GRUPO.nome}</strong> (CNPJ {GRUPO.cnpj}, {GRUPO.endereco}). Na Innovation RH Connect, a privacidade e a segurança dos dados dos seus colaboradores são nossa prioridade máxima. Esta política descreve como coletamos, usamos e protegemos as informações pessoais no nosso sistema de gestão.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Coleta de Dados</h2>
          <p>Coletamos apenas as informações estritamente necessárias para a prestação dos nossos serviços de RH e controle de jornada, incluindo dados de geolocalização no registro de ponto, quando habilitada pela empresa, para garantir a autenticidade dos registros de ponto.</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Uso e Proteção</h2>
          <p>Seus dados são criptografados e armazenados em servidores seguros. Não compartilhamos, vendemos ou alugamos dados de colaboradores para terceiros. O acesso às informações é restrito aos gestores e administradores autorizados pela sua empresa.</p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Conformidade com a LGPD</h2>
          <p>Adotamos medidas técnicas e organizacionais para atender à Lei Geral de Proteção de Dados (LGPD). Todos os colaboradores cadastrados possuem o direito de solicitar a exclusão, portabilidade ou revisão dos seus dados diretamente junto ao RH da empresa contratante.</p>
          <h2 id="cookies" className="text-xl font-bold text-white mt-8 mb-4">4. Cookies e estatísticas de visitas</h2>
          <p>Na página inicial você escolhe entre <strong>Aceitar</strong> e <strong>Recusar</strong>. A escolha vale por 180 dias e pode ser alterada a qualquer momento em &quot;Preferências de cookies&quot;, no rodapé da página.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Essenciais (sempre ativos):</strong> o cookie <code>innovation_cookie_consent</code>, que guarda a sua escolha, e os dados de sessão que mantêm você conectado e protegido depois do login. Sem eles o site não funciona com segurança.</li>
            <li><strong>Estatísticas de visitas (somente se você aceitar):</strong> registramos de forma anônima a data e a hora do acesso, a página aberta, o tipo de dispositivo e de navegador e a cidade, o estado e o país aproximados, estimados a partir do endereço de rede. Não criamos cookie de rastreio, não gravamos o endereço de rede e não identificamos o visitante. Se você recusar, ou se o seu navegador enviar o sinal &quot;não rastrear&quot;, nada disso é registrado. Esses registros são apagados após 400 dias.</li>
          </ul>
        </div>
        <CompanyIdentity claro className="mt-8 text-center text-xs" />
      </div>
    </main>
  );
}
