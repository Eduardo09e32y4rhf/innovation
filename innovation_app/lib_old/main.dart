
import 'package:flutter/material.dart';
import 'screens/login.dart';
import 'screens/dashboard.dart';
import 'screens/terms.dart';
import 'screens/create_user.dart';

void main() {
  runApp(const InnovationApp());
}

class InnovationApp extends StatelessWidget {
  const InnovationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Innovation SaaS',
      theme: ThemeData.dark(),
      home: const LoginScreen(),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/dashboard': (_) => const DashboardScreen(),
        '/terms': (_) => const TermsScreen(),
        '/create-user': (_) => const CreateUserScreen(),
      },
    );
  }
}
