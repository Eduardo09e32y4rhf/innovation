import 'package:flutter/material.dart';

class PlansScreen extends StatelessWidget {
  const PlansScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Escolha seu Plano')),
      body: Column(
        children: [
          ListTile(title: const Text('Plano Gratuito'), trailing: const Text('R\$ 0')),
          ListTile(title: const Text('Plano Pro'), trailing: const Text('R\$ 49')),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/payment');
            },
            child: const Text('Ir para pagamento'),
          ),
        ],
      ),
    );
  }
}
