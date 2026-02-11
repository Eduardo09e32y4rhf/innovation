import 'package:flutter/material.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _auth = AuthService();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

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
            TextField(
              controller: _nameController,
              decoration: _input('Nome completo'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              decoration: _input('Email'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              decoration: _input('Telefone (com DDI)'),
            ),
            const SizedBox(height: 12),
            TextField(
              obscureText: true,
              controller: _passwordController,
              decoration: _input('Senha'),
            ),
            const SizedBox(height: 16),
            const SizedBox(height: 20),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.redAccent)),
              const SizedBox(height: 12),
            ],
            ElevatedButton(
              onPressed: _loading
                  ? null
                  : () async {
                      setState(() {
                        _loading = true;
                        _error = null;
                      });
                      final ok = await _auth.register(
                        name: _nameController.text,
                        email: _emailController.text,
                        phone: _phoneController.text,
                        password: _passwordController.text,
                      );
                      if (!mounted) return;
                      if (ok) {
                        Navigator.pushNamed(context, AppRoutes.login);
                      } else {
                        setState(() => _error = 'Falha ao cadastrar');
                      }
                      setState(() => _loading = false);
                    },
              child: Text(_loading ? 'Enviando...' : 'Continuar'),
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

  Widget _profileChoice({
    required BuildContext context,
    required String label,
    required String route,
  }) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () => Navigator.pushNamed(context, route),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Colors.white70),
          foregroundColor: Colors.white,
        ),
        child: Text(label),
      ),
    );
  }
}
