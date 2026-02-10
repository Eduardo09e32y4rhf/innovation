import 'package:flutter/material.dart';
import '../../services/api_client.dart';

class DocumentHistoryScreen extends StatefulWidget {
  const DocumentHistoryScreen({super.key});

  @override
  State<DocumentHistoryScreen> createState() => _DocumentHistoryScreenState();
}

class _DocumentHistoryScreenState extends State<DocumentHistoryScreen> {
  final _api = ApiClient();
  bool loading = true;
  List<Map<String, dynamic>> documents = [];
  String? errorMessage;
  bool canAccessIA = false;

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
      final data = await _api.getList('/documents/company');
      setState(() {
        documents = data.cast<Map<String, dynamic>>();
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          errorMessage = 'Falha ao carregar documentos.';
          documents = [];
        });
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Meus Documentos')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : documents.isEmpty
              ? Center(
                  child: Text(
                    errorMessage ?? 'Nenhum documento encontrado.',
                    style: const TextStyle(color: Color(0xFF1A237E)),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: documents.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, index) {
                    final doc = documents[index];
                    final status = doc['status']?.toString() ?? 'pending';
                    final reason = doc['validation_reason']?.toString();
                    final statusLabel = _statusLabel(status);
                    return ListTile(
                      tileColor: Colors.white,
                      title: Text(
                        doc['name']?.toString() ?? 'Documento',
                        style: const TextStyle(color: Color(0xFF1A237E), fontWeight: FontWeight.w600),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doc['doc_type']?.toString() ?? '',
                            style: const TextStyle(color: Color(0xFF3949AB)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Status: $statusLabel',
                            style: TextStyle(color: _statusColor(status)),
                          ),
                          if (status == 'rejected' && reason != null && reason.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Motivo: $reason',
                              style: const TextStyle(color: Color(0xFF3949AB)),
                            ),
                          ],
                        ],
                      ),
                      trailing: TextButton(
                        onPressed: () {
                          if (!canAccessIA) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('IA informativa disponível para planos habilitados.'),
                              ),
                            );
                            return;
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('IA em breve para este documento.')),
                          );
                        },
                        child: const Text('IA'),
                      ),
                    );
                  },
                ),
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'pending':
        return 'Em análise';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return const Color(0xFF2E7D32);
      case 'rejected':
        return const Color(0xFFC62828);
      default:
        return const Color(0xFF3949AB);
    }
  }
}
