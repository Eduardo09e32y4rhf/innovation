import { Shield } from 'lucide-react';
import { BackLink } from '../_components/back-link';
import { CompanyIdentity, GRUPO } from '../_components/company-identity';

const display = { className: 'font-display' };

export default function PrivacidadePage() {
  return (
    <main className={`${display.className} min-h-screen bg-[#050b14] text-slate-300 py-16 px-6`}>
      <div className="max-w-3xl mx-auto">
        <BackLink
          fallbackHref="/"
          fallbackLabel="Voltar para a página inicial"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300 mb-8 transition-colors"
        />

        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Política de Privacidade</h1>
            <p className="text-xs text-slate-400 mt-1">Última atualização: Novembro de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl mt-6">
          <p>
            A <strong>Innovation RH Connect</strong> é uma plataforma do grupo <strong>{GRUPO.nome}</strong> (CNPJ{' '}
            {GRUPO.cnpj}, {GRUPO.endereco}). Na Innovation RH Connect, a privacidade, a confidencialidade e a
            segurança dos dados pessoais tratados no ambiente corporativo são prioridades. Esta Política de Privacidade
            descreve como tratamos informações pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018 - LGPD).
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">1. Dados Pessoais Tratados e Finalidades</h2>
          <p>
            O tratamento de dados ocorre de acordo com as funcionalidades contratadas e configuradas pela empresa
            empregadora (&ldquo;Cliente&rdquo;) para gestão de RH, administração de pessoal e controle de jornada:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Dados cadastrais e funcionais:</strong> nome, CPF, matrícula, cargo, departamento, escala,
              remuneração/benefícios (quando aplicável) e registros de frequência, necessários para execução de
              obrigações legais, regulatórias e contratuais trabalhistas.
            </li>
            <li>
              <strong>Geolocalização no registro de ponto:</strong> quando ativada pela empresa no aplicativo ou
              terminal, coleta coordenadas aproximadas no momento da marcação para conferir autenticidade e prevenir
              fraudes, observadas as políticas internas e a legislação vigente.
            </li>
            <li>
              <strong>Dados de acesso e segurança:</strong> registros de autenticação, logs de auditoria, identificadores
              de sessão e eventos técnicos para prevenção a fraudes, rastreabilidade e estabilidade da plataforma.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">2. Papéis na LGPD e Compartilhamento</h2>
          <p>
            Em relação aos dados de colaboradores, candidatos ou terceiros inseridos no sistema, a{' '}
            <strong>empresa contratante atua como Controladora</strong> e a <strong>Innovation RH Connect atua como
            Operadora</strong>, tratando os dados exclusivamente sob as instruções lícitas do Cliente e conforme as
            finalidades do serviço.
          </p>
          <p>
            Não comercializamos ou alugamos bases de dados pessoais. O acesso ou compartilhamento restrito ocorre
            apenas com: (a) gestores, RH e administradores autorizados pelo Cliente; (b) provedores de infraestrutura em
            nuvem, suporte e serviços essenciais contratados sob obrigações de confidencialidade e segurança; ou (c)
            autoridades públicas, mediante ordem judicial ou obrigação legal.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">3. Segurança da Informação e Retenção</h2>
          <p>
            Adotamos controles técnicos e organizacionais adequados ao risco, incluindo criptografia em trânsito e em
            repouso, controle de acesso baseado em funções, segregação de ambientes e rotinas de backup.
          </p>
          <p>
            Os dados permanecem ativos enquanto durar a relação contratual ou conforme necessário para as finalidades
            informadas. Após o encerramento do contrato, aplicam-se os prazos de exportação e eliminação definidos nos
            Termos de Uso, ressalvados os períodos de guarda obrigatória exigidos por lei trabalhista, previdenciária,
            fiscal ou para exercício regular de direitos.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">4. Direitos dos Titulares e Canal de Contato</h2>
          <p>
            Nos termos da LGPD, o titular dos dados tem direito à confirmação da existência de tratamento, acesso,
            correção de dados incompletos/inexatos/desatualizados, anonimização, bloqueio ou eliminação de dados
            desnecessários ou excessivos, portabilidade, informação sobre compartilhamento e revogação de consentimento,
            quando aplicável.
          </p>
          <p>
            Como a empresa empregadora define as políticas internas de RH e ponto, solicitações referentes a registros
            funcionais devem ser direcionadas prioritariamente ao setor de Recursos Humanos da sua empresa. Para
            questões relacionadas a esta Política, tratamento realizado diretamente pela plataforma ou contato com o
            encarregado pelo tratamento de dados pessoais (DPO), utilize os canais oficiais do grupo{' '}
            <strong>{GRUPO.nome}</strong>.
          </p>

          <h2 id="cookies" className="text-xl font-bold text-white mt-8 mb-3">
            5. Cookies e estatísticas de visitas
          </h2>
          <p>
            Na página inicial você escolhe entre <strong>Aceitar</strong> e <strong>Recusar</strong>. A escolha vale por
            180 dias e pode ser alterada a qualquer momento em &quot;Preferências de cookies&quot;, no rodapé da
            página.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Essenciais (sempre ativos):</strong> o cookie <code>innovation_cookie_consent</code>, que guarda a
              sua escolha, e os dados de sessão que mantêm você conectado e protegido depois do login. Sem eles o site
              não funciona com segurança.
            </li>
            <li>
              <strong>Estatísticas de visitas (somente se você aceitar):</strong> registramos de forma anônima a data e a
              hora do acesso, a página aberta, o tipo de dispositivo e de navegador e a cidade, o estado e o país
              aproximados, estimados a partir do endereço de rede. Não criamos cookie de rastreio, não gravamos o
              endereço de rede e não identificamos o visitante. Se você recusar, ou se o seu navegador enviar o sinal
              &quot;não rastrear&quot;, nada disso é registrado. Esses registros são apagados após 400 dias.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">6. Atualizações desta Política</h2>
          <p>
            Esta Política de Privacidade pode ser atualizada periodicamente para refletir aprimoramentos de segurança,
            evoluções da plataforma ou mudanças na legislação. Alterações relevantes serão comunicadas por meios
            adequados, com indicação da data da última revisão.
          </p>
        </div>

        <CompanyIdentity claro className="mt-8 text-center text-xs" />
      </div>
    </main>
  );
}
