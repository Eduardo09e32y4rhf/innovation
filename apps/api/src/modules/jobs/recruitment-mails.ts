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

export function applicationDuplicateEmail(input: { name: string; jobTitle: string; company: string; accountUrl: string; privacyUrl: string }): MailContent {
  return {
    subject: `Sua candidatura já estava registrada: ${input.jobTitle}`,
    html: layout('Candidatura já registrada', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Alguém enviou novamente uma candidatura para <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)} usando este e-mail. Como você já tinha se candidatado, nada foi alterado e o seu cadastro continua igual.</p><p>Se não foi você, ignore esta mensagem. Para acompanhar suas candidaturas, entre na sua conta. Seus dados: <a href="${escapeHtml(input.privacyUrl)}">privacidade</a>.</p>`, { label: 'Entrar na área do candidato', url: input.accountUrl }),
    text: `Olá, ${input.name}.\n\nUma candidatura para ${input.jobTitle} (${input.company}) foi enviada novamente com este e-mail. Você já havia se candidatado; nada foi alterado.\nSe não foi você, ignore. Área do candidato: ${input.accountUrl}\nPrivacidade: ${input.privacyUrl}`,
  };
}

export function consentReceiptEmail(input: { name: string; company: string; jobTitle: string; version: string; items: { label: string; text: string; revokeUrl: string; confirmUrl: string | null }[] }): MailContent {
  const rows = input.items.map((item) => `<div style="margin:0 0 14px;padding:12px 14px;border:1px solid #e4d9f4;border-radius:10px"><p style="margin:0 0 6px;font-weight:700">${escapeHtml(item.label)}</p><p style="margin:0 0 8px;font-size:13px;color:#4b4560">${escapeHtml(item.text)}</p>${item.confirmUrl ? `<p style="margin:0 0 6px;font-size:13px"><strong>Falta um passo:</strong> <a href="${escapeHtml(item.confirmUrl)}">confirme que foi você</a>. Sem isso seu perfil não entra no banco de talentos.</p>` : ''}<p style="margin:0;font-size:12px"><a href="${escapeHtml(item.revokeUrl)}">Revogar este consentimento</a></p></div>`).join('');
  return {
    subject: `Recibo dos seus consentimentos (${input.jobTitle})`,
    html: layout('Recibo de consentimento', `<p>Olá, ${escapeHtml(input.name)}.</p><p>Registramos, em nome da ${escapeHtml(input.company)} e para a vaga <strong>${escapeHtml(input.jobTitle)}</strong>, o que você autorizou (política versão ${escapeHtml(input.version)}). Guarde este e-mail como comprovante.</p>${rows}<p style="font-size:12px;color:#666">Você pode revogar quando quiser pelos links acima ou na sua conta.</p>`),
    text: `Olá, ${input.name}.\n\nRecibo dos consentimentos registrados (${input.company}, ${input.jobTitle}, política ${input.version}):\n\n${input.items.map((item) => `- ${item.label}: ${item.text}\n  ${item.confirmUrl ? `Confirmar: ${item.confirmUrl}\n  ` : ''}Revogar: ${item.revokeUrl}`).join('\n')}`,
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

export function candidateStageChangedEmail(input: { name: string; jobTitle: string; company: string; stage: string; statusUrl?: string | null }): MailContent {
  const body = `<p>Olá, ${escapeHtml(input.name)}.</p><p>Sua candidatura para <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)} avançou.</p><p style="margin:18px 0;padding:14px 16px;border-radius:10px;background:#f0eafa;color:#4c1d95;font-weight:700">${escapeHtml(input.stage)}</p>`;
  return { subject: `Sua candidatura avançou: ${input.jobTitle}`, html: portalLayout('Atualização da sua candidatura', body, input.statusUrl ? { label: 'Acompanhar candidatura', url: input.statusUrl } : undefined), text: `Olá, ${input.name}.\n\nSua candidatura para ${input.jobTitle} na ${input.company} avançou para: ${input.stage}.${input.statusUrl ? `\n\nAcompanhe: ${input.statusUrl}` : ''}` };
}

export function candidateRequestConfirmEmail(input: { type: string; confirmUrl: string; hours: number }): MailContent {
  const label: Record<string, string> = { ACCESS: 'acesso aos seus dados', CORRECTION: 'correção dos seus dados', DELETION: 'exclusão dos seus dados' };
  const what = label[input.type] ?? 'privacidade';
  return {
    subject: 'Confirme seu pedido de privacidade',
    html: layout('Confirme seu pedido', `<p>Recebemos um pedido de <strong>${escapeHtml(what)}</strong> para este e-mail. Para garantir que foi você, confirme no botão abaixo (o link vale ${input.hours} horas e só pode ser usado uma vez).</p><p style="font-size:12px;color:#666">Se não foi você, ignore esta mensagem: nada será feito.</p>`, { label: 'Confirmar meu pedido', url: input.confirmUrl }),
    text: `Recebemos um pedido de ${what} para este e-mail. Confirme em até ${input.hours} horas: ${input.confirmUrl}\nSe não foi você, ignore esta mensagem.`,
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

export function candidateEmailVerificationEmail(input: { code: string; minutes: number }): MailContent {
  return {
    subject: `Confirme seu e-mail: código ${input.code}`,
    html: portalLayout('Confirme seu e-mail', `<p style="margin:0 0 16px">Bem-vindo(a) ao portal de vagas. Digite o código abaixo na tela para confirmar que este e-mail é seu:</p><p style="margin:0 0 16px;background:#f0eafa;border:1px solid #e4d9f4;border-radius:12px;padding:18px;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;color:#5b29be">${escapeHtml(input.code)}</p><p style="margin:0;font-size:13px;color:#6b6478">O código vale por ${input.minutes} minutos. Se você não criou esta conta, ignore este e-mail.</p>`),
    text: `Seu código para confirmar o e-mail no portal de vagas Innovation RH: ${input.code}\nVale por ${input.minutes} minutos. Se você não criou a conta, ignore.`,
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

export interface InterviewMailInput {
  name: string;
  company: string;
  jobTitle: string;
  when: { long: string; short: string };
  durationMinutes: number;
  mode: 'PRESENCIAL' | 'ONLINE';
  location?: string | null;
  mapsUrl?: string | null;
  meetingUrl?: string | null;
  meetingProvider?: string | null;
  interviewer: string;
  message?: string | null;
  calendarUrl: string;
  statusUrl?: string | null;
  /** Pagina para confirmar presenca ou avisar que nao pode. */
  responseUrl?: string | null;
  /** Lembrete da vespera (mesmo conteudo, outro assunto). */
  reminder?: boolean;
}

const row = (label: string, valueHtml: string) => `<tr><td style="padding:8px 0;width:110px;vertical-align:top;font-size:13px;color:#6b6478">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:15px;color:#241b38;font-weight:600">${valueHtml}</td></tr>`;

