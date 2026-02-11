import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Innovation',
                style: TextStyle(fontSize: 32, color: Colors.white),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.pushNamed(context, AppRoutes.register);
                },
                child: const Text('Criar conta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}



BoxDecoration appGradient() {
  return const BoxDecoration(
    gradient: LinearGradient(
      colors: [
        Color(0xFF2B0A3D),
        Color(0xFF4A1E8C),
        Color(0xFF1A237E),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
  );
}


import 'dart:ui';
import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/payment_service.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({super.key});

  @override
  State<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  final _payment = PaymentService();
  int selectedPlan = 0;

  @override
  Widget build(BuildContext context) {
    final plans = _payment.getPlans();

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF2B0A3D),
              Color(0xFF5E2B97),
              Color(0xFF3B4CCA),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                width: 420,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: Colors.white24),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Pagamento',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Row(
                          children: [
                            Icon(Icons.handshake, color: Colors.white70),
                            SizedBox(width: 6),
                            Text(
                              'mercado\npago',
                              style: TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Selecione um plano e complete o pagamento inicial de forma segura.',
                      style: TextStyle(color: Colors.white70),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),

                    // Plans
                    Row(
                      children: [
                        _plan(
                          index: 0,
                          title: plans[0].title,
                          price: plans[0].price.toString(),
                          color: const Color(0xFF4A6CF7),
                          features: plans[0].features,
                        ),
                        _plan(
                          index: 1,
                          title: plans[1].title,
                          price: plans[1].price.toString(),
                          color: const Color(0xFF8E44AD),
                          features: plans[1].features,
                        ),
                        _plan(
                          index: 2,
                          title: plans[2].title,
                          price: plans[2].price.toString(),
                          color: const Color(0xFFF2994A),
                          features: plans[2].features,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Payment methods (visual)
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Forma de pagamento',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        _PayMethod(Icons.qr_code, 'PIX'),
                        _PayMethod(Icons.receipt, 'Boleto\nBancário'),
                        _PayMethod(Icons.credit_card, 'Cartão de\ncrédito'),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Security
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock, color: Colors.white60, size: 16),
                        SizedBox(width: 6),
                        Text('Pagamento seguro', style: TextStyle(color: Colors.white60)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'MercadoPago • PCI DSS • SSL',
                      style: TextStyle(color: Colors.white38, fontSize: 12),
                    ),
                    const SizedBox(height: 20),

                    // Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pushNamed(context, AppRoutes.payment, arguments: plans[selectedPlan].id);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3949AB),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: const Text(
                          'CONFIRMAR PAGAMENTO',
                          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    GestureDetector(
                      onTap: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
                      child: const Text(
                        'Voltar para Entrar',
                        style: TextStyle(
                          color: Colors.white70,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _plan({
    required int index,
    required String title,
    required String price,
    required Color color,
    required List<String> features,
  }) {
    final selected = selectedPlan == index;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => selectedPlan = index),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 6),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [
                color.withOpacity(selected ? 0.9 : 0.5),
                color.withOpacity(0.8),
              ],
            ),
            border: selected ? Border.all(color: Colors.white, width: 2) : null,
          ),
          child: Column(
            children: [
              if (selected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Selecionado',
                    style: TextStyle(color: Colors.white, fontSize: 10),
                  ),
                ),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
              const SizedBox(height: 6),
              RichText(
                text: TextSpan(
                  text: 'R\$ ',
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                  children: [
                    TextSpan(
                      text: price,
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const TextSpan(text: '/mês'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ...features.map(
                (f) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.circle, size: 8, color: Colors.white70),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          f,
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PayMethod extends StatelessWidget {
  final IconData icon;
  final String label;

  const _PayMethod(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 60,
        margin: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
