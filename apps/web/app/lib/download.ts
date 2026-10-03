import { API_URL, ApiError } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';

function filenameFrom(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (star) {
    try { return decodeURIComponent(star.trim()); } catch { /* usa as demais formas */ }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(disposition)?.[1];
  if (quoted) {
    try { return decodeURIComponent(quoted); } catch { return quoted; }
  }
  const bare = /filename\s*=\s*([^;]+)/i.exec(disposition)?.[1];
  return bare ? bare.trim() : fallback;
}

async function errorFrom(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => '');
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  const nested = body && typeof body === 'object' && body.error && typeof body.error === 'object' ? body.error : body;
  const raw = nested?.message ?? body?.message;
  const message = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' && raw ? raw : response.status === 401 ? 'Sessão expirada. Faça login novamente.' : `Não foi possível baixar o arquivo (erro ${response.status}).`;
  return new ApiError(response.status, message, body);
}

/** Baixa um arquivo autenticado (PDF, CSV...) e dispara o download no navegador. */
export async function downloadFile(path: string, fallbackName = 'arquivo'): Promise<string> {
  const token = readAuthSession().token;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  }
  if (!response.ok) throw await errorFrom(response);

  const blob = await response.blob();
  if (blob.size === 0) throw new ApiError(500, 'O servidor devolveu um arquivo vazio.');
  const name = filenameFrom(response.headers.get('content-disposition'), fallbackName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}
