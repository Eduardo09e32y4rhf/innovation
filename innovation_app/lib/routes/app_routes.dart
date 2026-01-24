import 'package:flutter/material.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/plans_screen.dart';
import '../screens/payment_screen.dart';
import '../screens/terms_screen.dart';
import '../screens/dashboard_screen.dart';

class AppRoutes {
  static const login = '/';
  static const register = '/register';
  static const plans = '/plans';
  static const payment = '/payment';
  static const terms = '/terms';
  static const dashboard = '/dashboard';

  static Map<String, WidgetBuilder> routes = {
    login: (context) => const LoginScreen(),
    register: (context) => const RegisterScreen(),
    plans: (context) => const PlansScreen(),
    payment: (context) => const PaymentScreen(),
    terms: (context) => const TermsScreen(),
    dashboard: (context) => const DashboardScreen(),
  };
}
