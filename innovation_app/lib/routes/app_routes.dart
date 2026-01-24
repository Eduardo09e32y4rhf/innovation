import 'package:flutter/material.dart';

import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/plans_screen.dart';
import '../screens/payment_screen.dart';
import '../screens/terms_screen.dart';

class AppRoutes {
  static const login = '/login';
  static const register = '/register';
  static const dashboard = '/dashboard';
  static const plans = '/plans';
  static const payment = '/payment';
  static const terms = '/terms';

  static Map<String, WidgetBuilder> get routes => {
        login: (_) => const LoginScreen(),
        register: (_) => const RegisterScreen(),
        dashboard: (_) => const DashboardScreen(),
        plans: (_) => const PlansScreen(),
        payment: (_) => const PaymentScreen(),
        terms: (_) => const TermsScreen(),
      };
}
