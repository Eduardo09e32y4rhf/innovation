import { escapeHtml, layout, type MailContent } from '../mail/mail-templates';

const PORTAL = '#7240da';

/** E-mails do portal de vagas: mesma marca da página de vagas ("i" inclinado + innovation.), só com estilos inline para funcionar em qualquer cliente de e-mail. */
function portalLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta ? `<p style="margin:26px 0 8px"><a href="${escapeHtml(cta.url)}" style="background:${PORTAL};color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">${escapeHtml(cta.label)}</a></p>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#fbfafc;font-family:Arial,Helvetica,sans-serif;color:#241b38"><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:24px 12px"><table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e9e5f0;border-radius:16px"><tr><td style="padding:22px 28px;border-bottom:1px solid #e9e5f0"><table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="width:36px;height:36px;background:${PORTAL};border-radius:10px;text-align:center;color:#ffffff;font-size:22px;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:36px">i</td><td style="padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#241b38">innovation<span style="color:${PORTAL}">.</span><div style="font-size:9px;font-weight:600;letter-spacing:2.4px;color:#736d80">RH · CARREIRAS</div></td></tr></table></td></tr><tr><td style="padding:28px;font-size:15px;line-height:1.6"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">${escapeHtml(title)}</h1>${bodyHtml}${button}</td></tr><tr><td style="background:#1e1145;border-radius:0 0 16px 16px;padding:18px 28px;font-size:12px;line-height:1.5;color:#c9bfe0">Você recebeu este e-mail porque usou o portal de vagas da Innovation RH. Se não foi você, pode ignorar esta mensagem com segurança.</td></tr></table></td></tr></table></body></html>`;
}

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

export function candidatePasswordResetEmail(input: { code: string; minutes: number }): MailContent {
  return {
    subject: `Seu código para criar uma nova senha: ${input.code}`,
    html: portalLayout('Criar uma nova senha', `<p style="margin:0 0 16px">Recebemos um pedido para trocar a senha da sua conta no portal de vagas. Digite o código abaixo na tela para escolher uma nova senha:</p><p style="margin:0 0 16px;background:#f0eafa;border:1px solid #e4d9f4;border-radius:12px;padding:18px;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#5b29be">${escapeHtml(input.code)}</p><p style="margin:0;font-size:13px;color:#6b6478">O código vale por ${input.minutes} minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>`),
    text: `Seu código para criar uma nova senha no portal de vagas Innovation RH: ${input.code}\n\nO código vale por ${input.minutes} minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.`,
  };
}

export function candidateInviteEmail(input: { name: string; company: string; jobTitle: string; message?: string | null; jobUrl: string; accountUrl: string }): MailContent {
  const note = (input.message ?? '').trim();
  return {
    subject: `${input.company} convidou você para a vaga ${input.jobTitle}`,
    html: portalLayout('Você foi convidado(a) para uma vaga', `<p>Olá, ${escapeHtml(input.name)}.</p><p>A <strong>${escapeHtml(input.company)}</strong> viu seu perfil no banco de talentos e convida você para a vaga <strong>${escapeHtml(input.jobTitle)}</strong>.</p>${note ? `<p style="border-left:3px solid #7240da;padding-left:12px">${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}<p style="font-size:12px;color:#666">Seu e-mail e telefone não foram compartilhados com a empresa. Você decide se quer se candidatar. Para sair do banco de talentos, desmarque a opção no seu perfil em <a href="${escapeHtml(input.accountUrl)}">Área do candidato</a>.</p>`, { label: 'Ver a vaga', url: input.jobUrl }),
    text: `Olá, ${input.name}.\n\n${input.company} convida você para a vaga ${input.jobTitle}.${note ? `\n\n${note}` : ''}\n\nVer a vaga: ${input.jobUrl}\nSeus contatos não foram compartilhados. Sair do banco de talentos: ${input.accountUrl}`,
  };
}
