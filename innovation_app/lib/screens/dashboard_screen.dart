import 'dart:ui';
import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF2B0A3D),
              Color(0xFF4A1E8C),
              Color(0xFF1A237E),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: LayoutBuilder(
          builder: (context, c) {
            // Desktop/Web: sidebar fixa
            if (c.maxWidth >= 900) {
              return Row(
                children: [
                  const _Sidebar(),
                  Expanded(
                    child: Column(
                      children: const [
                        _TopBar(),
                        Expanded(child: _DashboardContent()),
                      ],
                    ),
                  ),
                ],
              );
            }

            // Mobile: drawer
            return Scaffold(
              backgroundColor: Colors.transparent,
              drawer: const Drawer(
                backgroundColor: Colors.transparent,
                child: SafeArea(child: _Sidebar(isDrawer: true)),
              ),
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                title: const Text('Dashboard', style: TextStyle(color: Colors.white)),
                iconTheme: const IconThemeData(color: Colors.white),
              ),
              body: const _DashboardContent(),
            );
          },
        ),
      ),
    );
  }
}

/* ===================== SIDEBAR ===================== */

class _Sidebar extends StatelessWidget {
  final bool isDrawer;
  const _Sidebar({this.isDrawer = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: isDrawer ? double.infinity : 240,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.25),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'INNOVATION\nERAH',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 30),
          _menu(Icons.dashboard, 'Dashboard'),
          _menu(Icons.today, 'Agenda do Dia', active: true),
          _menu(Icons.people, 'Funcionários'),
          _menu(Icons.folder, 'Documentos'),
          _menu(Icons.bar_chart, 'Relatórios'),
          _menu(Icons.settings, 'Configurações'),
          const Spacer(),
          _menu(Icons.logout, 'Sair', onTap: () => Navigator.popUntil(context, (r) => r.isFirst)),
        ],
      ),
    );
  }

  Widget _menu(IconData icon, String label, {bool active = false, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: active ? Colors.white.withOpacity(0.15) : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white70),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

/* ===================== TOP BAR ===================== */

class _TopBar extends StatelessWidget {
  const _TopBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 70,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const TextField(
                style: TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search',
                  hintStyle: TextStyle(color: Colors.white60),
                  prefixIcon: Icon(Icons.search, color: Colors.white70),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 20),
          const CircleAvatar(
            backgroundColor: Colors.deepPurple,
            child: Icon(Icons.person, color: Colors.white),
          ),
        ],
      ),
    );
  }
}

/* ===================== CONTENT ===================== */

class _DashboardContent extends StatelessWidget {
  const _DashboardContent();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: const [
              _KpiCard('238', 'Empresas Ativas', Icons.people),
              _KpiCard('12', 'Documentos\npendentes', Icons.description),
              _KpiCard('8', 'Ativo no dia', Icons.calendar_today),
              _KpiCard('85%', 'Produtividade', Icons.check_circle),
            ],
          ),
          const SizedBox(height: 24),

          LayoutBuilder(builder: (context, c) {
            if (c.maxWidth < 900) {
              return Column(
                children: const [
                  _GlassBox(title: 'Faltas no Mês', height: 220),
                  SizedBox(height: 16),
                  _GlassBox(title: 'Documentos', height: 220),
                ],
              );
            }
            return Row(
              children: const [
                _GlassBox(title: 'Faltas no Mês', height: 260),
                SizedBox(width: 24),
                _GlassBox(title: 'Documentos', height: 260),
              ],
            );
          }),

          const SizedBox(height: 24),
          const Text('Agenda do Dia', style: TextStyle(color: Colors.white, fontSize: 20)),
          const SizedBox(height: 16),

          LayoutBuilder(builder: (context, c) {
            if (c.maxWidth < 900) {
              return Column(
                children: const [
                  _TaskColumn('Hoje'),
                  SizedBox(height: 16),
                  _TaskColumn('Em andamento'),
                  SizedBox(height: 16),
                  _TaskColumn('Concluído'),
                ],
              );
            }
            return Row(
              children: const [
                _TaskColumn('Hoje'),
                SizedBox(width: 16),
                _TaskColumn('Em andamento'),
                SizedBox(width: 16),
                _TaskColumn('Concluído'),
              ],
            );
          }),
        ],
      ),
    );
  }
}

/* ===================== COMPONENTS ===================== */

class _KpiCard extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;

  const _KpiCard(this.value, this.label, this.icon);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      child: Container(
        height: 90,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [Color(0xFF5E35B1), Color(0xFF3949AB)],
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white, size: 32),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _GlassBox extends StatelessWidget {
  final String title;
  final double height;

  const _GlassBox({required this.title, required this.height});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: 1,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            height: height,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.10)),
            ),
            child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
          ),
        ),
      ),
    );
  }
}

class _TaskColumn extends StatelessWidget {
  final String title;

  const _TaskColumn(this.title);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
            const SizedBox(height: 12),
            _task('10:00', 'Reunião com equipe'),
            _task('11:30', 'Preparar contrato'),
          ],
        ),
      ),
    );
  }

  Widget _task(String time, String title) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(time, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          Text(title, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}
