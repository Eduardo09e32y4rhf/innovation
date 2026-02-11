class Application {
  final int id;
  final int jobId;
  final int companyId;
  final int candidateUserId;
  final String status;
  final String? rejectionReason;
  final String? interviewContact;

  Application({
    required this.id,
    required this.jobId,
    required this.companyId,
    required this.candidateUserId,
    required this.status,
    this.rejectionReason,
    this.interviewContact,
  });

  static const Map<String, String> statusLabels = {
    'received': 'Recebida',
    'in_review': 'Em análise',
    'approved': 'Aprovada',
    'rejected': 'Rejeitada',
  };

  String get statusLabel => statusLabels[status] ?? status;

  factory Application.fromJson(Map<String, dynamic> json) => Application(
        id: json['id'] as int,
        jobId: json['job_id'] as int,
        companyId: json['company_id'] as int,
        candidateUserId: json['candidate_user_id'] as int,
        status: (json['status'] ?? '').toString(),
        rejectionReason: json['rejection_reason']?.toString(),
        interviewContact: json['interview_contact']?.toString(),
      );
}
