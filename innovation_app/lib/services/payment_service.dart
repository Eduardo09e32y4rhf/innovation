import '../models/plan.dart';

class PaymentService {
  List<Plan> getPlans() {
    return const [
      Plan(
        id: 'pessoal',
        title: 'Pessoal',
        price: 99,
        features: ['1 Usuário', 'Plano Pessoal', 'Acesso básico'],
      ),
      Plan(
        id: 'equipe',
        title: 'Equipe',
        price: 299,
        features: ['Até 5 Usuários', 'Plano Profissional', 'Acesso avançado'],
      ),
      Plan(
        id: 'empresa',
        title: 'Empresa',
        price: 499,
        features: ['Usuários ilimitados', 'Plano Empresarial', 'Acesso completo'],
      ),
    ];
  }

  Future<void> confirmPayment({
    required String planId,
    required String method, // "pix" | "boleto" | "card"
  }) async {
    await Future.delayed(const Duration(milliseconds: 900));
  }
}
