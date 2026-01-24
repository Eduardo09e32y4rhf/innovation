import '../models/user.dart';

class AuthService {
  // Placeholder (depois conecta no backend)
  Future<AppUser> login({
    required String email,
    required String password,
  }) async {
    await Future.delayed(const Duration(milliseconds: 600));
    return AppUser(id: '1', name: 'Usuário', email: email);
  }

  Future<AppUser> register({
    required String name,
    required String email,
    required String password,
    required bool multiEmpresa,
  }) async {
    await Future.delayed(const Duration(milliseconds: 800));
    return AppUser(id: '1', name: name, email: email, multiEmpresa: multiEmpresa);
  }
}
