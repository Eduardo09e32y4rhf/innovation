import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../theme/app_theme.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Criar Conta',
                style: TextStyle(color: Colors.white, fontSize: 28)),
            const SizedBox(height: 16),
            TextField(decoration: _input('Nome completo')),
            const SizedBox(height: 12),
            TextField(decoration: _input('Email')),
            const SizedBox(height: 12),
            TextField(
              obscureText: true,
              decoration: _input('Senha'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, AppRoutes.terms);
              },
              child: const Text('Continuar'),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _input(String label) {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white,
      labelText: label,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}
