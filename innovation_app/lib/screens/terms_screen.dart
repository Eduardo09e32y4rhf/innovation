import 'package:flutter/material.dart';
import '../routes/app_routes.dart';
import '../theme/app_theme.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Expanded(
              child: SingleChildScrollView(
                child: Text(
                  'Termos de uso...\n\n(placeholder)',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pushReplacementNamed(
                    context, AppRoutes.dashboard);
              },
              child: const Text('Aceitar'),
            ),
          ],
        ),
      ),
    );
  }
}
