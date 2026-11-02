import { escapeHtml, layout, type MailContent } from '../mail/mail-templates';

/** E-mails do ciclo de documentos da admissao (RS-D-07, RS-D-17). Nunca trazem o conteudo do documento. */

export function documentApprovedEmail(input: { name: string; company: string; jobTitle: string; label: string; missing: number }): MailContent {
  const next = input.missing > 0 ? `<p style="margin:0">Ainda faltam <strong>${input.missing}</strong> documento(s) para concluir. Use o mesmo link que você recebeu.</p>` : '<p style="margin:0">Todos os documentos pedidos até agora foram aprovados. Obrigado!</p>';
  return {
    subject: `Documento aprovado: ${input.label}`,
    html: layout('Documento aprovado', `<p>Olá, ${escapeHtml(input.name)}.</p><p>O documento <strong>${escapeHtml(input.label)}</strong> foi conferido e <strong>aprovado</strong> pela ${escapeHtml(input.company)} (vaga ${escapeHtml(input.jobTitle)}).</p>${next}`),
    text: `Olá, ${input.name}.\n\nO documento "${input.label}" foi aprovado pela ${input.company} (vaga ${input.jobTitle}).\n${input.missing > 0 ? `Ainda faltam ${input.missing} documento(s). Use o mesmo link recebido.` : 'Todos os documentos pedidos até agora foram aprovados.'}`,
  };
}

export function documentReturnedEmail(input: { name: string; company: string; jobTitle: string; label: string; reason: string; url?: string | null; expires?: string | null }): MailContent {
  const cta = input.url ? { label: 'Enviar novamente', url: input.url } : undefined;
  return {
    subject: `Documento devolvido: ${input.label}`,
    html: layout('Precisamos que você envie novamente', `<p>Olá, ${escapeHtml(input.name)}.</p><p>O documento <strong>${escapeHtml(input.label)}</strong> não pôde ser aprovado pela ${escapeHtml(input.company)} (vaga ${escapeHtml(input.jobTitle)}).</p><p style="margin:12px 0;padding:12px 14px;border-radius:10px;background:#fff1f2;color:#9f1239"><strong>Motivo:</strong> ${escapeHtml(input.reason)}</p>${input.expires ? `<p style="font-size:12px;color:#666">O link é pessoal e vale até ${escapeHtml(input.expires)}.</p>` : ''}`, cta),
    text: `Olá, ${input.name}.\n\nO documento "${input.label}" foi devolvido pela ${input.company} (vaga ${input.jobTitle}).\nMotivo: ${input.reason}\n${input.url ? `\nEnvie novamente: ${input.url}${input.expires ? `\nVálido até ${input.expires}.` : ''}` : ''}`,
  };
}

export function documentReminderEmail(input: { name: string; company: string; jobTitle: string; pending: string[]; url: string; expires: string; daysLeft: number }): MailContent {
  const list = input.pending.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const when = input.daysLeft <= 1 ? 'vence amanhã' : `vence em ${input.daysLeft} dias`;
  return {
    subject: `Lembrete: seu link de documentos ${when}`,
    html: layout('Seu link de documentos está perto de vencer', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Ainda faltam documentos para a vaga <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)}:</p><ul style="margin:0 0 14px;padding-left:20px">${list}</ul><p style="font-size:12px;color:#666">O link vale até ${escapeHtml(input.expires)}.</p>`, { label: 'Enviar documentos', url: input.url }),
    text: `Olá, ${input.name}.\n\nFaltam documentos para a vaga ${input.jobTitle} (${input.company}): ${input.pending.join(', ')}.\nO link ${when} (válido até ${input.expires}): ${input.url}`,
  };
}

export function documentCodeEmail(input: { name: string; code: string; minutes: number }): MailContent {
  return {
    subject: `Seu código para enviar documentos: ${input.code}`,
    html: layout('Código de verificação', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Use o código abaixo para liberar o envio dos documentos. Ele vale por ${input.minutes} minutos e só funciona neste link.</p><p style="font-size:30px;letter-spacing:8px;font-weight:800;margin:14px 0">${escapeHtml(input.code)}</p><p style="font-size:12px;color:#666">Se você não pediu este código, ignore este e-mail.</p>`),
    text: `Olá, ${input.name}.\n\nSeu código para enviar documentos: ${input.code}\nVale por ${input.minutes} minutos. Se não foi você, ignore.`,
  };
}

export function declarationReceiptEmail(input: { name: string; company: string; titles: string[] }): MailContent {
  return {
    subject: 'Recibo das declarações assinadas',
    html: layout('Declarações assinadas', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Registramos o seu aceite eletrônico em nome da ${escapeHtml(input.company)}:</p><ul style="padding-left:20px">${input.titles.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul><p style="font-size:12px;color:#666">O RH guarda o documento em PDF com data, hora e verificação de integridade.</p>`),
    text: `Olá, ${input.name}.\n\nRegistramos o seu aceite eletrônico (${input.company}): ${input.titles.join('; ')}.`,
  };
}
