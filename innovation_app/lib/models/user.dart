class AppUser {
  final String id;
  final String name;
  final String email;
  final bool multiEmpresa;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.multiEmpresa = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        email: (json['email'] ?? '').toString(),
        multiEmpresa: (json['multiEmpresa'] ?? false) == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'multiEmpresa': multiEmpresa,
      };
}
