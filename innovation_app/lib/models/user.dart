class User {
  final String name;
  final String email;
  final String company;

  User({
    required this.name,
    required this.email,
    required this.company,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      name: json['name'],
      email: json['email'],
      company: json['company'],
    );
  }
}
