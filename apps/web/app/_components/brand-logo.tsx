/** Marca Innovation: "i" branco em quadrado roxo girado + "innovation." e a linha de contexto. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="inline-grid shrink-0 place-items-center font-bold text-white" style={{ width: size, height: size, borderRadius: size * 0.32, background: '#7240da', transform: 'rotate(-8deg)', fontSize: size * 0.66, fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: 1 }}>i</span>
  );
}

export function BrandLogo({ tagline = 'RH · CONNECT', size = 40, tone = 'dark' }: { tagline?: string; size?: number; tone?: 'dark' | 'light' }) {
  const ink = tone === 'dark' ? 'text-white' : 'text-[#241b38]';
  const muted = tone === 'dark' ? 'text-white/60' : 'text-[#736d80]';
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.28 }}>
      <BrandMark size={size} />
      <span className={`font-extrabold ${ink}`} style={{ fontSize: size * 0.55, letterSpacing: '-0.04em', lineHeight: 1 }}>
        innovation<span style={{ color: '#9b6bff' }}>.</span>
        <small className={`mt-1 block font-medium ${muted}`} style={{ fontSize: size * 0.25, letterSpacing: '0.24em' }}>{tagline}</small>
      </span>
    </span>
  );
}