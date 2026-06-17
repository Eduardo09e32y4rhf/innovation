import { MessageSquareText, QrCode, Smartphone } from 'lucide-react';

export default function WhatsappPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">WhatsApp</p>
        <h2 className="text-2xl font-black text-slate-950">Conexão WhatsApp</h2>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
          <QrCode className="mb-4 text-teal-600" size={24} />
          <h3 className="text-sm font-black text-slate-950">QR Code</h3>
          <div className="mt-4 flex aspect-square items-center justify-center rounded-[8px] border border-dashed border-slate-300 text-xs text-slate-500">
            Aguardando sessao
          </div>
        </div>
        <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
          <Smartphone className="mb-4 text-teal-600" size={24} />
          <h3 className="text-sm font-black text-slate-950">Conversas</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">Fila comercial para acompanhar conversas de funcionarios e avisos internos.</p>
        </div>
        <div className="ops-card rounded-[8px] border border-slate-200 bg-white p-5">
          <MessageSquareText className="mb-4 text-teal-600" size={24} />
          <h3 className="text-sm font-black text-slate-950">Mensagens</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">Envio e historico ficam conectados ao modulo de comunicacao da API.</p>
        </div>
      </section>
    </div>
  );
}
