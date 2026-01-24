import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Innovation',
                style: TextStyle(fontSize: 32, color: Colors.white),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.pushNamed(context, AppRoutes.register);
                },
                child: const Text('Criar conta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


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

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                  const Text('CRIAR USUÁRIO',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  TextField(decoration: const InputDecoration(labelText: 'Nome Completo')),
                  TextField(decoration: const InputDecoration(labelText: 'Email')),
                  TextField(decoration: const InputDecoration(labelText: 'Senha')),
                  TextField(decoration: const InputDecoration(labelText: 'Confirmar Senha')),
                  TextField(decoration: const InputDecoration(labelText: 'Empresa')),
                  TextField(decoration: const InputDecoration(labelText: 'CNPJ')),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () async {
                      await auth.register({});
                      if (context.mounted) {
                        Navigator.pushReplacementNamed(context, AppRoutes.terms);
                      }
                    },
                    child: const Text('Criar Conta'),
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
