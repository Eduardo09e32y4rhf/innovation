import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/api_client.dart';
import '../../models/job.dart';
import '../../models/application.dart';
import '../../routes/app_routes.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiClient();
  List<Job> jobs = [];
  List<Application> applications = [];
  bool loading = true;
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
      final jobData = await _api.getList('/jobs');
      final appData = await _api.getList('/applications/me');
      setState(() {
        jobs = jobData.map((e) => Job.fromJson(e as Map<String, dynamic>)).toList();
        applications = appData.map((e) => Application.fromJson(e as Map<String, dynamic>)).toList();
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          errorMessage = 'Falha ao carregar vagas. Verifique sua conexão.';
          jobs = [];
          applications = [];
        });
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _apply(Job job) async {
    await _api.post('/applications', {'job_id': job.id});
    await _load();
  }

  Application? _applicationForJob(int jobId) {
    try {
      return applications.firstWhere((a) => a.jobId == jobId);
    } catch (_) {
      return null;
    }
  }

  void _showInterviewContact(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Contato para entrevista'),
        content: const Text(
          'A empresa entrará em contato quando avançar no processo. Notificações serão exibidas aqui.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Ok')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: appGradient(),
        padding: const EdgeInsets.all(20),
        child: loading
            ? const Center(
                child: CircularProgressIndicator(color: Colors.white),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: const Text(
                      'Aviso legal: a Innovation não gera folha nem calcula impostos.',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
                  const Text(
                    'Vagas disponíveis',
                    style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.smart_toy, color: Colors.white70),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Guia IA para candidatura disponível apenas em planos habilitados.',
                            style: TextStyle(color: Colors.white70),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Acesso à IA liberado apenas para planos elegíveis.'),
                              ),
                            );
                          },
                          child: const Text('IA'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (errorMessage != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.6)),
                      ),
                      child: Text(
                        errorMessage!,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    Expanded(
                    child: jobs.isEmpty
                        ? Center(
                            child: Text(
                              errorMessage == null
                                  ? 'Nenhuma vaga disponível no momento.'
                                  : 'Tente novamente mais tarde.',
                              style: const TextStyle(color: Colors.white70),
                            ),
                          )
                        : ListView.separated(
                            itemCount: jobs.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (_, index) {
                              final job = jobs[index];
                              final app = _applicationForJob(job.id);
                              final status = app?.statusLabel;
                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(job.title,
                                        style: const TextStyle(color: Colors.white, fontSize: 18)),
                                    const SizedBox(height: 6),
                                    Text(job.description,
                                        style: const TextStyle(color: Colors.white70)),
                                    if (job.location != null) ...[
                                      const SizedBox(height: 6),
                                      Text(job.location!, style: const TextStyle(color: Colors.white60)),
                                    ],
                                    const SizedBox(height: 10),
                                    if (status == null)
                                      ElevatedButton(
                                        onPressed: () => _apply(job),
                                        child: const Text('Inscrever-se'),
                                      )
                                    else ...[
                                      Text(
                                        'Status: $status',
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                                      ),
                                      if (app?.status == 'rejected' && app?.rejectionReason != null) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          'Motivo: ${app!.rejectionReason}',
                                          style: const TextStyle(color: Colors.white70),
                                        ),
                                      ],
                                      if (app?.status == 'approved') ...[
                                        const SizedBox(height: 8),
                                        TextButton(
                                          onPressed: () => _showInterviewContact(context),
                                          child: const Text('Contato de entrevista'),
                                        ),
                                      ],
                                    ],
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}
