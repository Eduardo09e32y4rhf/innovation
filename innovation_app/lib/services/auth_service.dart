class AuthService {
  Future<bool> login(String email, String password) async {
    await Future.delayed(const Duration(milliseconds: 500));
    return email.isNotEmpty && password.isNotEmpty;
  }

  Future<void> register(Map<String, String> data) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  Future<void> resetPassword(String email) async {
    await Future.delayed(const Duration(milliseconds: 500));
  }
}
