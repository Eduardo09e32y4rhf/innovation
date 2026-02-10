import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../models/job.dart';

class JobsManageScreen extends StatefulWidget {
  const JobsManageScreen({super.key});

  @override
  State<JobsManageScreen> createState() => _JobsManageScreenState();
}

class _JobsManageScreenState extends State<JobsManageScreen> {
  final _api = ApiClient();
  bool loading = true;
  List<Job> jobs = [];
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
      final data = await _api.getList('/jobs/company');
      setState(() {
        jobs = data.map((e) => Job.fromJson(e as Map<String, dynamic>)).toList();
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          errorMessage = 'Falha ao carregar vagas da empresa.';
          jobs = [];
        });
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _close(Job job) async {
    await _api.delete('/jobs/${job.id}');
    await _load();
  }

  Future<void> _edit(Job job) async {
    final titleController = TextEditingController(text: job.title);
    final descController = TextEditingController(text: job.description);
    final locationController = TextEditingController(text: job.location ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Editar vaga'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Título')),
            TextField(controller: descController, decoration: const InputDecoration(labelText: 'Descrição')),
            TextField(controller: locationController, decoration: const InputDecoration(labelText: 'Local')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
        ],
      ),
    );

    if (result == true) {
      await _api.patch('/jobs/${job.id}', {
        'title': titleController.text,
        'description': descController.text,
        'location': locationController.text,
      });
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gerenciar Vagas')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : jobs.isEmpty
              ? Center(
                  child: Text(
                    errorMessage ?? 'Nenhuma vaga cadastrada ainda.',
                    style: const TextStyle(color: Color(0xFF1A237E)),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: jobs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, index) {
                    final job = jobs[index];
                    return Card(
                      color: Colors.white,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              job.title,
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A237E)),
                            ),
                            const SizedBox(height: 6),
                            Text(job.description),
                            const SizedBox(height: 6),
                            Text('Status: ${job.status}', style: const TextStyle(color: Color(0xFF3949AB))),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                ElevatedButton(onPressed: () => _edit(job), child: const Text('Editar')),
                                const SizedBox(width: 12),
                                OutlinedButton(onPressed: () => _close(job), child: const Text('Encerrar')),
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
