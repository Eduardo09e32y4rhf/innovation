import { useEffect, useRef } from 'react';

// Local fallback while the shared overlay base is migrated by the main worker.
export function useAccessOverlay(open: boolean, onClose: () => void, label: string) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const root = ref.current;
    const panel = root.querySelector<HTMLElement>('.modal, .drawer');
    if (!panel || panel.getAttribute('role') === 'dialog') return;
    const previous = document.activeElement as HTMLElement | null;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', label);
    panel.tabIndex = -1;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), a[href], textarea:not(:disabled), [tabindex="0"]'))
      .filter(element => element.getClientRects().length > 0);
    (focusable()[0] ?? panel).focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) { event.preventDefault(); panel.focus(); return; }
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, label]);
  return ref;
}
