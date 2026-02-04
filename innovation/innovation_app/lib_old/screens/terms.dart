
import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Termos de Uso')),
      body: const Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'Ao utilizar este sistema, você concorda com os termos...',
        ),
      ),
    );
  }
}
