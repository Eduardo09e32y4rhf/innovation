import 'dart:ui';
import 'package:flutter/material.dart';
import '../routes/app_routes.dart';

class TermsScreen extends StatefulWidget {
  const TermsScreen({super.key});

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
  bool accepted = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF2B0A3D),
              Color(0xFF5E2B97),
              Color(0xFF3B4CCA),
            ],
          ),
        ),
        child: Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(32),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                width: 520,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: Colors.white24),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Row(
                      children: const [
                        Icon(Icons.description, color: Colors.white, size: 28),
                        SizedBox(width: 12),
                        Text(
                          'Termos de Uso',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    const Text(
                      'Selecione um plano e complete o pagamento inicial de forma segura.',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 20),

                    // Terms content
                    Container(
                      height: 260,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.10),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Scrollbar(
                        thumbVisibility: true,
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              _SectionTitle('1. Aceitação dos Termos'),
                              _SectionText(
                                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin eget velit nec quam pellentesque commodo. Nulla facilisi. Praesent scelerisque purus nisl, sed convallis velit vestibulum sit.',
                              ),
                              SizedBox(height: 16),
                              _SectionTitle('2. Modificações nos Termos'),
                              _SectionText(
                                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla in mauris diam. Curabitur ac orci ae ligula fermentum feugiat. Suspendisse potenti.',
                              ),
                              SizedBox(height: 16),
                              _SectionTitle('3. Uso Permitido'),
                              _SectionText(
                                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer fermentum dui nec diam facilisis, nec fermentum nisl vulputate.',
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Checkbox
                    Row(
                      children: [
                        Checkbox(
                          value: accepted,
                          onChanged: (v) => setState(() => accepted = v ?? false),
                          activeColor: Colors.white,
                          checkColor: Colors.black,
                        ),
                        const Expanded(
                          child: Text(
                            'Eu li e concordo com os Termos de Uso',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Buttons
                    Row(
                      children: [
                        Expanded(
                          child: _actionButton(
                            label: 'Cancelar',
                            filled: false,
                            onTap: () => Navigator.pop(context),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _actionButton(
                            label: 'Aceitar e continuar',
                            filled: true,
                            enabled: accepted,
                            onTap: accepted
                                ? () => Navigator.pushReplacementNamed(context, AppRoutes.dashboard)
                                : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/* ===================== COMPONENTS ===================== */

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
    );
  }
}

class _SectionText extends StatelessWidget {
  final String text;
  const _SectionText(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(color: Colors.white70, height: 1.4),
    );
  }
}

Widget _actionButton({
  required String label,
  required bool filled,
  bool enabled = true,
  required VoidCallback? onTap,
}) {
  return SizedBox(
    height: 50,
    child: ElevatedButton(
      onPressed: enabled ? onTap : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: filled ? const Color(0xFF3949AB) : Colors.white.withOpacity(0.12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
      ),
    ),
  );
}
