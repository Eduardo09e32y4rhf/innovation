'use client';

import { useEffect, useState } from 'react';

export function initialsOf(name?: string | null) {
  const words = String(name ?? '').trim().split(/\s+/).filter((word) => word.length > 2 || /^\d+$/.test(word));
  const pick = (words.length ? words : String(name ?? '').trim().split(/\s+/)).slice(0, 2);
  return pick.map((word) => word.charAt(0)).join('').toUpperCase() || 'E';
}

/**
 * Logo da empresa sempre em quadrado com cantos arredondados, sobre fundo branco (logo escura ou transparente aparece).
 * A imagem inteira cabe no quadrado, sem cortar; se faltar ou quebrar, mostra as iniciais.
 * Dica: o logo fica maior e mais nítido quando a imagem enviada é quadrada e sem margem sobrando.
 */
export function CompanyLogo({ name, logoUrl, height = 48, className = '' }: {
  name?: string | null; logoUrl?: string | null; height?: number; maxWidth?: number; compactFallback?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logoUrl]);
  const box = { width: height, height };
  if (!logoUrl || failed) {
    return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] font-semibold text-white ${className}`} style={{ ...box, fontSize: height * 0.36 }}>{initialsOf(name)}</span>;
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white ${className}`} style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt={name ? `Logo ${name}` : 'Logo da empresa'} onError={() => setFailed(true)} className="h-full w-full object-contain p-0.5" />
    </span>
  );
}