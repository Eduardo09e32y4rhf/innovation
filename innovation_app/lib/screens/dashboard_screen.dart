import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard RH')),
      body: const Center(
        child: Text(
          'Bem-vindo ao Innovation 🚀',
          style: TextStyle(fontSize: 22),
        ),
      ),
    );
  }
}
