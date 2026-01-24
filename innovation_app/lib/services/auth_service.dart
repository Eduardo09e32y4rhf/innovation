class AuthService {
  Future<bool> login(String email, String password) async {
    await Future.delayed(const Duration(seconds: 1));

    // MOCK
    if (email.isNotEmpty && password.isNotEmpty) {
      return true;
    }
    return false;
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
  }) async {
    await Future.delayed(const Duration(seconds: 1));
    return true;
  }

  Future<bool> acceptTerms() async {
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }
}
