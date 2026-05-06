// RH/services/OnboardingService.ts
export class OnboardingService {
  /**
   * Gera um checklist de onboarding personalizado para o novo contratado.
   */
  static generateChecklist(candidateName: string, role: string) {
    const defaultTasks = [
      { id: 1, task: "Configuração de E-mail Corporativo", done: false },
      { id: 2, task: "Assinatura de Contrato Digital", done: false },
      { id: 3, task: "Acesso ao Workspace do Slack/Discord", done: false },
      { id: 4, task: "Setup do ambiente de desenvolvimento", done: false },
      { id: 5, task: "Reunião de Boas-vindas com o Time", done: false }
    ];

    console.log(`📋 Gerando Onboarding para ${candidateName} (${role})`);

    return {
      candidateName,
      role,
      startDate: new Date().toLocaleDateString(),
      tasks: defaultTasks
    };
  }
}
