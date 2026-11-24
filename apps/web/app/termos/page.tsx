import { FileText } from 'lucide-react';
import { BackLink } from '../_components/back-link';
import { CompanyIdentity, GRUPO } from '../_components/company-identity';

const display = { className: 'font-display' };

export default function TermosPage() {
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
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Termos e Condições de Uso</h1>
            <p className="text-xs text-slate-400 mt-1">Última atualização: Novembro de 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed bg-white/[0.02] border border-white/5 p-8 rounded-3xl mt-6">
          <p>
            Estes Termos e Condições de Uso (&ldquo;Termos&rdquo;) regulam o acesso e a utilização da plataforma{' '}
            <strong>Innovation RH Connect</strong> (&ldquo;Plataforma&rdquo;), operada pelo grupo{' '}
            <strong>{GRUPO.nome}</strong>, inscrito no CNPJ sob o nº {GRUPO.cnpj}, com sede em {GRUPO.endereco}.
          </p>
          <p>
            O aceite eletrônico destes Termos é requisito indispensável para o acesso ao sistema. Ao cadastrar-se ou
            utilizar qualquer funcionalidade da Plataforma, a empresa contratante (&ldquo;Cliente&rdquo;) e seus
            respectivos colaboradores ou gestores autorizados (&ldquo;Usuários&rdquo;) declaram ter lido, compreendido
            e concordado integralmente com as disposições abaixo.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">1. Objeto e Licença de Uso</h2>
          <p>
            A Innovation RH Connect disponibiliza uma solução tecnológica na modalidade Software como Serviço (SaaS)
            voltada à gestão de recursos humanos, administração de departamento pessoal e controle de jornada de trabalho.
          </p>
          <p>
            Durante a vigência do contrato comercial, concedemos ao Cliente uma licença de uso limitada, revogável, não
            exclusiva e intransferível para acesso à Plataforma, restrita estritamente às suas operações internas e ao
            limite de usuários contratados.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">2. Cadastro, Contas e Segurança de Acesso</h2>
          <p>
            O acesso à Plataforma ocorre mediante credenciais individuais (login e senha ou autenticação corporativa). O
            Cliente e os Usuários comprometem-se a:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>Fornecer dados cadastrais exatos, completos e atualizados;</li>
            <li>Manter o sigilo absoluto de suas senhas, sendo vedado o compartilhamento de contas entre terceiros;</li>
            <li>
              Comunicar imediatamente o suporte da Innovation RH Connect em caso de suspeita de acesso não autorizado ou
              comprometimento de credenciais;
            </li>
            <li>
              Gerenciar ativamente as permissões de acesso, revogando imediatamente o perfil de colaboradores
              desligados da empresa.
            </li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">3. Proteção de Dados e Papéis na LGPD</h2>
          <p>
            No âmbito da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), as partes reconhecem que o{' '}
            <strong>Cliente atua como Controlador</strong> dos dados pessoais de seus colaboradores e candidatos,
            enquanto a <strong>Innovation RH Connect atua como Operadora</strong>, realizando o tratamento estritamente
            conforme as instruções e parametrizações definidas pelo Cliente na Plataforma.
          </p>
          <p>
            A legalidade da coleta, a base legal aplicável, a veracidade dos registros inseridos e o atendimento aos
            direitos dos titulares são de responsabilidade exclusiva do Cliente. Detalhes técnicos sobre segurança da
            informação e retenção constam em nossa Política de Privacidade.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">4. Controle de Jornada e Conformidade Trabalhista</h2>
          <p>
            A Plataforma oferece ferramentas técnicas para registro e apuração de ponto eletrônico em conformidade com as
            diretrizes regulatórias vigentes (incluindo a Portaria MTP nº 671/2021). Contudo, a correta configuração de
            escalas, bancos de horas, acordos coletivos, tolerâncias e a auditoria das marcações realizadas pelos
            colaboradores são de inteira responsabilidade do Cliente.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">5. Condutas Vedadas</h2>
          <p>É expressamente proibido aos Usuários e ao Cliente:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              Realizar engenharia reversa, descompilar, copiar, modificar ou criar obras derivadas a partir do
              código-fonte ou da interface da Plataforma;
            </li>
            <li>
              Utilizar robôs, scripts automatizados (scraping) ou tentar testar vulnerabilidades de segurança da rede e
              dos servidores sem autorização formal;
            </li>
            <li>
              Inserir arquivos maliciosos, conteúdos ilícitos, difamatórios ou que violem direitos de propriedade
              intelectual de terceiros;
            </li>
            <li>Sublocar, revender ou ceder o acesso da Plataforma a terceiros estranhos ao grupo econômico contratante.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">6. Disponibilidade, Suporte e SLA</h2>
          <p>
            Empregamos infraestrutura em nuvem com monitoramento contínuo e rotinas automatizadas de backup para assegurar
            a estabilidade do sistema. Interrupções programadas para manutenção evolutiva ou preventiva serão
            comunicadas com antecedência razoável.
          </p>
          <p>
            O suporte técnico opera em dias úteis, em horário comercial, pelos canais oficiais disponibilizados dentro
            da Plataforma. Compromissos específicos de nível de serviço (SLA) e eventuais créditos por indisponibilidade
            reger-se-ão exclusivamente pelo contrato comercial firmado entre as partes.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">7. Propriedade Intelectual</h2>
          <p>
            Todos os direitos relativos à marca Innovation RH Connect, logotipos, layouts, algoritmos, bancos de dados,
            documentações e códigos pertencem exclusivamente ao grupo {GRUPO.nome}. O uso da Plataforma não transfere ao
            Cliente qualquer titularidade sobre a propriedade intelectual do software. Todos os dados inseridos pelo
            Cliente permanecem de sua exclusiva propriedade.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">8. Limitação de Responsabilidade</h2>
          <p>
            A Innovation RH Connect não se responsabiliza por: (a) decisões administrativas, trabalhistas ou de
            contratação tomadas pelo Cliente com base nos relatórios gerados; (b) falhas decorrentes de mau uso,
            parametrização incorreta pelo Cliente ou indisponibilidade de internet e dispositivos dos Usuários; (c)
            passivos trabalhistas, fiscais ou previdenciários originados da relação entre o Cliente e seus empregados.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">9. Vigência, Suspensão e Encerramento</h2>
          <p>
            Estes Termos vigoram por prazo indeterminado enquanto durar a relação contratual. O descumprimento de
            qualquer cláusula ou a inadimplência financeira autoriza a suspensão preventiva ou o bloqueio definitivo do
            acesso, mediante notificação prévia.
          </p>
          <p>
            Encerrado o contrato, o Cliente terá o prazo de 30 (trinta) dias para exportar sua base de dados em formato
            estruturado. Após esse período, os dados serão eliminados de nossos servidores ativos, ressalvadas as
            hipóteses de guarda obrigatória por determinação legal ou regulatória.
          </p>

          <h2 className="text-xl font-bold text-white mt-8 mb-3">10. Alterações e Foro</h2>
          <p>
            Estes Termos poderão ser atualizados periodicamente para refletir melhorias tecnológicas ou alterações
            legislativas. Mudanças substanciais serão notificadas na própria Plataforma ou por e-mail aos
            administradores da conta.
          </p>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede
            do grupo {GRUPO.nome} para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia a
            qualquer outro, por mais privilegiado que seja.
          </p>
        </div>

        <CompanyIdentity claro className="mt-8 text-center text-xs" />
      </div>
    </main>
  );
}
