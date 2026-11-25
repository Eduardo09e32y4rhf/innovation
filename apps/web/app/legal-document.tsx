'use client';

import Link from 'next/link';
import { FileText, Shield } from 'lucide-react';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useLanguage } from './contexts/LanguageContext';
import { useI18n } from './contexts/I18nContext';
import { GRUPO } from './_components/company-identity';

type Locale = 'pt-BR' | 'en-US' | 'es-ES';
type Section = { title: string; paragraphs?: string[]; bullets?: string[] };
type DocumentCopy = { title: string; update: string; intro: string[]; sections: Section[]; translationNote: string };

const COPY: Record<'terms' | 'privacy', Record<Locale, DocumentCopy>> = {
  terms: {
    'pt-BR': {
      title: 'Termos e Condições de Uso',
      update: 'Última atualização: Novembro de 2026',
      translationNote: 'Esta página também está disponível em inglês e espanhol. Em caso de divergência, consulte a versão em português do Brasil.',
      intro: [
        'Estes Termos e Condições de Uso (“Termos”) regulam o acesso e a utilização da plataforma Innovation RH Connect (“Plataforma”), operada pelo grupo {{group}}, inscrito no CNPJ sob o nº {{cnpj}}, com sede em {{address}}.',
        'O aceite eletrônico destes Termos é requisito indispensável para o acesso ao sistema. Ao cadastrar-se ou utilizar qualquer funcionalidade da Plataforma, a empresa contratante (“Cliente”) e seus respectivos colaboradores ou gestores autorizados (“Usuários”) declaram ter lido, compreendido e concordado integralmente com as disposições abaixo.',
      ],
      sections: [
        { title: '1. Objeto e Licença de Uso', paragraphs: [
          'A Innovation RH Connect disponibiliza uma solução tecnológica na modalidade Software como Serviço (SaaS) voltada à gestão de recursos humanos, administração de departamento pessoal e controle de jornada de trabalho.',
          'Durante a vigência do contrato comercial, concedemos ao Cliente uma licença de uso limitada, revogável, não exclusiva e intransferível para acesso à Plataforma, restrita estritamente às suas operações internas e ao limite de usuários contratados.',
        ] },
        { title: '2. Cadastro, Contas e Segurança de Acesso', paragraphs: [
          'O acesso à Plataforma ocorre mediante credenciais individuais (login e senha ou autenticação corporativa). O Cliente e os Usuários comprometem-se a:',
        ], bullets: [
          'Fornecer dados cadastrais exatos, completos e atualizados;',
          'Manter o sigilo absoluto de suas senhas, sendo vedado o compartilhamento de contas entre terceiros;',
          'Comunicar imediatamente o suporte da Innovation RH Connect em caso de suspeita de acesso não autorizado ou comprometimento de credenciais;',
          'Gerenciar ativamente as permissões de acesso, revogando imediatamente o perfil de colaboradores desligados da empresa.',
        ] },
        { title: '3. Proteção de Dados e Papéis na LGPD', paragraphs: [
          'No âmbito da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), as partes reconhecem que o Cliente atua como Controlador dos dados pessoais de seus colaboradores e candidatos, enquanto a Innovation RH Connect atua como Operadora, realizando o tratamento estritamente conforme as instruções e parametrizações definidas pelo Cliente na Plataforma.',
          'A legalidade da coleta, a base legal aplicável, a veracidade dos registros inseridos e o atendimento aos direitos dos titulares são de responsabilidade exclusiva do Cliente. Detalhes técnicos sobre segurança da informação e retenção constam em nossa Política de Privacidade.',
        ] },
        { title: '4. Controle de Jornada e Conformidade Trabalhista', paragraphs: [
          'A Plataforma oferece ferramentas técnicas para registro e apuração de ponto eletrônico em conformidade com as diretrizes regulatórias vigentes (incluindo a Portaria MTP nº 671/2021). Contudo, a correta configuração de escalas, bancos de horas, acordos coletivos, tolerâncias e a auditoria das marcações realizadas pelos colaboradores são de inteira responsabilidade do Cliente.',
        ] },
        { title: '5. Condutas Vedadas', paragraphs: ['É expressamente proibido aos Usuários e ao Cliente:'], bullets: [
          'Realizar engenharia reversa, descompilar, copiar, modificar ou criar obras derivadas a partir do código-fonte ou da interface da Plataforma;',
          'Utilizar robôs, scripts automatizados (scraping) ou tentar testar vulnerabilidades de segurança da rede e dos servidores sem autorização formal;',
          'Inserir arquivos maliciosos, conteúdos ilícitos, difamatórios ou que violem direitos de propriedade intelectual de terceiros;',
          'Sublocar, revender ou ceder o acesso da Plataforma a terceiros estranhos ao grupo econômico contratante.',
        ] },
        { title: '6. Disponibilidade, Suporte e SLA', paragraphs: [
          'Empregamos infraestrutura em nuvem com monitoramento contínuo e rotinas automatizadas de backup para assegurar a estabilidade do sistema. Interrupções programadas para manutenção evolutiva ou preventiva serão comunicadas com antecedência razoável.',
          'O suporte técnico opera em dias úteis, em horário comercial, pelos canais oficiais disponibilizados dentro da Plataforma. Compromissos específicos de nível de serviço (SLA) e eventuais créditos por indisponibilidade reger-se-ão exclusivamente pelo contrato comercial firmado entre as partes.',
        ] },
        { title: '7. Propriedade Intelectual', paragraphs: [
          'Todos os direitos relativos à marca Innovation RH Connect, logotipos, layouts, algoritmos, bancos de dados, documentações e códigos pertencem exclusivamente ao grupo {{group}}. O uso da Plataforma não transfere ao Cliente qualquer titularidade sobre a propriedade intelectual do software. Todos os dados inseridos pelo Cliente permanecem de sua exclusiva propriedade.',
        ] },
        { title: '8. Limitação de Responsabilidade', paragraphs: [
          'A Innovation RH Connect não se responsabiliza por: (a) decisões administrativas, trabalhistas ou de contratação tomadas pelo Cliente com base nos relatórios gerados; (b) falhas decorrentes de mau uso, parametrização incorreta pelo Cliente ou indisponibilidade de internet e dispositivos dos Usuários; (c) passivos trabalhistas, fiscais ou previdenciários originados da relação entre o Cliente e seus empregados.',
        ] },
        { title: '9. Vigência, Suspensão e Encerramento', paragraphs: [
          'Estes Termos vigoram por prazo indeterminado enquanto durar a relação contratual. O descumprimento de qualquer cláusula ou a inadimplência financeira autoriza a suspensão preventiva ou o bloqueio definitivo do acesso, mediante notificação prévia.',
          'Encerrado o contrato, o Cliente terá o prazo de 30 (trinta) dias para exportar sua base de dados em formato estruturado. Após esse período, os dados serão eliminados de nossos servidores ativos, ressalvadas as hipóteses de guarda obrigatória por determinação legal ou regulatória.',
        ] },
        { title: '10. Alterações e Foro', paragraphs: [
          'Estes Termos poderão ser atualizados periodicamente para refletir melhorias tecnológicas ou alterações legislativas. Mudanças substanciais serão notificadas na própria Plataforma ou por e-mail aos administradores da conta.',
          'Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede do grupo {{group}} para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.',
        ] },
      ],
    },
    'en-US': {
      title: 'Terms and Conditions of Use',
      update: 'Last updated: November 2026',
      translationNote: 'This page is also available in Portuguese and Spanish. In case of any discrepancy, refer to the Brazilian Portuguese version.',
      intro: [
        'These Terms and Conditions of Use (“Terms”) govern access to and use of the Innovation RH Connect platform (“Platform”), operated by the {{group}} group, registered under Brazilian tax ID CNPJ {{cnpj}}, with its registered office at {{address}}.',
        'Electronic acceptance of these Terms is required to access the system. By registering or using any Platform feature, the contracting company (“Client”) and its employees or authorized managers (“Users”) declare that they have read, understood, and fully agreed to the provisions below.',
      ],
      sections: [
        { title: '1. Purpose and License to Use', paragraphs: [
          'Innovation RH Connect provides a Software as a Service (SaaS) technology solution for human resources management, personnel administration, and working-time tracking.',
          'For the term of the commercial agreement, we grant the Client a limited, revocable, non-exclusive, non-transferable license to access the Platform, strictly for its internal operations and up to the number of contracted users.',
        ] },
        { title: '2. Registration, Accounts, and Access Security', paragraphs: [
          'Access to the Platform requires individual credentials (username and password or corporate authentication). The Client and Users agree to:',
        ], bullets: [
          'Provide accurate, complete, and current registration information;',
          'Keep passwords strictly confidential and not share accounts with third parties;',
          'Promptly notify Innovation RH Connect support of suspected unauthorized access or compromised credentials;',
          'Actively manage access permissions and promptly revoke access for employees who leave the company.',
        ] },
        { title: '3. Data Protection and Roles under the LGPD', paragraphs: [
          'Under the Brazilian General Data Protection Law (Law No. 13,709/2018 - LGPD), the parties acknowledge that the Client acts as Controller of its employees’ and applicants’ personal data, while Innovation RH Connect acts as Processor, processing data strictly in accordance with the Client’s instructions and Platform settings.',
          'The lawfulness of collection, applicable legal basis, accuracy of entered records, and handling of data-subject rights are the Client’s sole responsibility. Technical details on information security and retention are set out in our Privacy Policy.',
        ] },
        { title: '4. Time Tracking and Employment Compliance', paragraphs: [
          'The Platform provides tools to record and calculate electronic working time in accordance with applicable regulations (including MTP Ordinance No. 671/2021). However, the Client is solely responsible for correctly configuring schedules, time banks, collective agreements, tolerances, and auditing employee time records.',
        ] },
        { title: '5. Prohibited Conduct', paragraphs: ['The following conduct by Users and the Client is expressly prohibited:'], bullets: [
          'Reverse engineer, decompile, copy, modify, or create derivative works from the Platform source code or interface;',
          'Use bots or automated scripts (scraping), or test network or server security vulnerabilities without formal authorization;',
          'Upload malicious files, unlawful or defamatory content, or material that infringes third-party intellectual property rights;',
          'Sublease, resell, or transfer Platform access to parties outside the contracting corporate group.',
        ] },
        { title: '6. Availability, Support, and SLA', paragraphs: [
          'We use cloud infrastructure with continuous monitoring and automated backups to help maintain system stability. Planned upgrades or preventive maintenance interruptions will be announced with reasonable notice.',
          'Technical support is available on business days during business hours through the official channels provided in the Platform. Specific service-level commitments (SLA) and any service credits for downtime are governed solely by the commercial agreement between the parties.',
        ] },
        { title: '7. Intellectual Property', paragraphs: [
          'All rights to the Innovation RH Connect brand, logos, layouts, algorithms, databases, documentation, and code belong exclusively to the {{group}} group. Use of the Platform does not transfer any software intellectual-property rights to the Client. Data entered by the Client remains its exclusive property.',
        ] },
        { title: '8. Limitation of Liability', paragraphs: [
          'Innovation RH Connect is not liable for: (a) administrative, employment, or hiring decisions made by the Client based on generated reports; (b) failures resulting from misuse, incorrect settings by the Client, or internet and User-device outages; or (c) employment, tax, or social-security liabilities arising from the relationship between the Client and its employees.',
        ] },
        { title: '9. Term, Suspension, and Termination', paragraphs: [
          'These Terms remain in effect for an indefinite period while the contractual relationship continues. Breach of any provision or payment default may result in preventive suspension or permanent access restriction, after prior notice.',
          'After termination, the Client has 30 (thirty) days to export its database in a structured format. After that period, data will be deleted from our active servers, except where retention is required by law or regulation.',
        ] },
        { title: '10. Changes and Jurisdiction', paragraphs: [
          'These Terms may be updated periodically to reflect technology improvements or legislative changes. Material changes will be notified in the Platform or by email to account administrators.',
          'These Terms are governed by the laws of the Federative Republic of Brazil. The courts of the district where the {{group}} group is headquartered shall have exclusive jurisdiction over disputes arising from this instrument, and all other venues are waived, however privileged.',
        ] },
      ],
    },
    'es-ES': {
      title: 'Términos y condiciones de uso',
      update: 'Última actualización: noviembre de 2026',
      translationNote: 'Esta página también está disponible en portugués e inglés. En caso de discrepancia, consulte la versión en portugués de Brasil.',
      intro: [
        'Estos Términos y condiciones de uso (“Términos”) regulan el acceso y la utilización de la plataforma Innovation RH Connect (“Plataforma”), operada por el grupo {{group}}, inscrito en el CNPJ brasileño con el n.º {{cnpj}} y domicilio social en {{address}}.',
        'La aceptación electrónica de estos Términos es indispensable para acceder al sistema. Al registrarse o utilizar cualquier funcionalidad de la Plataforma, la empresa contratante (“Cliente”) y sus empleados o gestores autorizados (“Usuarios”) declaran haber leído, comprendido y aceptado íntegramente las disposiciones siguientes.',
      ],
      sections: [
        { title: '1. Objeto y licencia de uso', paragraphs: [
          'Innovation RH Connect ofrece una solución tecnológica de software como servicio (SaaS) para la gestión de recursos humanos, administración de personal y control de la jornada laboral.',
          'Durante la vigencia del contrato comercial, concedemos al Cliente una licencia de acceso a la Plataforma limitada, revocable, no exclusiva e intransferible, estrictamente para sus operaciones internas y hasta el número de usuarios contratados.',
        ] },
        { title: '2. Registro, cuentas y seguridad de acceso', paragraphs: [
          'El acceso a la Plataforma requiere credenciales individuales (usuario y contraseña o autenticación corporativa). El Cliente y los Usuarios se comprometen a:',
        ], bullets: [
          'Proporcionar datos de registro exactos, completos y actualizados;',
          'Mantener sus contraseñas estrictamente confidenciales y no compartir cuentas con terceros;',
          'Notificar de inmediato al soporte de Innovation RH Connect cualquier sospecha de acceso no autorizado o credenciales comprometidas;',
          'Gestionar activamente los permisos de acceso y revocar de inmediato el acceso de quienes dejen la empresa.',
        ] },
        { title: '3. Protección de datos y funciones conforme a la LGPD', paragraphs: [
          'De acuerdo con la Ley General de Protección de Datos de Brasil (Ley n.º 13.709/2018 - LGPD), las partes reconocen que el Cliente actúa como Responsable del tratamiento de los datos personales de sus empleados y candidatos, mientras que Innovation RH Connect actúa como Encargado y trata los datos estrictamente según las instrucciones y configuraciones del Cliente en la Plataforma.',
          'La legalidad de la recopilación, la base jurídica aplicable, la veracidad de los registros y la atención de los derechos de los interesados son responsabilidad exclusiva del Cliente. Los detalles técnicos de seguridad y conservación se describen en nuestra Política de privacidad.',
        ] },
        { title: '4. Control horario y cumplimiento laboral', paragraphs: [
          'La Plataforma ofrece herramientas para registrar y calcular la jornada electrónica conforme a la normativa vigente (incluida la Ordenanza MTP n.º 671/2021). No obstante, el Cliente es el único responsable de configurar correctamente turnos, bancos de horas, convenios colectivos y tolerancias, así como de auditar los registros de jornada.',
        ] },
        { title: '5. Conductas prohibidas', paragraphs: ['Queda expresamente prohibido a los Usuarios y al Cliente:'], bullets: [
          'Realizar ingeniería inversa, descompilar, copiar, modificar o crear obras derivadas del código fuente o la interfaz de la Plataforma;',
          'Utilizar robots o scripts automatizados (scraping), o probar vulnerabilidades de seguridad de la red o los servidores sin autorización formal;',
          'Subir archivos maliciosos, contenido ilícito o difamatorio, o material que infrinja derechos de propiedad intelectual de terceros;',
          'Subarrendar, revender o ceder el acceso a la Plataforma a terceros ajenos al grupo empresarial contratante.',
        ] },
        { title: '6. Disponibilidad, soporte y SLA', paragraphs: [
          'Utilizamos infraestructura en la nube con supervisión continua y copias de seguridad automatizadas para favorecer la estabilidad del sistema. Las interrupciones programadas por mantenimiento preventivo o mejoras se comunicarán con antelación razonable.',
          'El soporte técnico está disponible en días laborables y horario comercial a través de los canales oficiales de la Plataforma. Los compromisos específicos de nivel de servicio (SLA) y cualquier compensación por interrupciones se rigen exclusivamente por el contrato comercial firmado entre las partes.',
        ] },
        { title: '7. Propiedad intelectual', paragraphs: [
          'Todos los derechos sobre la marca Innovation RH Connect, logotipos, diseños, algoritmos, bases de datos, documentación y código pertenecen exclusivamente al grupo {{group}}. El uso de la Plataforma no transfiere al Cliente ningún derecho de propiedad intelectual sobre el software. Los datos introducidos por el Cliente siguen siendo de su exclusiva propiedad.',
        ] },
        { title: '8. Limitación de responsabilidad', paragraphs: [
          'Innovation RH Connect no se responsabiliza de: (a) decisiones administrativas, laborales o de contratación tomadas por el Cliente basándose en los informes generados; (b) fallos derivados del uso indebido, configuración incorrecta del Cliente o falta de conexión a Internet o de dispositivos de los Usuarios; ni (c) responsabilidades laborales, fiscales o de seguridad social derivadas de la relación entre el Cliente y sus empleados.',
        ] },
        { title: '9. Vigencia, suspensión y terminación', paragraphs: [
          'Estos Términos tienen vigencia indefinida mientras dure la relación contractual. El incumplimiento de cualquier cláusula o la falta de pago podrá dar lugar a la suspensión preventiva o al bloqueo definitivo del acceso, previa notificación.',
          'Una vez terminado el contrato, el Cliente dispondrá de 30 (treinta) días para exportar su base de datos en formato estructurado. Transcurrido ese plazo, los datos se eliminarán de nuestros servidores activos, salvo los casos de conservación obligatoria por ley o normativa.',
        ] },
        { title: '10. Modificaciones y jurisdicción', paragraphs: [
          'Estos Términos podrán actualizarse periódicamente para reflejar mejoras tecnológicas o cambios legislativos. Los cambios sustanciales se comunicarán en la Plataforma o por correo electrónico a los administradores de la cuenta.',
          'Estos Términos se rigen por las leyes de la República Federativa de Brasil. Los tribunales del distrito donde se encuentra la sede del grupo {{group}} tendrán jurisdicción exclusiva para resolver cualquier controversia derivada de este instrumento, con renuncia expresa a cualquier otro fuero, por privilegiado que sea.',
        ] },
      ],
    },
  },
  privacy: {
    'pt-BR': {
      title: 'Política de Privacidade',
      update: 'Última atualização: Novembro de 2026',
      translationNote: 'Esta página também está disponível em inglês e espanhol. Em caso de divergência, consulte a versão em português do Brasil.',
      intro: [
        'A Innovation RH Connect é uma plataforma do grupo {{group}} (CNPJ {{cnpj}}, {{address}}). Na Innovation RH Connect, a privacidade, a confidencialidade e a segurança dos dados pessoais tratados no ambiente corporativo são prioridades. Esta Política de Privacidade descreve como tratamos informações pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).',
      ],
      sections: [
        { title: '1. Dados Pessoais Tratados e Finalidades', paragraphs: [
          'O tratamento de dados ocorre de acordo com as funcionalidades contratadas e configuradas pela empresa empregadora (“Cliente”) para gestão de RH, administração de pessoal e controle de jornada:',
        ], bullets: [
          'Dados cadastrais e funcionais: nome, CPF, matrícula, cargo, departamento, escala, remuneração/benefícios (quando aplicável) e registros de frequência, necessários para execução de obrigações legais, regulatórias e contratuais trabalhistas.',
          'Geolocalização no registro de ponto: quando ativada pela empresa no aplicativo ou terminal, coleta coordenadas aproximadas no momento da marcação para conferir autenticidade e prevenir fraudes, observadas as políticas internas e a legislação vigente.',
          'Dados de acesso e segurança: registros de autenticação, logs de auditoria, identificadores de sessão e eventos técnicos para prevenção a fraudes, rastreabilidade e estabilidade da plataforma.',
        ] },
        { title: '2. Papéis na LGPD e Compartilhamento', paragraphs: [
          'Em relação aos dados de colaboradores, candidatos ou terceiros inseridos no sistema, a empresa contratante atua como Controladora e a Innovation RH Connect atua como Operadora, tratando os dados exclusivamente sob as instruções lícitas do Cliente e conforme as finalidades do serviço.',
          'Não comercializamos ou alugamos bases de dados pessoais. O acesso ou compartilhamento restrito ocorre apenas com: (a) gestores, RH e administradores autorizados pelo Cliente; (b) provedores de infraestrutura em nuvem, suporte e serviços essenciais contratados sob obrigações de confidencialidade e segurança; ou (c) autoridades públicas, mediante ordem judicial ou obrigação legal.',
        ] },
        { title: '3. Segurança da Informação e Retenção', paragraphs: [
          'Adotamos controles técnicos e organizacionais adequados ao risco, incluindo criptografia em trânsito e em repouso, controle de acesso baseado em funções, segregação de ambientes e rotinas de backup.',
          'Os dados permanecem ativos enquanto durar a relação contratual ou conforme necessário para as finalidades informadas. Após o encerramento do contrato, aplicam-se os prazos de exportação e eliminação definidos nos Termos de Uso, ressalvados os períodos de guarda obrigatória exigidos por lei trabalhista, previdenciária, fiscal ou para exercício regular de direitos.',
        ] },
        { title: '4. Direitos dos Titulares e Canal de Contato', paragraphs: [
          'Nos termos da LGPD, o titular dos dados tem direito à confirmação da existência de tratamento, acesso, correção de dados incompletos/inexatos/desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos, portabilidade, informação sobre compartilhamento e revogação de consentimento, quando aplicável.',
          'Como a empresa empregadora define as políticas internas de RH e ponto, solicitações referentes a registros funcionais devem ser direcionadas prioritariamente ao setor de Recursos Humanos da sua empresa. Para questões relacionadas a esta Política, tratamento realizado diretamente pela plataforma ou contato com o encarregado pelo tratamento de dados pessoais (DPO), utilize os canais oficiais do grupo {{group}}.',
        ] },
        { title: '5. Cookies e estatísticas de visitas', paragraphs: [
          'Na página inicial você escolhe entre “Aceitar” e “Recusar”. A escolha vale por 180 dias e pode ser alterada a qualquer momento em “Preferências de cookies”, no rodapé da página.',
        ], bullets: [
          'Essenciais (sempre ativos): o cookie innovation_cookie_consent, que guarda a sua escolha, e os dados de sessão que mantêm você conectado e protegido depois do login. Sem eles o site não funciona com segurança.',
          'Estatísticas de visitas (somente se você aceitar): registramos de forma anônima a data e a hora do acesso, a página aberta, o tipo de dispositivo e de navegador e a cidade, o estado e o país aproximados, estimados a partir do endereço de rede. Não criamos cookie de rastreio, não gravamos o endereço de rede e não identificamos o visitante. Se você recusar, ou se o seu navegador enviar o sinal “não rastrear”, nada disso é registrado. Esses registros são apagados após 400 dias.',
        ] },
        { title: '6. Atualizações desta Política', paragraphs: [
          'Esta Política de Privacidade pode ser atualizada periodicamente para refletir aprimoramentos de segurança, evoluções da plataforma ou mudanças na legislação. Alterações relevantes serão comunicadas por meios adequados, com indicação da data da última revisão.',
        ] },
      ],
    },
    'en-US': {
      title: 'Privacy Policy',
      update: 'Last updated: November 2026',
      translationNote: 'This page is also available in Portuguese and Spanish. In case of any discrepancy, refer to the Brazilian Portuguese version.',
      intro: [
        'Innovation RH Connect is a platform operated by the {{group}} group (Brazilian tax ID CNPJ {{cnpj}}, {{address}}). We prioritize the privacy, confidentiality, and security of personal data processed in the corporate environment. This Privacy Policy explains how we process personal information in accordance with Brazil’s General Data Protection Law (Law No. 13,709/2018 - LGPD).',
      ],
      sections: [
        { title: '1. Personal Data Processed and Purposes', paragraphs: [
          'Data is processed according to the features contracted and configured by the employer (“Client”) for HR management, personnel administration, and working-time tracking:',
        ], bullets: [
          'Registration and employment data: name, CPF, employee number, job title, department, schedule, compensation/benefits (where applicable), and attendance records, as needed to meet legal, regulatory, and employment-contract obligations.',
          'Geolocation for time tracking: when enabled by the company in the app or terminal, approximate coordinates are collected when a time entry is made to verify authenticity and prevent fraud, subject to internal policies and applicable law.',
          'Access and security data: authentication records, audit logs, session identifiers, and technical events used to prevent fraud, support traceability, and maintain platform stability.',
        ] },
        { title: '2. LGPD Roles and Sharing', paragraphs: [
          'For employee, applicant, or third-party data entered into the system, the contracting company acts as Controller and Innovation RH Connect acts as Processor, processing data only under the Client’s lawful instructions and for the service purposes.',
          'We do not sell or rent personal-data databases. Restricted access or sharing occurs only with: (a) managers, HR staff, and administrators authorized by the Client; (b) cloud infrastructure, support, and essential service providers bound by confidentiality and security obligations; or (c) public authorities under a court order or legal obligation.',
        ] },
        { title: '3. Information Security and Retention', paragraphs: [
          'We apply technical and organizational controls appropriate to the risk, including encryption in transit and at rest, role-based access control, environment segregation, and backups.',
          'Data remains active for the duration of the contractual relationship or as needed for the stated purposes. After the contract ends, the export and deletion periods in the Terms of Use apply, subject to mandatory retention periods under employment, social-security, or tax law, or for the regular exercise of legal rights.',
        ] },
        { title: '4. Data Subject Rights and Contact Channel', paragraphs: [
          'Under the LGPD, data subjects may request confirmation of processing, access, correction of incomplete, inaccurate, or outdated data, anonymization, blocking or deletion of unnecessary or excessive data, portability, information about sharing, and withdrawal of consent where applicable.',
          'Because the employer sets its internal HR and time-tracking policies, requests concerning employment records should primarily be directed to your company’s HR department. For questions about this Policy, processing carried out directly by the platform, or contact with the Data Protection Officer (DPO), use the official channels of the {{group}} group.',
        ] },
        { title: '5. Cookies and Visit Statistics', paragraphs: [
          'On the home page, you can choose “Accept” or “Reject”. Your choice is retained for 180 days and may be changed at any time under “Cookie preferences” in the page footer.',
        ], bullets: [
          'Essential (always active): the innovation_cookie_consent cookie, which stores your choice, and session data that keep you signed in and protected. The site cannot operate securely without them.',
          'Visit statistics (only if you accept): we anonymously record the access date and time, page viewed, device and browser type, and approximate city, state, and country estimated from the network address. We do not create tracking cookies, store the network address, or identify visitors. If you reject or your browser sends a “do not track” signal, none of this is recorded. These records are deleted after 400 days.',
        ] },
        { title: '6. Updates to this Policy', paragraphs: [
          'This Privacy Policy may be updated periodically to reflect security improvements, platform developments, or legal changes. Material changes will be communicated through appropriate means and the date of the latest revision will be indicated.',
        ] },
      ],
    },
    'es-ES': {
      title: 'Política de privacidad',
      update: 'Última actualización: noviembre de 2026',
      translationNote: 'Esta página también está disponible en portugués e inglés. En caso de discrepancia, consulte la versión en portugués de Brasil.',
      intro: [
        'Innovation RH Connect es una plataforma del grupo {{group}} (CNPJ brasileño {{cnpj}}, {{address}}). La privacidad, la confidencialidad y la seguridad de los datos personales tratados en el entorno corporativo son prioritarias. Esta Política de privacidad describe cómo tratamos la información personal conforme a la Ley General de Protección de Datos de Brasil (Ley n.º 13.709/2018 - LGPD).',
      ],
      sections: [
        { title: '1. Datos personales tratados y finalidades', paragraphs: [
          'Los datos se tratan de acuerdo con las funcionalidades contratadas y configuradas por la empresa empleadora (“Cliente”) para la gestión de RR. HH., la administración de personal y el control horario:',
        ], bullets: [
          'Datos de registro y laborales: nombre, CPF, número de empleado, puesto, departamento, horario, remuneración/beneficios (cuando corresponda) y registros de asistencia, necesarios para cumplir obligaciones legales, normativas y contractuales laborales.',
          'Geolocalización en el registro horario: cuando la empresa la activa en la aplicación o terminal, se recopilan coordenadas aproximadas al fichar para verificar la autenticidad y prevenir fraudes, de acuerdo con las políticas internas y la legislación vigente.',
          'Datos de acceso y seguridad: registros de autenticación, logs de auditoría, identificadores de sesión y eventos técnicos para prevenir fraudes, facilitar la trazabilidad y mantener la estabilidad de la plataforma.',
        ] },
        { title: '2. Funciones conforme a la LGPD y comunicación de datos', paragraphs: [
          'Respecto de los datos de empleados, candidatos o terceros introducidos en el sistema, la empresa contratante actúa como Responsable del tratamiento e Innovation RH Connect como Encargado, tratando los datos exclusivamente según las instrucciones lícitas del Cliente y las finalidades del servicio.',
          'No vendemos ni alquilamos bases de datos personales. El acceso o la comunicación restringidos solo se realizan a: (a) gestores, personal de RR. HH. y administradores autorizados por el Cliente; (b) proveedores de infraestructura en la nube, soporte y servicios esenciales sujetos a obligaciones de confidencialidad y seguridad; o (c) autoridades públicas, por orden judicial u obligación legal.',
        ] },
        { title: '3. Seguridad de la información y conservación', paragraphs: [
          'Adoptamos controles técnicos y organizativos adecuados al riesgo, incluidos el cifrado en tránsito y en reposo, el control de acceso basado en funciones, la separación de entornos y las copias de seguridad.',
          'Los datos permanecen activos mientras dure la relación contractual o sean necesarios para las finalidades indicadas. Tras finalizar el contrato, se aplican los plazos de exportación y eliminación de los Términos de uso, salvo los periodos de conservación obligatoria exigidos por la legislación laboral, de seguridad social o fiscal, o para el ejercicio regular de derechos.',
        ] },
        { title: '4. Derechos de los interesados y canal de contacto', paragraphs: [
          'Conforme a la LGPD, el interesado puede solicitar confirmación del tratamiento, acceso, corrección de datos incompletos, inexactos o desactualizados, anonimización, bloqueo o eliminación de datos innecesarios o excesivos, portabilidad, información sobre comunicaciones y retirada del consentimiento cuando corresponda.',
          'Como la empresa empleadora define sus políticas internas de RR. HH. y control horario, las solicitudes sobre registros laborales deben dirigirse prioritariamente al departamento de Recursos Humanos de su empresa. Para consultas sobre esta Política, tratamientos realizados directamente por la plataforma o contacto con el Delegado de Protección de Datos (DPO), utilice los canales oficiales del grupo {{group}}.',
        ] },
        { title: '5. Cookies y estadísticas de visitas', paragraphs: [
          'En la página de inicio puede elegir “Aceptar” o “Rechazar”. La elección se conserva durante 180 días y puede cambiarse en cualquier momento en “Preferencias de cookies”, en el pie de página.',
        ], bullets: [
          'Esenciales (siempre activas): la cookie innovation_cookie_consent, que guarda su elección, y los datos de sesión que le mantienen conectado y protegido. Sin ellos, el sitio no funciona de forma segura.',
          'Estadísticas de visitas (solo si acepta): registramos anónimamente la fecha y hora del acceso, la página visitada, el tipo de dispositivo y navegador, y la ciudad, el estado y el país aproximados estimados a partir de la dirección de red. No creamos cookies de seguimiento, no almacenamos la dirección de red ni identificamos al visitante. Si rechaza o su navegador envía la señal “no rastrear”, no se registra nada de esto. Estos registros se eliminan después de 400 días.',
        ] },
        { title: '6. Actualizaciones de esta Política', paragraphs: [
          'Esta Política de privacidad puede actualizarse periódicamente para reflejar mejoras de seguridad, cambios de la plataforma o modificaciones legislativas. Los cambios relevantes se comunicarán por medios adecuados e indicarán la fecha de la última revisión.',
        ] },
      ],
    },
  },
};

