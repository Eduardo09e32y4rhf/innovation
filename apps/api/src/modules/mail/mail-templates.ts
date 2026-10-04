/** Templates de e-mail transacional (HTML simples, compatível com clientes antigos + versão texto). */
export interface MailContent { subject: string; html: string; text: string }

const BRAND = '#8b00c5';
export const escapeHtml = (value: string) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p><p style="font-size:12px;color:#666">Se o botão não funcionar, copie este endereço no navegador:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f1f8;font-family:Arial,Helvetica,sans-serif;color:#1f1b2d"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px"><table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden"><tr><td style="background:${BRAND};color:#fff;padding:18px 28px;font-size:18px;font-weight:700">Innovation RH Connect</td></tr><tr><td style="padding:28px"><h1 style="font-size:20px;margin:0 0 14px">${escapeHtml(title)}</h1>${bodyHtml}${button}</td></tr><tr><td style="padding:16px 28px;background:#faf7fd;font-size:11px;color:#777">Você recebeu este e-mail porque há uma conta associada a este endereço. Se não reconhece esta ação, ignore a mensagem ou fale com o suporte.</td></tr></table></td></tr></table></body></html>`;
}

export function passwordResetEmail(input: { name: string; url: string; minutes: number }): MailContent {
  return {
    subject: 'Redefinição de senha — Innovation RH Connect',
    html: layout('Redefinir sua senha', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Recebemos um pedido para redefinir a senha da sua conta. O link vale por ${input.minutes} minutos e só pode ser usado uma vez.</p><p>Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`, { label: 'Criar nova senha', url: input.url }),
    text: `Olá, ${input.name}.\n\nPara redefinir sua senha acesse (válido por ${input.minutes} minutos, uso único):\n${input.url}\n\nSe não foi você, ignore este e-mail.`,
  };
}

export function emailVerificationEmail(input: { name: string; url: string }): MailContent {
  return {
    subject: 'Confirme seu e-mail — Innovation RH Connect',
    html: layout('Confirme seu e-mail', `<p>Olá, ${escapeHtml(input.name)}. Falta só confirmar que este e-mail é seu.</p>`, { label: 'Confirmar e-mail', url: input.url }),
    text: `Olá, ${input.name}.\n\nConfirme seu e-mail acessando:\n${input.url}`,
  };
}

export function userInviteEmail(input: { name: string; company: string; loginUrl: string; invitedBy?: string }): MailContent {
  return {
    subject: `Você foi convidado para ${input.company} — Innovation RH Connect`,
    html: layout(`Seu acesso à ${escapeHtml(input.company)}`, `<p>Olá, ${escapeHtml(input.name)}.</p><p>${input.invitedBy ? `${escapeHtml(input.invitedBy)} liberou` : 'Foi liberado'} o seu acesso. A senha provisória é entregue por quem criou o acesso e deve ser trocada no primeiro login.</p>`, { label: 'Entrar na plataforma', url: input.loginUrl }),
    text: `Olá, ${input.name}.\n\nSeu acesso a ${input.company} foi liberado. Entre em ${input.loginUrl} com a senha provisória informada por quem criou o acesso.`,
  };
}

export function securityAlertEmail(input: { name: string; title: string; detail: string; ip?: string | null; userAgent?: string | null; at: Date }): MailContent {
  const when = input.at.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const where = [input.ip ? `IP ${input.ip}` : '', input.userAgent ? input.userAgent.slice(0, 120) : ''].filter(Boolean).join(' · ');
  return {
    subject: `Alerta de segurança: ${input.title}`,
    html: layout(input.title, `<p>Olá, ${escapeHtml(input.name)}.</p><p>${escapeHtml(input.detail)}</p><p style="background:#faf7fd;padding:12px;border-radius:8px;font-size:13px">${escapeHtml(when)}${where ? `<br>${escapeHtml(where)}` : ''}</p><p>Se não foi você, troque sua senha imediatamente e avise o administrador.</p>`),
    text: `Olá, ${input.name}.\n\n${input.title}\n${input.detail}\n${when}${where ? `\n${where}` : ''}\n\nSe não foi você, troque sua senha imediatamente.`,
  };
}
