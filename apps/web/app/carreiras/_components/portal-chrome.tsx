import Link from 'next/link';
import type { ReactNode } from 'react';

/** Marca do portal de vagas: o mesmo "i" inclinado e o "innovation." da página de vagas. */
export function PortalLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/carreiras" className="flex items-center gap-3" aria-label="Portal de vagas Innovation RH">
      <span aria-hidden="true" className="grid h-9 w-9 -rotate-[8deg] place-items-center rounded-xl bg-[#7240da] text-2xl font-bold text-white">i</span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#241b38]'}`}>innovation<span className={light ? 'text-[#c7b0ed]' : 'text-[#7240da]'}>.</span>
        <small className={`mt-0.5 block text-[10px] font-medium tracking-[2.4px] ${light ? 'text-[#c9bfe0]' : 'text-[#736d80]'}`}>RH · CARREIRAS</small></span>
    </Link>
  );
}

export function PortalHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-[#e9e5f0] bg-white">
      <div className="mx-auto flex min-h-[64px] max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:min-h-[80px] sm:px-9">
        <PortalLogo />
        {children}
      </div>
    </header>
  );
}

/** Rodapé único do portal de vagas (lista, vaga, login e Área do candidato). */
export function PortalFooter() {
  const link = 'inline-flex min-h-11 items-center text-[13px] text-[#d9d0ee] hover:text-white';
  return (
    <footer className="mt-12 bg-[#1e1145] text-white">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 pb-28 pt-10 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-9 sm:pb-10">
        <div className="space-y-3">
          <PortalLogo light />
          <p className="max-w-[320px] text-[13px] leading-relaxed text-[#c9bfe0]">Conectando pessoas a novas possibilidades. Encontre sua próxima oportunidade e acompanhe cada etapa.</p>
        </div>
        <nav aria-label="Para candidatos" className="flex flex-col">
          <span className="mb-1 text-[11px] font-bold uppercase tracking-[2px] text-[#a998d8]">Candidatos</span>
          <Link href="/carreiras" className={link}>Vagas abertas</Link>
          <Link href="/carreiras/conta" className={link}>Minhas candidaturas</Link>
          <Link href="/carreiras/conta/perfil" className={link}>Meu perfil</Link>
        </nav>
        <nav aria-label="Informações" className="flex flex-col">
          <span className="mb-1 text-[11px] font-bold uppercase tracking-[2px] text-[#a998d8]">Informações</span>
          <Link href="/carreiras/privacidade" className={link}>Privacidade e seus dados</Link>
          <Link href="/termos?de=carreiras" className={link}>Termos de uso</Link>
          <Link href="/suporte?de=carreiras" className={link}>Suporte</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-[12px] text-[#a998d8]">© {new Date().getFullYear()} Innovation RH · Portal de carreiras</div>
    </footer>
  );
}
