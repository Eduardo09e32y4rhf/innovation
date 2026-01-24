class Plan {
  final int id;
  final String name;
  final double price;

  Plan({
    required this.id,
    required this.name,
    required this.price,
  });

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      id: json['id'],
      name: json['name'],
      price: json['price'].toDouble(),
    );
  }
}
