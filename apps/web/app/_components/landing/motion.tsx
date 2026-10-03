'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

/** Revela o conteúdo quando entra na tela. Sem IntersectionObserver, mostra direto. */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: { children: ReactNode; delay?: number; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref} style={{ '--lp-delay': `${delay}ms` } as React.CSSProperties} className={`lp-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</Tag>;
}

/** Contador animado até o valor final quando visível. */
export function CountUp({ to, suffix = '', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { setValue(to); return; }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [to, duration]);
  return <span ref={ref} className="tabular-nums">{value}{suffix}</span>;
}
