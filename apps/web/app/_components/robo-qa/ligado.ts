'use client';

import { useSyncExternalStore } from 'react';

/** Chave "robô de teste ligado" do DEV. Fica no navegador dele: sem variável de build, sem terminal, sem deploy. */
const KEY = 'iw:robo-qa:ligado';
const EVENTO = 'iw:robo-qa:mudou';

export function lerRoboLigado(): boolean {
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function definirRoboLigado(ligado: boolean) {
  try { if (ligado) window.localStorage.setItem(KEY, '1'); else window.localStorage.removeItem(KEY); } catch { /* sem armazenamento: a chave nao persiste */ }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener('storage', aoMudar);
  return () => { window.removeEventListener(EVENTO, aoMudar); window.removeEventListener('storage', aoMudar); };
}

/** Estado da chave (false no servidor, para nao divergir na hidratacao). */
export function useRoboLigado(): boolean {
  return useSyncExternalStore(assinar, lerRoboLigado, () => false);
}
