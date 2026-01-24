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


import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final email = TextEditingController();
    final password = TextEditingController();
    final auth = AuthService();

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
                  const Text('LOGIN',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),
                  TextField(decoration: const InputDecoration(labelText: 'Email')),
                  TextField(
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Senha'),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () async {
                      final ok = await auth.login(email.text, password.text);
                      if (ok && context.mounted) {
                        Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text('Entrar'),
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.register),
                    child: const Text('Criar conta'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.reset),
                    child: const Text('Esqueci a senha'),
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
