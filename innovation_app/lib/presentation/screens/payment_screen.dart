import 'dart:ui';
import 'package:flutter/material.dart';
import '../../routes/app_routes.dart';
import '../../services/payment_service.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _payment = PaymentService();

  bool cardSelected = true;
  bool loading = false;

  final _cardNumber = TextEditingController();
  final _expiry = TextEditingController();
  final _cvv = TextEditingController();

  @override
  void dispose() {
    _cardNumber.dispose();
    _expiry.dispose();
    _cvv.dispose();
    super.dispose();
  }

  Future<void> _confirm(String planId) async {
    setState(() => loading = true);
    try {
      await _payment.confirmPayment(
        planId: planId,
        method: cardSelected ? 'card' : 'pix',
      );
      if (!mounted) return;
      Navigator.pushNamed(context, AppRoutes.terms);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Erro no pagamento: $e')));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final planId = (ModalRoute.of(context)?.settings.arguments as String?) ?? 'pessoal';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF2B0A3D),
              Color(0xFF5E2B97),
              Color(0xFF3B4CCA),
            ],
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
                          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600),
                        ),
                        Row(
                          children: [
                            Icon(Icons.handshake, color: Colors.white70),
                            SizedBox(width: 6),
                            Text('mercado\npago', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        )
                      ],
                    ),
                    const SizedBox(height: 16),

                    const Text(
                      'Por favor, complete o pagamento inicial para ativar sua conta.',
                      style: TextStyle(color: Colors.white70),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),

                    // Pay amount (exemplo)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'Plano: $planId',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Pagamento inicial',
                            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Pagamento seguro facilitado pelo Mercado Pago',
                            style: TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Payment methods
                    _method(
                      selected: cardSelected,
                      icon: Icons.credit_card,
                      label: 'Cartão de crédito ou débito',
                      trailing: const Row(
                        children: [Icon(Icons.credit_card, color: Colors.white70, size: 20)],
                      ),
                      onTap: () => setState(() => cardSelected = true),
                    ),
                    const SizedBox(height: 8),
                    _method(
                      selected: !cardSelected,
                      icon: Icons.qr_code,
                      label: 'PIX',
                      onTap: () => setState(() => cardSelected = false),
                    ),
                    const SizedBox(height: 16),

                    // Card fields
                    if (cardSelected) ...[
                      _input(_cardNumber, 'Número do cartão'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _input(_expiry, 'Data de validade')),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _input(
                              _cvv,
                              'MM/AA',
                              suffix: const Icon(Icons.lock, color: Colors.white70),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Security
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock, color: Colors.white60, size: 16),
                        SizedBox(width: 6),
                        Text('Pagamento seguro e encriptado', style: TextStyle(color: Colors.white60)),
                      ],
                    ),
                    const SizedBox(height: 10),

                    const Text(
                      'mercado pago   VISA   MASTERCARD   PCI DSS',
                      style: TextStyle(color: Colors.white38, fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),

                    // Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: loading ? null : () => _confirm(planId),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3949AB),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        ),
                        child: Text(
                          loading ? 'PROCESSANDO...' : 'CONFIRMAR PAGAMENTO',
                          style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    GestureDetector(
                      onTap: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
                      child: const Text(
                        'Voltar para Entrar',
                        style: TextStyle(color: Colors.white70, decoration: TextDecoration.underline),
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

  Widget _method({
    required bool selected,
    required IconData icon,
    required String label,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? Colors.white.withOpacity(0.18) : Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: selected ? Border.all(color: Colors.white) : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: const TextStyle(color: Colors.white))),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }

  Widget _input(TextEditingController c, String hint, {Widget? suffix}) {
    return TextField(
      controller: c,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white70),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withOpacity(0.12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
