import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

class AuthSession {
  static String? token;
}

class AuthResult {
  const AuthResult({required this.success, this.twoFactorRequired = false, this.userId});

  final bool success;
  final bool twoFactorRequired;
  final int? userId;
}

class AuthService {
  Future<AuthResult> login(String email, String password) async {
    if (email.trim().isEmpty || password.trim().isEmpty) {
      return const AuthResult(success: false);
    }

    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    if (response.statusCode >= 400) {
      return const AuthResult(success: false);
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data['two_factor_required'] == true) {
      return AuthResult(success: false, twoFactorRequired: true, userId: data['user_id'] as int?);
    }

    final token = data['access_token']?.toString();
    if (token == null || token.isEmpty) {
      return const AuthResult(success: false);
    }

    AuthSession.token = token;
    return const AuthResult(success: true);
  }

  Future<bool> verifyCode(int userId, String code) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}/auth/login/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'user_id': userId, 'code': code}),
    );

    if (response.statusCode >= 400) {
      return false;
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final token = data['access_token']?.toString();
    if (token == null || token.isEmpty) {
      return false;
    }

    AuthSession.token = token;
    return true;
  }

  Future<bool> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    if (name.trim().isEmpty || email.trim().isEmpty || phone.trim().isEmpty || password.trim().isEmpty) {
      return false;
    }

    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'password': password,
      }),
    );

    return response.statusCode < 400;
  }

  Future<void> resetPassword(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }
}