/** Convite de entrevista: data no horario de Brasilia, presencial (endereco + mapa) ou online (botao da reuniao). */
export function candidateInterviewEmail(input: InterviewMailInput): MailContent {
  const online = input.mode === 'ONLINE';
  const where = online
    ? `${escapeHtml(input.meetingProvider || 'Reunião online')}<br><a href="${escapeHtml(input.meetingUrl ?? '')}" style="color:#5b29be;font-weight:600;word-break:break-all">${escapeHtml(input.meetingUrl ?? '')}</a>`
    : `${escapeHtml(input.location ?? '')}${input.mapsUrl ? `<br><a href="${escapeHtml(input.mapsUrl)}" style="color:#5b29be;font-weight:600">Ver no mapa</a>` : ''}`;
  const details = `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:6px 0 18px;background:#f8f5fd;border:1px solid #e4d9f4;border-radius:12px;padding:6px 18px">${row('Quando', escapeHtml(input.when.long))}${row('Duração', `cerca de ${input.durationMinutes} min`)}${row('Formato', online ? 'Online' : 'Presencial')}${row(online ? 'Link' : 'Endereço', where)}${row('Com', escapeHtml(input.interviewer))}</table>`;
  const note = (input.message ?? '').trim();
  const tips = online
    ? 'Entre no link alguns minutos antes, teste câmera e microfone e escolha um lugar silencioso.'
    : 'Chegue com 10 minutos de antecedência e leve um documento com foto.';
  const action = online && input.meetingUrl ? { label: 'Entrar na reunião', url: input.meetingUrl } : input.mapsUrl ? { label: 'Como chegar', url: input.mapsUrl } : null;
  const button = action ? `<p style="margin:0 0 18px"><a href="${escapeHtml(action.url)}" style="background:#7240da;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">${escapeHtml(action.label)}</a></p>` : '';
  const confirm = input.responseUrl ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px"><tr><td style="padding:0 8px 8px 0"><a href="${escapeHtml(input.responseUrl)}?r=sim" style="background:#0f9d58;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">Confirmo presença</a></td><td style="padding:0 0 8px 0"><a href="${escapeHtml(input.responseUrl)}?r=nao" style="background:#ffffff;color:#5b29be;border:1px solid #d9cdee;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block">Não vou conseguir</a></td></tr></table>` : '';
  const intro = input.reminder
    ? `<p style="margin:0 0 14px">Passando para lembrar da sua entrevista com a <strong>${escapeHtml(input.company)}</strong> para a vaga <strong>${escapeHtml(input.jobTitle)}</strong>.</p>`
    : `<p style="margin:0 0 14px">Boa notícia: a <strong>${escapeHtml(input.company)}</strong> quer conversar com você sobre a vaga <strong>${escapeHtml(input.jobTitle)}</strong>.</p>`;
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p>${intro}${details}${button}${confirm}${note ? `<p style="margin:0 0 14px;border-left:3px solid #7240da;padding-left:12px">${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}<p style="margin:0 0 6px;font-size:13px;color:#6b6478">${escapeHtml(tips)}</p><p style="margin:14px 0 0;font-size:13px"><a href="${escapeHtml(input.calendarUrl)}" style="color:#5b29be;font-weight:600">+ Adicionar ao Google Agenda</a>${input.statusUrl ? ` &nbsp;·&nbsp; <a href="${escapeHtml(input.statusUrl)}" style="color:#5b29be;font-weight:600">Acompanhar candidatura</a>` : ''}</p>${input.responseUrl ? '' : '<p style="margin:14px 0 0;font-size:12px;color:#6b6478">Não vai conseguir ir? Avise a empresa o quanto antes para remarcar.</p>'}`;
  return {
    subject: input.reminder ? `Lembrete: entrevista ${input.when.short} · ${input.jobTitle}` : `Entrevista agendada: ${input.jobTitle} · ${input.when.short}`,
    html: portalLayout(input.reminder ? 'Sua entrevista está chegando' : 'Sua entrevista está marcada', body),
    text: [
      `Olá, ${input.name}.`,
      '',
      `A ${input.company} quer conversar com você sobre a vaga ${input.jobTitle}.`,
      '',
      `Quando: ${input.when.long} (cerca de ${input.durationMinutes} min)`,
      `Formato: ${online ? 'Online' : 'Presencial'}`,
      online ? `Link: ${input.meetingUrl ?? ''}` : `Endereço: ${input.location ?? ''}`,
      `Com: ${input.interviewer}`,
      note ? `\nRecado da empresa: ${note}` : '',
      '',
      tips,
      `Adicionar à agenda: ${input.calendarUrl}`,
      input.statusUrl ? `Acompanhar candidatura: ${input.statusUrl}` : '',
      input.responseUrl ? `Confirmar presença ou avisar que não pode: ${input.responseUrl}` : '',
    ].filter((line) => line !== null).join('\n'),
  };
}

export function candidateInterviewCanceledEmail(input: { name: string; company: string; jobTitle: string; when: { long: string; short: string } }): MailContent {
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p><p style="margin:0 0 12px">A entrevista da vaga <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)}, marcada para <strong>${escapeHtml(input.when.long)}</strong>, foi cancelada.</p><p style="margin:0;font-size:13px;color:#6b6478">Se houver um novo horário, você recebe outro e-mail com os detalhes. Sua candidatura continua no processo.</p>`;
  return {
    subject: `Entrevista cancelada: ${input.jobTitle} · ${input.when.short}`,
    html: portalLayout('Entrevista cancelada', body),
    text: `Olá, ${input.name}.\n\nA entrevista da vaga ${input.jobTitle} na ${input.company}, marcada para ${input.when.long}, foi cancelada.\nSe houver novo horário, você recebe outro e-mail. Sua candidatura continua no processo.`,
  };
}


const button = (label: string, url: string, tone: 'primary' | 'outline' = 'primary') => tone === 'primary'
  ? `<a href="${escapeHtml(url)}" style="background:#7240da;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">${escapeHtml(label)}</a>`
  : `<a href="${escapeHtml(url)}" style="background:#ffffff;color:#5b29be;border:1px solid #d9cdee;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">${escapeHtml(label)}</a>`;
const note = (text?: string | null) => (text ?? '').trim() ? `<p style="margin:0 0 14px;border-left:3px solid #7240da;padding-left:12px">${escapeHtml(String(text).trim()).replace(/\n/g, '<br>')}</p>` : '';

/** Autoagendamento: o candidato escolhe um dos horarios oferecidos. */
export function interviewSlotsEmail(input: { name: string; company: string; jobTitle: string; mode: 'PRESENCIAL' | 'ONLINE'; slots: string[]; durationMinutes: number; url: string; expires: string; message?: string | null }): MailContent {
  const list = input.slots.map((slot) => `<li style="margin:0 0 4px">${escapeHtml(slot)}</li>`).join('');
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p><p style="margin:0 0 14px">A <strong>${escapeHtml(input.company)}</strong> quer marcar uma entrevista ${input.mode === 'ONLINE' ? 'online' : 'presencial'} com você para a vaga <strong>${escapeHtml(input.jobTitle)}</strong> (cerca de ${input.durationMinutes} min). Escolha o horário que fica melhor:</p><ul style="margin:0 0 16px;padding-left:20px;font-weight:600">${list}</ul>${note(input.message)}<p style="margin:0 0 16px">${button('Escolher meu horário', input.url)}</p><p style="margin:0;font-size:12px;color:#6b6478">Os horários ficam disponíveis até ${escapeHtml(input.expires)}. Depois de escolher, você recebe a confirmação com ${input.mode === 'ONLINE' ? 'o link da reunião' : 'o endereço'}.</p>`;
  return {
    subject: `Escolha o horário da sua entrevista: ${input.jobTitle}`,
    html: portalLayout('Escolha o horário da entrevista', body),
    text: `Olá, ${input.name}.\n\nA ${input.company} quer marcar uma entrevista para a vaga ${input.jobTitle}. Horários:\n${input.slots.map((slot) => `- ${slot}`).join('\n')}\n\nEscolha aqui: ${input.url}\nDisponível até ${input.expires}.`,
  };
}

