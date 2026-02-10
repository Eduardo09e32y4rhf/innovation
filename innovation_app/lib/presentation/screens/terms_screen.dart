import 'package:flutter/material.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_theme.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text(
              'Termos de Uso - Innovation',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            const Expanded(
              child: SingleChildScrollView(
                child: Text(
                  'TERMOS DE USO E POLÍTICA DE PRIVACIDADE - INNOVATION IA\n\n'
                  'Bem-vindo à Innovation. Ao utilizar nossa plataforma, você concorda com os termos abaixo. Leia atentamente.\n\n'
                  '1. NATUREZA DO SERVIÇO E REGRAS DE NEGÓCIO\n'
                  '- Escopo de Atuação: A Innovation é uma plataforma de tecnologia que facilita a gestão de documentos e processos de RH através de Inteligência Artificial.\n'
                  '- Isenção de Responsabilidade Financeira e Contábil: A Innovation NÃO é uma empresa de contabilidade. NÃO geramos, NÃO calculamos e NÃO alteramos contracheques, notas fiscais, impostos ou folhas de pagamento.\n'
                  '- Responsabilidade Legal: Toda e qualquer obrigação trabalhista, previdenciária ou fiscal é de responsabilidade exclusiva da Empresa Contratante e seus responsáveis técnicos.\n\n'
                  '2. SEGURANÇA DE DADOS E PRIVACIDADE (LGPD)\n'
                  '- Coleta de Dados: Coletamos nome, e-mail e telefone para autenticação e segurança do usuário via 2FA (Autenticação de Dois Fatores).\n'
                  '- Finalidade: Os dados são utilizados estritamente para garantir a identidade do usuário e prevenir acessos não autorizados.\n'
                  '- Divulgação de Dados: A Innovation não comercializa dados pessoais. O compartilhamento ocorre apenas entre Candidato e Recrutador dentro do fluxo de recrutamento autorizado pelo usuário.\n\n'
                  '3. REGRAS DE RECRUTAMENTO E SELEÇÃO\n'
                  '- Uso de IA: A nossa IA atua como ferramenta de triagem e orientação, não substituindo o julgamento humano final na contratação.\n'
                  '- Veracidade: O usuário é o único responsável pela veracidade dos documentos (PDFs) e informações inseridas na plataforma.\n'
                  '- Conduta: É proibida a publicação de vagas discriminatórias ou que violem a legislação trabalhista brasileira, sob pena de exclusão imediata da conta sem reembolso.\n\n'
                  '4. SEGURANÇA FINANCEIRA E PAGAMENTOS\n'
                  '- Processamento: Todos os pagamentos são processados via Mercado Pago. A Innovation não armazena dados de cartão de crédito em seus servidores.\n'
                  '- Política de Reembolso: Por se tratar de um serviço de consumo imediato de software (SaaS), pagamentos realizados não são reembolsáveis, exceto em casos previstos no Código de Defesa do Consumidor.\n\n'
                  '5. SEGURANÇA DE ACESSO (2FA)\n'
                  '- Autenticação: O acesso à plataforma exige validação via código enviado por e-mail ou SMS.\n'
                  '- Guarda de Credenciais: O usuário é responsável por manter seu celular e e-mail de recuperação seguros. A Innovation não se responsabiliza por invasões decorrentes de negligência do usuário.\n\n'
                  '6. FORO E LEGISLAÇÃO\n'
                  '- Este termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de [Sua Cidade/UF] para dirimir quaisquer controvérsias.\n',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                  Navigator.pushReplacementNamed(context, AppRoutes.login);
              },
              child: const Text('Aceitar'),
            ),
          ],
        ),
      ),
    );
  }
}
