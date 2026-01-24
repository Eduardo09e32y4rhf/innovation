import 'package:flutter/material.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/reset_password_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/terms_screen.dart';

class AppRoutes {
  static const login = '/';
  static const register = '/register';
  static const resetPassword = '/reset';
  static const dashboard = '/dashboard';
  static const terms = '/terms';

  static Map<String, WidgetBuilder> routes = {
    login: (_) => const LoginScreen(),
    register: (_) => const RegisterScreen(),
    resetPassword: (_) => const ResetPasswordScreen(),
    dashboard: (_) => const DashboardScreen(),
    terms: (_) => const TermsScreen(),
  };
}
