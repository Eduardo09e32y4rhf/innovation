'use client';

import { readAuthSession } from '@/app/lib/auth-session';
import { API_URL, ApiError } from '@/app/lib/api';

type DownloadOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  fallbackFilename: string;
};

export type AsoReferralPdfInput = {
  employeeId: string;
  asoType?: string;
  clinicName?: string;
  clinicAddress?: string;
  examDate?: string;
  observation?: string;
};

export type LegalNoticePdfInput = {
  employeeId: string;
  type: 'WARNING_NOTICE' | 'SUSPENSION_NOTICE';
  title?: string;
  message: string;
  legalReason?: string;
  occurrenceDate?: string;
  suspensionDays?: number;
};

async function downloadManagementPdf(path: string, options: DownloadOptions) {
  const headers: Record<string, string> = {};
  const token = readAuthSession().token;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const raw = await response.text();
    let body: unknown = raw;
    try {
      body = JSON.parse(raw);
    } catch {}
    const message = body && typeof body === 'object' && 'message' in body
      ? String((body as { message: unknown }).message)
      : `Erro ${response.status} ao gerar PDF`;
    throw new ApiError(response.status, message, body);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const encodedFilename = disposition.match(/filename="([^"]+)"/i)?.[1];
  const filename = encodedFilename ? decodeURIComponent(encodedFilename) : options.fallbackFilename;
  const blob = await response.blob();
  if (blob.type && blob.type !== 'application/pdf') {
    throw new Error('O servidor não retornou um PDF válido.');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    documentId: response.headers.get('x-document-id'),
    sha256: response.headers.get('x-document-sha256'),
    filename,
  };
}

export const managementDocumentsApi = {
  asoReferral: (recordId: string) =>
    downloadManagementPdf(`/management/documents/aso/${recordId}/referral`, {
      fallbackFilename: 'encaminhamento-aso.pdf',
    }),

  asoReferralPreview: (input: AsoReferralPdfInput) =>
    downloadManagementPdf('/management/documents/aso/referral', {
      method: 'POST',
      body: input,
      fallbackFilename: 'encaminhamento-aso.pdf',
    }),

  notificationLegalNotice: (notificationId: string) =>
    downloadManagementPdf(`/management/documents/notifications/${notificationId}/legal-notice`, {
      fallbackFilename: 'termo-disciplinar.pdf',
    }),

  legalNoticePreview: (input: LegalNoticePdfInput) =>
    downloadManagementPdf('/management/documents/legal-notice', {
      method: 'POST',
      body: input,
      fallbackFilename: input.type === 'SUSPENSION_NOTICE' ? 'suspensao.pdf' : 'advertencia.pdf',
    }),

  closing: (closingId: string) =>
    downloadManagementPdf(`/management/documents/closings/${closingId}`, {
      fallbackFilename: 'fechamento.pdf',
    }),
};
