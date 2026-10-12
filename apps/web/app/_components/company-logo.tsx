'use client';

import { useEffect, useState } from 'react';

export function initialsOf(name?: string | null) {
  const words = String(name ?? '').trim().split(/\s+/).filter((word) => word.length > 2 || /^\d+$/.test(word));
  const pick = (words.length ? words : String(name ?? '').trim().split(/\s+/)).slice(0, 2);
  return pick.map((word) => word.charAt(0)).join('').toUpperCase() || 'E';
}

/**
 * Logo da empresa legível em qualquer formato: fica sobre fundo branco (logo escura ou transparente aparece),
 * mantém a proporção (logo horizontal ocupa largura, não vira uma tira de 48 px) e cai nas iniciais se faltar ou quebrar.
 * Com `compactFallback`, logo horizontal vira as iniciais quando a barra lateral está recolhida (classes em globals.css).
 */
export function CompanyLogo({ name, logoUrl, height = 48, maxWidth = 200, compactFallback = false, className = '' }: {
  name?: string | null; logoUrl?: string | null; height?: number; maxWidth?: number; compactFallback?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [wide, setWide] = useState(false);
  useEffect(() => { setFailed(false); setWide(false); }, [logoUrl]);
  const initials = (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] font-semibold text-white ${className}`} style={{ width: height, height, fontSize: height * 0.36 }}>{initialsOf(name)}</span>
  );
  if (!logoUrl || failed) return initials;
  return (
    <>
      <span className={`${wide && compactFallback ? 'company-logo-full ' : ''}inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white ${className}`} style={{ height, minWidth: height, maxWidth }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name ? `Logo ${name}` : 'Logo da empresa'} onError={() => setFailed(true)}
          onLoad={(event) => { const img = event.currentTarget; setWide(img.naturalWidth / Math.max(1, img.naturalHeight) > 1.4); }}
          style={{ height: height - 10, width: 'auto', maxWidth: maxWidth - 10, objectFit: 'contain', padding: 0, margin: 5 }} />
      </span>
      {wide && compactFallback && <span className="company-logo-mini hidden">{initials}</span>}
    </>
  );
}