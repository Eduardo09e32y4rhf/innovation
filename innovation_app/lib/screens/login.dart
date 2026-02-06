
import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 350,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Innovation SaaS', style: TextStyle(fontSize: 28)),
              const SizedBox(height: 20),
              const TextField(decoration: InputDecoration(labelText: 'Email')),
              const TextField(decoration: InputDecoration(labelText: 'Senha'), obscureText: true),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.pushNamed(context, '/dashboard'),
                child: const Text('Entrar'),
              ),
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/terms'),
                child: const Text('Termos de uso'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
