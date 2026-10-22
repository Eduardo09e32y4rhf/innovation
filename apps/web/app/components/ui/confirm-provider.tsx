'use client';
import * as React from 'react';
import { Modal } from './modal';
import { Button } from './button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Texto do botão: sempre o verbo da ação ("Demitir", "Excluir plano"), nunca "OK". */
  confirmText: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  /** Exige digitar este texto para liberar o botão (ações irreversíveis, ex.: "EFETIVAR"). */
  requireText?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Confirm | null>(null);

/** Confirmação assíncrona: `if (!(await confirm({ ... }))) return;` — substitui `window.confirm`. */
export function useConfirm(): Confirm {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const [typed, setTyped] = React.useState('');
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const confirm = React.useCallback<Confirm>((options) => new Promise<boolean>((resolve) => {
    // Uma confirmação por vez: a anterior (se existir) é cancelada.
    stateRef.current?.resolve(false);
    setTyped('');
    setState({ options, resolve });
  }), []);

  const settle = (ok: boolean) => {
    const current = stateRef.current;
    if (!current) return;
    setState(null);
    current.resolve(ok);
  };

  const options = state?.options;
  const needsText = options?.requireText;
  const locked = Boolean(needsText) && typed.trim() !== needsText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal isOpen={Boolean(state)} onClose={() => settle(false)} title={options?.title} description={options?.description} maxWidth="max-w-md">
        {needsText && (
          <label className="mt-2 block text-sm">
            <span className="mb-1 block text-fg-mut">Digite <strong>{needsText}</strong> para confirmar</span>
            <input
              className="input-v2 w-full"
              value={typed}
              autoComplete="off"
              data-autofocus
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !locked) { event.preventDefault(); settle(true); } }}
            />
          </label>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={() => settle(false)}>{options?.cancelText ?? 'Cancelar'}</Button>
          <Button variant={options?.variant ?? 'danger'} disabled={locked} onClick={() => settle(true)} data-autofocus={needsText ? undefined : true}>
            {options?.confirmText}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
