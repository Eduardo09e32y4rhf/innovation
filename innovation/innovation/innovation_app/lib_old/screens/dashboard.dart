
import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      drawer: Drawer(
        child: ListView(
          children: const [
            DrawerHeader(child: Text('Innovation')),
            ListTile(title: Text('Usuários')),
            ListTile(title: Text('Empresas')),
            ListTile(title: Text('Documentos')),
          ],
        ),
      ),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        children: const [
          Card(child: Center(child: Text('Clientes'))),
          Card(child: Center(child: Text('Financeiro'))),
          Card(child: Center(child: Text('Relatórios'))),
          Card(child: Center(child: Text('Configurações'))),
        ],
      ),
    );
  }
}
