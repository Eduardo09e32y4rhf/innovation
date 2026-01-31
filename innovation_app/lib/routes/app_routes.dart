import 'package:flutter/material.dart';
import '../presentation/screens/login_screen.dart';
import '../presentation/screens/register_screen.dart';
import '../presentation/screens/reset_password_screen.dart';
import '../presentation/screens/dashboard_screen.dart';
import '../presentation/screens/terms_screen.dart';
import '../presentation/screens/plans_screen.dart';
import '../presentation/screens/payment_screen.dart';
import '../presentation/screens/company_candidates_screen.dart';
import '../presentation/screens/jobs_manage_screen.dart';
import '../presentation/screens/document_history_screen.dart';

class AppRoutes {
  static const login = '/';
  static const register = '/register';
  static const resetPassword = '/reset';
  static const dashboard = '/dashboard';
  static const terms = '/terms';
  static const plans = '/plans';
  static const payment = '/payment';
  static const companyCandidates = '/company/candidates';
  static const jobsManage = '/company/jobs';
  static const documentHistory = '/documents/history';

  static Map<String, WidgetBuilder> routes = {
    login: (_) => const LoginScreen(),
    register: (_) => const RegisterScreen(),
    resetPassword: (_) => const ResetPasswordScreen(),
    dashboard: (_) => const DashboardScreen(),
    terms: (_) => const TermsScreen(),
    plans: (_) => const PlansScreen(),
    payment: (_) => const PaymentScreen(),
    companyCandidates: (_) => const CompanyCandidatesScreen(),
    jobsManage: (_) => const JobsManageScreen(),
    documentHistory: (_) => const DocumentHistoryScreen(),
  };
}
