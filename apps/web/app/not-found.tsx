import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F5F7] px-6">
      <section className="w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-7 text-center shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          O caminho acessado nao existe ou foi movido dentro do painel.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[14px] bg-slate-950 px-5 text-sm font-black text-white"
        >
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
