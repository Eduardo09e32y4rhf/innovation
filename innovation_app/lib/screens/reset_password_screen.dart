import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ResetPasswordScreen extends StatelessWidget {
  const ResetPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        child: const Center(
          child: Text(
            'Recuperar Senha',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ),
    );
  }
}
