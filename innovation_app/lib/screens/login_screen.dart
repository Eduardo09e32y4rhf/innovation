import 'dart:ui';
import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _auth = AuthService();

  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool rememberMe = true;
  bool loading = false;
  bool obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _doLogin() async {
    FocusScope.of(context).unfocus();

    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => loading = true);
    try {
      await _auth.login(
        email: _email.text.trim(),
        password: _password.text,
      );
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao entrar: $e')),
      );
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _ModernAuthBackground(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: _AuthCard(
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Header(),
                      const SizedBox(height: 24),

                      _FieldLabel('E-mail'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: _inputDecoration(
                          hint: 'voce@email.com',
                          icon: Icons.mail_outline,
                        ),
                        validator: (v) {
                          final value = (v ?? '').trim();
                          if (value.isEmpty) return 'Informe seu e-mail';
                          if (!value.contains('@') || !value.contains('.')) {
                            return 'E-mail inválido';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      _FieldLabel('Senha'),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _password,
                        obscureText: obscure,
                        autofillHints: const [AutofillHints.password],
                        decoration: _inputDecoration(
                          hint: '••••••••',
                          icon: Icons.lock_outline,
                          suffix: IconButton(
                            onPressed: () => setState(() => obscure = !obscure),
                            icon: Icon(
                              obscure ? Icons.visibility_off : Icons.visibility,
                            ),
                            tooltip: obscure ? 'Mostrar senha' : 'Ocultar senha',
                          ),
                        ),
                        validator: (v) {
                          final value = (v ?? '');
                          if (value.isEmpty) return 'Informe sua senha';
                          if (value.length < 6) return 'Senha muito curta';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Checkbox(
                            value: rememberMe,
                            onChanged: (v) => setState(() => rememberMe = v ?? true),
                          ),
                          const Text('Lembrar de mim'),
                          const Spacer(),
                          TextButton(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Implementar recuperação de senha.')),
                              );
                            },
                            child: const Text('Esqueceu a senha?'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      SizedBox(
                        height: 52,
                        child: FilledButton(
                          onPressed: loading ? null : _doLogin,
                          child: Text(loading ? 'ENTRANDO...' : 'ENTRAR'),
                        ),
                      ),
                      const SizedBox(height: 12),

                      SizedBox(
                        height: 48,
                        child: OutlinedButton(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.register),
                          child: const Text('CRIAR CONTA'),
                        ),
                      ),

                      const SizedBox(height: 18),
                      Center(
                        child: InkWell(
                          onTap: () => Navigator.pushNamed(context, AppRoutes.terms),
                          child: const Text(
                            'Termos de uso',
                            style: TextStyle(
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon),
      suffixIcon: suffix,
      filled: true,
      fillColor: const Color(0xFFF3F4F6),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(width: 1.4),
      ),
    );
  }
}

class _ModernAuthBackground extends StatelessWidget {
  final Widget child;
  const _ModernAuthBackground({required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Fundo base (mais “premium” e menos chapado)
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF0B1220),
                Color(0xFF111A2E),
                Color(0xFF22124A),
              ],
            ),
          ),
        ),

        // Formas suaves
        Positioned(
          left: -120,
          top: -90,
          child: _GlowBlob(color: Color(0xFF7C3AED), size: 260),
        ),
        Positioned(
          right: -140,
          bottom: -120,
          child: _GlowBlob(color: Color(0xFF2563EB), size: 320),
        ),
        Positioned(
          right: 60,
          top: 80,
          child: _GlowBlob(color: Color(0xFFF97316), size: 140),
        ),

        // Leve blur geral
        BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
          child: Container(color: Colors.transparent),
        ),

        child,
      ],
    );
  }
}

class _GlowBlob extends StatelessWidget {
  final Color color;
  final double size;
  const _GlowBlob({required this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.26),
        shape: BoxShape.circle,
      ),
    );
  }
}

class _AuthCard extends StatelessWidget {
  final Widget child;
  const _AuthCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            blurRadius: 26,
            spreadRadius: 2,
            color: Colors.black.withOpacity(0.28),
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.92),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withOpacity(0.6)),
          ),
          child: Theme(
            data: ThemeData(
              useMaterial3: true,
              colorSchemeSeed: const Color(0xFF4F46E5),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
            ),
          ),
          child: const Icon(Icons.auto_awesome, color: Colors.white),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'INNOVATION.IA',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              SizedBox(height: 2),
              Text(
                'Acesse sua conta para continuar',
                style: TextStyle(color: Colors.black54),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(fontWeight: FontWeight.w700),
    );
  }
}
