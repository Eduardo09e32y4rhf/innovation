import 'dart:ui';
import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _auth = AuthService();

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  bool showPassword = false;
  bool showConfirmPassword = false;
  bool multiEmpresa = false;
  bool loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _doRegister() async {
    if (_password.text != _confirm.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('As senhas não conferem.')),
      );
      return;
    }

    setState(() => loading = true);
    try {
      await _auth.register(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        multiEmpresa: multiEmpresa,
      );
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, AppRoutes.plans);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao criar conta: $e')),
      );
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _GradientBackground(
        child: Center(
          child: _GlassPanel(
            width: 360,
            radius: 30,
            blur: 18,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Criar Conta',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),

                // Nome completo
                _input(
                  controller: _name,
                  hint: 'Nome completo',
                  icon: Icons.person,
                  suffix: const Icon(Icons.error, color: Colors.redAccent),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Informe nome e sobrenome',
                  style: TextStyle(
                    color: Colors.orangeAccent,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 16),

                // Email
                _input(
                  controller: _email,
                  hint: 'Email',
                  icon: Icons.email,
                ),
                const SizedBox(height: 16),

                // Senha
                _input(
                  controller: _password,
                  hint: 'Senha',
                  icon: Icons.lock,
                  obscure: !showPassword,
                  suffix: IconButton(
                    icon: Icon(
                      showPassword ? Icons.visibility_off : Icons.visibility,
                      color: Colors.white70,
                    ),
                    onPressed: () => setState(() => showPassword = !showPassword),
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Minimo 8 caracteres',
                  style: TextStyle(color: Colors.white60, fontSize: 12),
                ),
                const SizedBox(height: 16),

                // Confirmar senha
                _input(
                  controller: _confirm,
                  hint: 'Confirmar Senha',
                  icon: Icons.lock_outline,
                  obscure: !showConfirmPassword,
                  suffix: IconButton(
                    icon: Icon(
                      showConfirmPassword ? Icons.visibility_off : Icons.visibility,
                      color: Colors.white70,
                    ),
                    onPressed: () => setState(() => showConfirmPassword = !showConfirmPassword),
                  ),
                ),
                const SizedBox(height: 24),

                // Switch
                Row(
                  children: [
                    const Text('Ativar multi-empresa?', style: TextStyle(color: Colors.white)),
                    const SizedBox(width: 6),
                    const Icon(Icons.help_outline, size: 16, color: Colors.white70),
                    const Spacer(),
                    Switch(
                      value: multiEmpresa,
                      onChanged: (v) => setState(() => multiEmpresa = v),
                      activeColor: Colors.white,
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Botão
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: loading ? null : _doRegister,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3949AB),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: Text(
                      loading ? 'CRIANDO...' : 'CRIAR CONTA',
                      style: const TextStyle(
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Rodapé
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Já tem uma conta? ', style: TextStyle(color: Colors.white70)),
                    GestureDetector(
                      onTap: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
                      child: const Text(
                        'Entrar',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _input({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white70),
        prefixIcon: Icon(icon, color: Colors.white70),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withOpacity(0.12),
        contentPadding: const EdgeInsets.symmetric(vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

class _GradientBackground extends StatelessWidget {
  final Widget child;
  const _GradientBackground({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF3A0A57),
            Color(0xFF6A1B9A),
            Color(0xFF1A237E),
          ],
        ),
      ),
      child: child,
    );
  }
}

class _GlassPanel extends StatelessWidget {
  final double width;
  final double radius;
  final double blur;
  final EdgeInsets padding;
  final Widget child;

  const _GlassPanel({
    required this.width,
    required this.radius,
    required this.blur,
    required this.padding,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          width: width,
          padding: padding,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.14),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: Colors.white.withOpacity(0.25)),
          ),
          child: child,
        ),
      ),
    );
  }
}