/** Proposta de emprego enviada ao candidato, com aceite online. */
export function jobOfferEmail(input: { name: string; company: string; positionTitle: string; url: string; expires?: string | null; message?: string | null }): MailContent {
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p><p style="margin:0 0 14px">Temos uma ótima notícia: a <strong>${escapeHtml(input.company)}</strong> preparou uma proposta para você ocupar a vaga de <strong>${escapeHtml(input.positionTitle)}</strong>.</p>${note(input.message)}<p style="margin:0 0 16px">${button('Ver a proposta', input.url)}</p><p style="margin:0;font-size:12px;color:#6b6478">Na página você vê salário, benefícios, data de início e pode aceitar ou recusar.${input.expires ? ` A proposta vale até ${escapeHtml(input.expires)}.` : ''}</p>`;
  return {
    subject: `Proposta de emprego: ${input.positionTitle} · ${input.company}`,
    html: portalLayout('Você recebeu uma proposta', body),
    text: `Olá, ${input.name}.\n\nA ${input.company} preparou uma proposta para a vaga ${input.positionTitle}.\nVeja e responda: ${input.url}${input.expires ? `\nVálida até ${input.expires}.` : ''}`,
  };
}

/** Teste online (tecnico ou comportamental). */
export function assessmentInviteEmail(input: { name: string; company: string; jobTitle: string; kind: 'TECHNICAL' | 'BEHAVIORAL'; title: string; url: string; expires: string; minutes?: number | null }): MailContent {
  const what = input.kind === 'BEHAVIORAL'
    ? 'um questionário rápido sobre seu jeito de trabalhar. Não existe resposta certa ou errada: responda como você é no dia a dia.'
    : `o teste <strong>${escapeHtml(input.title)}</strong>${input.minutes ? ` (tempo: ${input.minutes} min a partir do início)` : ''}. Escolha um momento tranquilo para fazer.`;
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p><p style="margin:0 0 14px">Sua candidatura para <strong>${escapeHtml(input.jobTitle)}</strong> na ${escapeHtml(input.company)} avançou. O próximo passo é ${what}</p><p style="margin:0 0 16px">${button(input.kind === 'BEHAVIORAL' ? 'Responder questionário' : 'Fazer o teste', input.url)}</p><p style="margin:0;font-size:12px;color:#6b6478">O link vale até ${escapeHtml(input.expires)} e só pode ser respondido uma vez.</p>`;
  return {
    subject: `${input.kind === 'BEHAVIORAL' ? 'Questionário' : 'Teste'} da sua candidatura: ${input.jobTitle}`,
    html: portalLayout(input.kind === 'BEHAVIORAL' ? 'Conte como você trabalha' : 'Hora do teste', body),
    text: `Olá, ${input.name}.\n\nSua candidatura para ${input.jobTitle} na ${input.company} avançou. Acesse: ${input.url}\nVálido até ${input.expires}.`,
  };
}

