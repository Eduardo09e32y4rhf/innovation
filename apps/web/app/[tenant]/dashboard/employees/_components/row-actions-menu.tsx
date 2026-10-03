'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

const MENU_WIDTH = 256;
const GAP = 8;
const MARGIN = 12;

export function RowActionsMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = menuRef.current?.scrollHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    const openUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;
    const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const width = Math.min(MENU_WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(MARGIN, rect.right - width), window.innerWidth - width - MARGIN);
    const height = Math.min(menuHeight || available, available);
    setStyle({
      position: 'fixed',
      left,
      width,
      maxHeight: available,
      top: openUp ? rect.top - GAP - height : rect.bottom + GAP,
      visibility: 'visible',
    });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-outline btn-md"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setStyle({ visibility: 'hidden' });
          setOpen(value => !value);
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" /> Ações
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={style}
          className="z-50 flex flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-bg-elev p-2 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
