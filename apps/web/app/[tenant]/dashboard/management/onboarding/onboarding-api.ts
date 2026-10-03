import { api } from '@/app/lib/api';

export interface OnboardingTask {
  id: string; title: string; description?: string | null; required: boolean;
  taskType: string; completedAt?: string | null;
}
export interface OnboardingFlow {
  id: string; employeeId: string; status: string; createdAt: string;
  tasks: OnboardingTask[];
  documents: { id: string; name: string; required: boolean; uploadedAt?: string | null }[];
}
export const onboardingApi = {
  list: () => api.request<OnboardingFlow[]>('/onboarding'),
  get: (id: string) => api.request<OnboardingFlow>(`/onboarding/${encodeURIComponent(id)}`),
  create: (employeeId: string) => api.request<OnboardingFlow>('/onboarding', { method: 'POST', body: { employeeId } }),
  completeTask: (taskId: string) => api.request<OnboardingTask>(`/onboarding/tasks/${encodeURIComponent(taskId)}/complete`, { method: 'PATCH' }),
  remove: (id: string) => api.request<OnboardingFlow>(`/onboarding/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