/** Aviso para quem conduz o processo (RH/recrutador): resposta do candidato, proposta para aprovar etc. */
export function recruiterNoticeEmail(input: { title: string; lines: string[]; url?: string | null; cta?: string }): MailContent {
  const body = `${input.lines.map((line) => `<p style="margin:0 0 10px">${escapeHtml(line)}</p>`).join('')}${input.url ? `<p style="margin:16px 0 0">${button(input.cta ?? 'Abrir no Innovation', input.url)}</p>` : ''}`;
  return {
    subject: input.title,
    html: layout(input.title, body),
    text: `${input.lines.join('\n')}${input.url ? `\n\n${input.url}` : ''}`,
  };
}

/** Cartao de boas-vindas (inline, funciona em qualquer cliente de e-mail): contratado pela empresa X, marca no rodape. */
function hiredCard(input: { name: string; company: string; jobTitle: string; startDate?: string | null }) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 22px;border-radius:18px;overflow:hidden;background:#4c1d95;background-image:linear-gradient(135deg,#4c1d95,#7240da)"><tr><td align="center" style="padding:34px 22px 22px;color:#ffffff"><div style="display:inline-block;background:#ffffff;color:#5b29be;border-radius:999px;padding:6px 18px;font-size:12px;font-weight:800;letter-spacing:3px">VOCÊ FOI CONTRATADO(A)</div><div style="font-size:15px;margin-top:22px;opacity:.9">Parabéns, ${escapeHtml(input.name)}!</div><div style="font-size:30px;line-height:1.15;font-weight:900;margin:8px 0 6px;letter-spacing:-.5px">Bem-vindo(a) à ${escapeHtml(input.company)}</div><div style="font-size:16px;opacity:.95">Cargo: <strong>${escapeHtml(input.jobTitle)}</strong></div>${input.startDate ? `<div style="margin-top:14px;display:inline-block;border:1px solid rgba(255,255,255,.5);border-radius:12px;padding:8px 16px;font-size:14px">Início em <strong>${escapeHtml(input.startDate)}</strong></div>` : ''}</td></tr><tr><td align="center" style="background:#1e1145;padding:16px 22px"><table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="width:34px;height:34px;background:#7240da;border-radius:9px;text-align:center;color:#ffffff;font-size:22px;font-weight:700;line-height:34px;font-family:Arial,Helvetica,sans-serif">i</td><td style="padding-left:10px;text-align:left;color:#ffffff;font-size:17px;font-weight:800;letter-spacing:-.3px">innovation<span style="color:#a78bfa">.</span> <span style="font-weight:600">connect RH</span></td></tr></table></td></tr></table>`;
}

