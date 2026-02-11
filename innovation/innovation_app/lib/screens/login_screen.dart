import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Innovation',
              style: TextStyle(color: Colors.white, fontSize: 32),
            ),
            const SizedBox(height: 24),
            TextField(
              decoration: _input('Email'),
            ),
            const SizedBox(height: 12),
            TextField(
              obscureText: true,
              decoration: _input('Senha'),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.pushReplacementNamed(
                    context, AppRoutes.dashboard);
              },
              child: const Text('Entrar'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, AppRoutes.register);
              },
              child: const Text('Criar conta'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, AppRoutes.resetPassword);
              },
              child: const Text('Esqueci a senha'),
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
