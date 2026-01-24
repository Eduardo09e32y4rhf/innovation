import 'package:flutter/material.dart';

class PaymentScreen extends StatelessWidget {
  const PaymentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagamento')),
      body: Column(
        children: [
          ListTile(title: const Text('PIX')),
          ListTile(title: const Text('Cartão de Crédito')),
          ListTile(title: const Text('Boleto')),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/terms');
            },
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
  }
}
