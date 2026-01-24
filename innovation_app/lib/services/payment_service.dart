class PaymentService {
  Future<List<Map<String, dynamic>>> getPlans() async {
    await Future.delayed(const Duration(seconds: 1));

    return [
      {
        'id': 1,
        'name': 'Free',
        'price': 0,
      },
      {
        'id': 2,
        'name': 'Pro',
        'price': 29.90,
      },
      {
        'id': 3,
        'name': 'Enterprise',
        'price': 79.90,
      },
    ];
  }

  Future<bool> subscribe({
    required int planId,
    required String paymentMethod, // pix, credit, boleto
  }) async {
    await Future.delayed(const Duration(seconds: 2));

    // Aqui entra Mercado Pago depois
    return true;
  }
}
