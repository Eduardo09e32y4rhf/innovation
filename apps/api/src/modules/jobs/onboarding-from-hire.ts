import { DEFAULT_TASKS } from '../onboarding/onboarding.repository';

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set(['enviar', 'de', 'ou', 'do', 'da', 'foto']);
const keys = (text: string) => norm(text).split(/[^a-z0-9]+/).filter((word) => word.length >= 2 && !STOP.has(word));

/**
 * Tarefas padrão do onboarding; as de envio de documento já nascem concluídas quando o documento correspondente foi aprovado
 * no recrutamento (casamento por palavra-chave: "RG" em "Enviar RG ou CNH", "residência" em "Comprovante de Residencia").
 */
export function onboardingTasksFromDocs(approvedLabels: string[], now = new Date()) {
  const approved = approvedLabels.map(keys);
  return DEFAULT_TASKS.map((task) => {
    const done = task.taskType === 'DOCUMENT_UPLOAD' && approved.some((words) => words.length > 0 && words.every((word) => keys(task.title).includes(word) || norm(task.title).includes(word)));
    return { title: task.title, taskType: task.taskType, required: task.required, completedAt: done ? now : null };
  });
}
