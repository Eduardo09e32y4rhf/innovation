import 'package:flutter/material.dart';
import 'routes/app_routes.dart';

void main() {
  runApp(const InnovationApp());
}

class InnovationApp extends StatelessWidget {
  const InnovationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'INNOVATION.IA',
      initialRoute: AppRoutes.login,
      routes: AppRoutes.routes,
    );
  }
}
