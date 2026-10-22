/** Templates de e-mail transacional (HTML simples, compatível com clientes antigos + versão texto). */
/** Anexo de texto (ex.: convite de agenda .ics). SES simples nao leva anexo: o e-mail sai sem ele. */
export interface MailAttachment { filename: string; content: string; contentType: string }
export interface MailContent { subject: string; html: string; text: string; attachments?: MailAttachment[] }

const BRAND = '#8b00c5';
export const escapeHtml = (value: string) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

export function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
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

/** Codigo de 6 digitos para redefinir a senha. Vale poucos minutos e so aparece neste e-mail (nunca no portal). */
export function passwordResetCodeEmail(input: { name: string; code: string; minutes: number }): MailContent {
  return {
    subject: 'Seu código de recuperação de senha — Innovation RH Connect',
    html: layout('Código de recuperação de senha', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Use o código abaixo na tela de recuperação de senha. Ele vale por ${input.minutes} minutos e só pode ser usado uma vez.</p><p style="font-size:30px;letter-spacing:8px;font-weight:700;font-family:Consolas,monospace;background:#faf7fd;border-radius:8px;padding:14px 18px;text-align:center;margin:20px 0">${escapeHtml(input.code)}</p><p>Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma. Nunca informe este código a ninguém.</p>`),
    text: `Olá, ${input.name}.\n\nSeu código de recuperação de senha: ${input.code}\nVale por ${input.minutes} minutos e só pode ser usado uma vez.\n\nSe não foi você, ignore este e-mail. Nunca informe este código a ninguém.`,
  };
}

/**
 * Boas-vindas com o acesso inicial. E o UNICO lugar onde a senha provisoria aparece: a plataforma nunca a exibe em tela.
 * Vale tambem para reenvio (nova senha provisoria).
 */
export function welcomeAccessEmail(input: { name: string; companyName?: string | null; email: string; temporaryPassword: string; loginUrl: string; expiresAt: Date; reissued?: boolean }): MailContent {
  const company = input.companyName?.trim() || 'sua empresa';
  const validUntil = input.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const subject = input.reissued ? 'Seu novo acesso provisório — Innovation RH Connect' : 'Bem-vindo(a) à Innovation RH Connect — seu acesso';
  const intro = input.reissued ? `Foi gerada uma nova senha provisória para o seu acesso a ${escapeHtml(company)}.` : `Seu acesso a ${escapeHtml(company)} na Innovation RH Connect foi criado. Seja bem-vindo(a)!`;
  const row = (label: string, value: string, mono = false) => `<tr><td style="padding:8px 12px;color:#666;font-size:13px;white-space:nowrap">${label}</td><td style="padding:8px 12px;font-weight:700;${mono ? 'font-family:Consolas,monospace;font-size:18px;letter-spacing:2px;' : ''}word-break:break-all">${escapeHtml(value)}</td></tr>`;
  return {
    subject,
    html: layout(input.reissued ? 'Seu novo acesso' : 'Bem-vindo(a)!', `<p>Olá, ${escapeHtml(input.name)}.</p><p>${intro}</p><table cellpadding="0" cellspacing="0" style="background:#faf7fd;border-radius:8px;margin:16px 0;width:100%">${row('E-mail de acesso', input.email)}${row('Senha provisória', input.temporaryPassword, true)}${row('Válida até', validUntil)}</table><p>No primeiro acesso você será levado(a) a criar uma senha nova e definitiva. Esta senha provisória só é enviada por e-mail: ela não aparece em nenhuma tela da plataforma e ninguém da sua empresa a vê.</p><p style="font-size:13px;color:#666">Não compartilhe este e-mail. Se não esperava este acesso, avise o administrador da sua empresa.</p>`, { label: 'Entrar na plataforma', url: input.loginUrl }),
    text: `Olá, ${input.name}.\n\n${input.reissued ? `Foi gerada uma nova senha provisória para o seu acesso a ${company}.` : `Seu acesso a ${company} na Innovation RH Connect foi criado. Seja bem-vindo(a)!`}\n\nE-mail de acesso: ${input.email}\nSenha provisória: ${input.temporaryPassword}\nVálida até: ${validUntil}\n\nEntre em: ${input.loginUrl}\nNo primeiro acesso você criará uma senha definitiva. Esta senha provisória só é enviada por e-mail e não aparece em nenhuma tela da plataforma.\n\nSe não esperava este acesso, avise o administrador da sua empresa.`,
  };
}

/** Confirmacao de abertura de chamado com o numero de protocolo (o cliente guarda e informa ao atendente). */
export function supportTicketOpenedEmail(input: { name?: string | null; protocol: string; title: string }): MailContent {
  const hello = input.name?.trim() ? `Olá, ${escapeHtml(input.name.trim())}.` : 'Olá.';
  return {
    subject: `Chamado aberto — protocolo ${input.protocol}`,
    html: layout('Recebemos o seu chamado', `<p>${hello}</p><p>Seu chamado foi registrado: <strong>${escapeHtml(input.title)}</strong></p><p style="font-size:24px;letter-spacing:3px;font-weight:700;font-family:Consolas,monospace;background:#faf7fd;border-radius:8px;padding:12px 16px;text-align:center;margin:18px 0">${escapeHtml(input.protocol)}</p><p>Guarde este número de protocolo. Com ele você acompanha o atendimento na aba Suporte e pode pedir informações ao nosso time.</p>`),
    text: `${input.name?.trim() ? `Olá, ${input.name.trim()}.` : 'Olá.'}\n\nSeu chamado foi registrado: ${input.title}\nProtocolo: ${input.protocol}\n\nGuarde este número. Com ele você acompanha o atendimento na aba Suporte.`,
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
