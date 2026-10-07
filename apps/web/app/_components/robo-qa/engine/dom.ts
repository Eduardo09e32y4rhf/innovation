import { requisicoesPendentes } from './coletor';

export const dormir = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

export function visivel(el: Element | null | undefined): el is HTMLElement {
  if (!el) return false;
  const caixa = (el as HTMLElement).getBoundingClientRect();
  if (caixa.width <= 0 || caixa.height <= 0) return false;
  const estilo = getComputedStyle(el);
  return estilo.visibility !== 'hidden' && estilo.display !== 'none' && estilo.opacity !== '0';
}

export function rotulo(el: Element): string {
  const h = el as HTMLElement;
  return (h.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
}

/** Espera uma condicao ficar verdadeira. Falha com mensagem clara (o texto vira explicacao no relatorio). */
export async function esperarAte<T>(fn: () => T | null | undefined | false, { timeout = 8000, intervalo = 100, descricao = 'o elemento' } = {}): Promise<T> {
  const limite = Date.now() + timeout;
  for (;;) {
    try { const valor = fn(); if (valor) return valor; } catch { /* tenta de novo */ }
    if (Date.now() > limite) throw new Error(`Tempo esgotado: não achei ${descricao}`);
    await dormir(intervalo);
  }
}

export function todos<T extends HTMLElement = HTMLElement>(seletor: string, raiz: ParentNode = document): T[] {
  return [...raiz.querySelectorAll<T>(seletor)].filter((el) => visivel(el));
}

export function acharPorTexto(seletor: string, regra: RegExp, raiz: ParentNode = document): HTMLElement | null {
  return todos(seletor, raiz).find((el) => regra.test(rotulo(el))) ?? null;
}

/** Escreve em campo controlado pelo React (precisa do setter nativo + evento de input). */
export function setValor(campo: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, valor: string) {
  const proto = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : campo instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(campo, valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Espera a tela "assentar": sem mudancas no DOM e sem chamadas ao servidor em andamento. */
export async function esperarAssentar(silencioMs = 500, maxMs = 7000): Promise<void> {
  let ultima = Date.now();
  const observador = new MutationObserver(() => { ultima = Date.now(); });
  observador.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  const limite = Date.now() + maxMs;
  try {
    for (;;) {
      if (Date.now() - ultima >= silencioMs && requisicoesPendentes() === 0) return;
      if (Date.now() > limite) return;
      await dormir(80);
    }
  } finally { observador.disconnect(); }
}

export function areaPrincipal(): HTMLElement {
  return (document.querySelector('main') as HTMLElement | null) ?? document.body;
}