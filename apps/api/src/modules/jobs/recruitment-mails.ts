import { escapeHtml, layout, type MailContent } from '../mail/mail-templates';

export function applicationReceivedEmail(input: { name: string; jobTitle: string; company: string; statusUrl: string; privacyUrl: string }): MailContent {
  return {
    subject: `Recebemos sua candidatura: ${input.jobTitle}`,
    html: layout(`Candidatura recebida`, `<p>Olá, ${escapeHtml(input.name)}.</p><p>Recebemos sua candidatura para <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)}. O RH vai analisar seu perfil e você pode acompanhar cada etapa pelo link abaixo.</p><p style="font-size:12px;color:#666">Seus dados são usados só para este processo seletivo. Para pedir acesso, correção ou exclusão, use <a href="${escapeHtml(input.privacyUrl)}">esta página</a>.</p>`, { label: 'Acompanhar minha candidatura', url: input.statusUrl }),
    text: `Olá, ${input.name}.\n\nRecebemos sua candidatura para ${input.jobTitle} na ${input.company}.\nAcompanhe: ${input.statusUrl}\n\nSeus dados: acesso, correção ou exclusão em ${input.privacyUrl}`,
  };
}

export function applicationRejectedEmail(input: { name: string; jobTitle: string; company: string; message?: string | null; privacyUrl: string }): MailContent {
  const body = (input.message ?? '').trim() || 'Neste momento seguiremos com outros perfis. Agradecemos o seu interesse e o tempo dedicado ao processo.';
  return {
    subject: `Atualização sobre sua candidatura: ${input.jobTitle}`,
    html: layout('Atualização da sua candidatura', `<p>Olá, ${escapeHtml(input.name)}.</p><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p>Vaga: <strong>${escapeHtml(input.jobTitle)}</strong> · ${escapeHtml(input.company)}.</p><p style="font-size:12px;color:#666">Você pode pedir a exclusão dos seus dados quando quiser em <a href="${escapeHtml(input.privacyUrl)}">esta página</a>.</p>`),
    text: `Olá, ${input.name}.\n\n${body}\n\nVaga: ${input.jobTitle} · ${input.company}.\nExclusão de dados: ${input.privacyUrl}`,
  };
}

export function candidateRequestAnsweredEmail(input: { company: string; type: string; response: string }): MailContent {
  const label: Record<string, string> = { ACCESS: 'acesso aos dados', CORRECTION: 'correção de dados', DELETION: 'exclusão de dados' };
  return {
    subject: `Resposta ao seu pedido de ${label[input.type] ?? 'privacidade'}`,
    html: layout('Resposta ao seu pedido', `<p>${escapeHtml(input.company)} respondeu ao seu pedido de ${escapeHtml(label[input.type] ?? 'privacidade')}:</p><p>${escapeHtml(input.response).replace(/\n/g, '<br>')}</p>`),
    text: `${input.company} respondeu ao seu pedido de ${label[input.type] ?? 'privacidade'}:\n\n${input.response}`,
  };
}