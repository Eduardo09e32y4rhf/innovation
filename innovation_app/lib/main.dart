import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'routes/app_routes.dart';

void main() {
  runApp(const InnovationApp());
}

class InnovationApp extends StatelessWidget {
  const InnovationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Innovation.ia',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: AppRoutes.login,
      routes: AppRoutes.routes,
    );
  }
}
