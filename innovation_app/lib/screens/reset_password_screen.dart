import 'package:flutter/material.dart';

class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        child: Center(
          child: Card(
            margin: const EdgeInsets.all(24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Recuperar Senha',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  TextField(decoration: const InputDecoration(labelText: 'Email')),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Enviar'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
