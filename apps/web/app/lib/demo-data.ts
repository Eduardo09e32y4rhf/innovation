import type { AppUser, Chat, ChatMessage, DashboardSummary, Employee, TimeTrack, Vacation, WhatsappStatus } from './api';

const now = new Date();
const today = now.toISOString();
const day = 24 * 60 * 60 * 1000;

export const demoSummary: DashboardSummary = {
  activeEmployees: 42,
  timeTracksToday: 38,
  pendingVacations: 6,
  whatsappMessages: 184,
  totalTimeBalance: 312,
};

export const demoTimeTracks: TimeTrack[] = [
  {
    id: 'demo-time-1',
    employeeId: 'demo-employee-1',
    date: today,
    entry: new Date(now.setHours(8, 2, 0, 0)).toISOString(),
    exit: new Date(now.setHours(17, 48, 0, 0)).toISOString(),
    totalWorked: 526,
    dailyBalance: 46,
    employee: {
      id: 'demo-employee-1',
      companyId: 'demo-company',
      name: 'Marina Costa',
      cpf: '12345678901',
      email: 'marina@empresa.com',
      position: 'Analista de RH',
      department: 'Recursos Humanos',
      admissionDate: '2023-04-03',
      status: 'ACTIVE',
      createdAt: today,
      updatedAt: today,
    },
  },
  {
    id: 'demo-time-2',
    employeeId: 'demo-employee-2',
    date: today,
    entry: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    exit: null,
    totalWorked: null,
    dailyBalance: null,
    employee: {
      id: 'demo-employee-2',
      companyId: 'demo-company',
      name: 'Rafael Almeida',
      cpf: '98765432100',
      email: 'rafael@empresa.com',
      position: 'Supervisor',
      department: 'Operacoes',
      admissionDate: '2022-08-15',
      status: 'ACTIVE',
      createdAt: today,
      updatedAt: today,
    },
  },
  {
    id: 'demo-time-3',
    employeeId: 'demo-employee-3',
    date: today,
    entry: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    exit: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    totalWorked: 410,
    dailyBalance: -10,
    employee: {
      id: 'demo-employee-3',
      companyId: 'demo-company',
      name: 'Bianca Torres',
      cpf: '45678912300',
      email: 'bianca@empresa.com',
      position: 'Assistente Administrativo',
      department: 'Administrativo',
      admissionDate: '2024-01-10',
      status: 'ACTIVE',
      createdAt: today,
      updatedAt: today,
    },
  },
];

export const demoEmployees: Employee[] = demoTimeTracks
  .map((track) => track.employee)
  .filter(Boolean) as Employee[];

export const demoVacations: Vacation[] = [
  {
    id: 'demo-vacation-1',
    employeeId: 'demo-employee-1',
    acquisitionPeriod: '2025/2026',
    startDate: new Date(Date.now() + 12 * day).toISOString(),
    endDate: new Date(Date.now() + 21 * day).toISOString(),
    daysUsed: 10,
    status: 'PENDING',
    employee: demoTimeTracks[0].employee,
  },
  {
    id: 'demo-vacation-2',
    employeeId: 'demo-employee-2',
    acquisitionPeriod: '2025/2026',
    startDate: new Date(Date.now() + 30 * day).toISOString(),
    endDate: new Date(Date.now() + 44 * day).toISOString(),
    daysUsed: 15,
    status: 'APPROVED',
    employee: demoTimeTracks[1].employee,
  },
  {
    id: 'demo-vacation-3',
    employeeId: 'demo-employee-3',
    acquisitionPeriod: '2024/2025',
    startDate: new Date(Date.now() + 5 * day).toISOString(),
    endDate: new Date(Date.now() + 9 * day).toISOString(),
    daysUsed: 5,
    status: 'PENDING',
    employee: demoTimeTracks[2].employee,
  },
];

export const demoUsers: AppUser[] = [
  {
    id: 'demo-user-1',
    companyId: 'demo-company',
    name: 'Marina Costa',
    email: 'marina@empresa.com',
    role: 'RH',
    createdAt: today,
  },
  {
    id: 'demo-user-2',
    companyId: 'demo-company',
    name: 'Rafael Almeida',
    email: 'rafael@empresa.com',
    role: 'GESTOR',
    createdAt: today,
  },
  {
    id: 'demo-user-3',
    companyId: 'demo-company',
    name: 'Admin Innovation',
    email: 'admin@innovation.local',
    role: 'ADMIN',
    createdAt: today,
  },
];

export const demoWhatsappStatus: WhatsappStatus = {
  status: 'CONNECTED',
  phone: '+55 11 99999-0000',
  displayName: 'Innovation RH',
};

export const demoChats: Chat[] = [
  {
    id: 'demo-chat-1',
    name: 'Marina Costa',
    isGroup: false,
    unreadCount: 2,
    time: '09:42',
    lastMessage: 'Preciso confirmar o periodo de ferias.',
  },
  {
    id: 'demo-chat-2',
    name: 'Equipe Operacional',
    isGroup: true,
    unreadCount: 5,
    time: '08:15',
    lastMessage: 'Escala de hoje atualizada no painel.',
  },
  {
    id: 'demo-chat-3',
    name: 'Rafael Almeida',
    isGroup: false,
    unreadCount: 0,
    time: 'Ontem',
    lastMessage: 'Registro de ponto conferido.',
  },
];

export const demoMessages: ChatMessage[] = [
  {
    id: 'demo-message-1',
    sender: 'user',
    participantName: 'Marina Costa',
    text: 'Bom dia! Consegue confirmar minhas ferias para o proximo mes?',
    time: '09:40',
  },
  {
    id: 'demo-message-2',
    sender: 'bot',
    participantName: 'RH',
    text: 'Claro, Marina. Sua solicitacao esta em analise e aparece no painel de ferias.',
    time: '09:42',
  },
];

export function isLocalPresentation() {
  if (typeof window === 'undefined') return false;
  const token = window.localStorage.getItem('token');
  return token === 'innovation-rh-connect-local-session';
}
