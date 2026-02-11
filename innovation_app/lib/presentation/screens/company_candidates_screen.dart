import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../models/application.dart';

class CompanyCandidatesScreen extends StatefulWidget {
  const CompanyCandidatesScreen({super.key});

  @override
  State<CompanyCandidatesScreen> createState() => _CompanyCandidatesScreenState();
}

class _CompanyCandidatesScreenState extends State<CompanyCandidatesScreen> {
  final _api = ApiClient();
  bool loading = true;
  List<Application> applications = [];
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });
    try {
      final data = await _api.getList('/applications/company');
      setState(() {
        applications = data.map((e) => Application.fromJson(e as Map<String, dynamic>)).toList();
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          errorMessage = 'Falha ao carregar candidatos.';
          applications = [];
        });
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _setStatus(Application app, String status) async {
    String? reason;
    if (status == 'rejected') {
      reason = await _askRejectionReason();
      if (reason == null || reason.trim().isEmpty) {
        return;
      }
    }
    final payload = <String, dynamic>{'status': status};
    if (reason != null) {
      payload['rejection_reason'] = reason.trim();
    }
    await _api.patch('/applications/${app.id}', payload);
    await _load();
  }

  Future<String?> _askRejectionReason() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Motivo da reprovação'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Descreva o motivo'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Enviar'),
          ),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<void> _uploadDoc(Application app) async {
    // Placeholder: backend expects multipart upload; integrate file picker later.
    await _api.post('/applications/${app.id}/documents', {'doc_type': 'manual'});
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Documento enviado (placeholder).')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Candidatos')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : applications.isEmpty
              ? Center(
                  child: Text(
                    errorMessage ?? 'Nenhum candidato encontrado.',
                    style: const TextStyle(color: Color(0xFF1A237E)),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: applications.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, index) {
                    final app = applications[index];
                    return Card(
                      color: Colors.white,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Vaga ID: ${app.jobId}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A237E)),
                            ),
                            const SizedBox(height: 6),
                            Text('Candidato ID: ${app.candidateUserId}'),
                            const SizedBox(height: 6),
                            Text('Status: ${app.statusLabel}',
                                style: const TextStyle(color: Color(0xFF3949AB))),
                            if (app.status == 'rejected' && app.rejectionReason != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Motivo: ${app.rejectionReason}',
                                style: const TextStyle(color: Color(0xFF6D4C41)),
                              ),
                            ],
                            if (app.status == 'approved') ...[
                              const SizedBox(height: 6),
                              const Text(
                                'Contato de entrevista: disponível em breve.',
                                style: TextStyle(color: Color(0xFF3949AB)),
                              ),
                            ],
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                ElevatedButton(
                                  onPressed: () => _setStatus(app, 'approved'),
                                  child: const Text('Aprovar'),
                                ),
                                const SizedBox(width: 12),
                                OutlinedButton(
                                  onPressed: () => _setStatus(app, 'rejected'),
                                  child: const Text('Reprovar'),
                                ),
                                const SizedBox(width: 12),
                                TextButton(
                                  onPressed: app.status == 'approved' ? () => _uploadDoc(app) : null,
                                  child: const Text('Anexar PDFs'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
