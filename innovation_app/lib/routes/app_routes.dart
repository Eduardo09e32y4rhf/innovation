import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/reset_password_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/terms_screen.dart';

class AppRoutes {
  static const login = '/login';
  static const register = '/register';
  static const reset = '/reset';
  static const dashboard = '/dashboard';
  static const terms = '/terms';

  static final routes = {
    login: (_) => const LoginScreen(),
    register: (_) => const RegisterScreen(),
    reset: (_) => const ResetPasswordScreen(),
    dashboard: (_) => const DashboardScreen(),
    terms: (_) => const TermsScreen(),
  };
}
