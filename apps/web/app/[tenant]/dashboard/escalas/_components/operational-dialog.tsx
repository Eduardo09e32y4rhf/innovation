'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Modal as SharedModal, type ModalProps } from '@/app/components/ui/modal';
import { Drawer as SharedDrawer, type DrawerProps } from '@/app/components/ui/drawer';
import { ConfirmDialog as SharedConfirmDialog, type ConfirmDialogProps } from '@/app/components/ui/confirm-dialog';
import styles from './operational-ui.module.css';

// Local accessibility adapter; the shared components and their signatures stay intact.
function DialogAccess({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = root.current?.querySelector<HTMLElement>('.modal, .drawer');
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title);
    dialog.tabIndex = -1;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', keydown);
    return () => { dialog.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [title]);
  return <div ref={root} className={styles.surface}>{children}</div>;
}

export function Modal(props: ModalProps) {
  if (!props.isOpen) return null;
  return <DialogAccess title={props.title ?? 'Formulário'} onClose={props.onClose}><SharedModal {...props} /></DialogAccess>;
}
export function Drawer(props: DrawerProps) {
  if (!props.isOpen) return null;
  return <DialogAccess title={props.title ?? 'Detalhes'} onClose={props.onClose}><SharedDrawer {...props} /></DialogAccess>;
}
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.isOpen) return null;
  return <DialogAccess title={props.title} onClose={props.isLoading ? () => {} : props.onClose}><SharedConfirmDialog {...props} /></DialogAccess>;
}
