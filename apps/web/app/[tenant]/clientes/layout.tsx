import Link from 'next/link';
import { UserCircle } from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

export default function ClientesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <h1 className="text-xl font-black text-violet-700 tracking-tight">Portal do Cliente</h1>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-800">Sair</Link>
              <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600"><UserCircle size={20} /></div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
