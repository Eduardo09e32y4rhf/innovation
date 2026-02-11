class Plan {
  final String id;
  final String title;
  final int price; // em reais (ex: 99)
  final List<String> features;

  const Plan({
    required this.id,
    required this.title,
    required this.price,
    required this.features,
  });
}
