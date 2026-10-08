'use client';

import { Bot } from 'lucide-react';
import { definirRoboLigado, useRoboLigado } from './ligado';

/** Chave do robô de teste, na página do DEV. Liga e desliga na hora, sem terminal e sem novo deploy. */
export function RoboQaSwitch() {
  const ligado = useRoboLigado();
  return (
    <section aria-label="Robô de teste" className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ligado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><Bot size={20} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900">Robô de teste {ligado && <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">ligado</span>}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Ligado, aparece um botão flutuante só para você (DEV). Ele testa as telas de cada perfil e cria usuários reais chamados “ROBO-QA”. A chave vale para este navegador; desligue quando terminar.</p>
        </div>
      </div>
      <button type="button" role="switch" aria-checked={ligado} onClick={() => definirRoboLigado(!ligado)}
        className={`inline-flex min-h-11 min-w-[96px] shrink-0 items-center justify-center rounded-full px-5 text-sm font-black transition ${ligado ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
        {ligado ? 'Desligar' : 'Ligar'}
      </button>
    </section>
  );
}
