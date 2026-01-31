import 'package:flutter/material.dart';
import '../presentation/screens/login_screen.dart';
import '../presentation/screens/register_screen.dart';
import '../presentation/screens/reset_password_screen.dart';
import '../presentation/screens/dashboard_screen.dart';
import '../presentation/screens/terms_screen.dart';
import '../presentation/screens/document_history_screen.dart';

class AppRoutes {
  static const login = '/';
  static const register = '/register';
  static const resetPassword = '/reset';
  static const dashboard = '/dashboard';
  static const terms = '/terms';
  static const documentHistory = '/documents/history';

  static Map<String, WidgetBuilder> routes = {
    login: (_) => const LoginScreen(),
    register: (_) => const RegisterScreen(),
    resetPassword: (_) => const ResetPasswordScreen(),
    dashboard: (_) => const DashboardScreen(),
    terms: (_) => const TermsScreen(),
    documentHistory: (_) => const DocumentHistoryScreen(),
  };
}
