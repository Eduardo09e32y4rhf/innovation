class Job {
  final int id;
  final int companyId;
  final String title;
  final String description;
  final String? location;
  final String status;

  Job({
    required this.id,
    required this.companyId,
    required this.title,
    required this.description,
    this.location,
    required this.status,
  });

  factory Job.fromJson(Map<String, dynamic> json) => Job(
        id: json['id'] as int,
        companyId: json['company_id'] as int,
        title: (json['title'] ?? '').toString(),
        description: (json['description'] ?? '').toString(),
        location: json['location']?.toString(),
        status: (json['status'] ?? '').toString(),
      );
}