/** Contratacao: cartao de boas-vindas + (quando houver) link para enviar os documentos da admissao. */
export function candidateHiredEmail(input: { name: string; company: string; jobTitle: string; startDate?: string | null; documentsUrl?: string | null; items?: string[]; expires?: string | null }): MailContent {
  const items = (input.items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const docs = input.documentsUrl
    ? `<p style="margin:0 0 8px">Para concluir sua admissão, envie seus documentos pelo link seguro abaixo (foto ou PDF, até 5 MB cada):</p>${items ? `<ul style="margin:0 0 14px;padding-left:20px">${items}</ul>` : ''}<p style="margin:0 0 12px">${button('Enviar meus documentos', input.documentsUrl)}</p><p style="margin:0;font-size:12px;color:#6b6478">O link é pessoal${input.expires ? ` e vale até ${escapeHtml(input.expires)}` : ''}. Não compartilhe com ninguém.</p>`
    : '<p style="margin:0">O RH vai entrar em contato com os próximos passos da admissão.</p>';
  return {
    subject: `Parabéns! Você foi contratado(a) pela ${input.company}`,
    html: portalLayout('Boas-vindas ao time!', `${hiredCard(input)}${docs}`),
    text: `Parabéns, ${input.name}!\n\nVocê foi contratado(a) pela ${input.company} para a vaga ${input.jobTitle}.${input.startDate ? `\nInício: ${input.startDate}.` : ''}${input.documentsUrl ? `\n\nEnvie seus documentos: ${input.documentsUrl}${(input.items ?? []).length ? `\nDocumentos: ${(input.items ?? []).join(', ')}` : ''}` : '\nO RH entrará em contato com os próximos passos.'}\n\ninnovation. connect RH`,
  };
}

/** Link de documentos enviado por e-mail pelo RH (fora da contratacao). */
export function candidateDocumentsEmail(input: { name: string; company: string; jobTitle: string; items: string[]; url: string; expires: string }): MailContent {
  const list = input.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const body = `<p style="margin:0 0 12px">Olá, ${escapeHtml(input.name)}.</p><p style="margin:0 0 10px">A <strong>${escapeHtml(input.company)}</strong> precisa dos documentos abaixo para seguir com o processo da vaga <strong>${escapeHtml(input.jobTitle)}</strong>:</p><ul style="margin:0 0 14px;padding-left:20px">${list}</ul><p style="margin:0 0 12px">${button('Enviar documentos', input.url)}</p><p style="margin:0;font-size:12px;color:#6b6478">Foto ou PDF, até 5 MB cada. O link é pessoal e vale até ${escapeHtml(input.expires)}.</p>`;
  return {
    subject: `Envio de documentos: ${input.jobTitle} · ${input.company}`,
    html: portalLayout('Envie seus documentos', body),
    text: `Olá, ${input.name}.\n\nA ${input.company} precisa dos documentos: ${input.items.join(', ')}.\nEnvie em: ${input.url}\nVálido até ${input.expires}.`,
  };
}