function interpolate(value: string) {
  return value
    .replaceAll('{{group}}', GRUPO.nome)
    .replaceAll('{{cnpj}}', GRUPO.cnpj)
    .replaceAll('{{address}}', GRUPO.endereco);
}

export function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const { language } = useLanguage();
  const { t } = useI18n();
  const copy = COPY[kind][language];
  const Icon = kind === 'terms' ? FileText : Shield;

  return (
    <main className="min-h-screen bg-[#f8f7fb] px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
        <Link href="/carreiras" className="mb-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#5b29be] hover:underline">
          ← {language === 'en-US' ? 'Back to careers' : language === 'es-ES' ? 'Volver a empleos' : 'Voltar para as vagas'}
        </Link>
        <div className="mb-2 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700"><Icon size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-[#1e1145] sm:text-3xl">{copy.title}</h1>
            <p className="mt-1 text-xs text-slate-600">{copy.update}</p>
          </div>
        </div>
        <article className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-relaxed shadow-sm sm:p-8">
          {copy.intro.map((paragraph) => <p key={paragraph}>{interpolate(paragraph)}</p>)}
          {copy.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="pt-3 text-lg font-bold text-[#1e1145]">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{interpolate(paragraph)}</p>)}
              {section.bullets && <ul className="list-disc space-y-2 pl-5">{section.bullets.map((item) => <li key={item}>{interpolate(item)}</li>)}</ul>}
            </section>
          ))}
          <p className="border-t border-slate-200 pt-4 text-xs text-slate-600">{copy.translationNote}</p>
        </article>
        {kind === 'privacy' && (
          <Link href="/carreiras/privacidade" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#7240da] px-4 text-sm font-semibold text-white hover:bg-[#5b29be]">
            {language === 'en-US' ? 'Request access, correction, or deletion of my data' : language === 'es-ES' ? 'Solicitar acceso, rectificación o eliminación de mis datos' : 'Solicitar acesso, correção ou exclusão dos meus dados'}
          </Link>
        )}
        <p className="mt-8 text-center text-xs text-slate-600">{GRUPO.nome} · CNPJ {GRUPO.cnpj}</p>
      </div>
    </main>
  );
}
