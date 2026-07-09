"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 bg-red-50 text-red-900">
      <h2 className="text-xl font-bold mb-4">Erro Crítico Detectado</h2>
      <pre className="p-4 bg-white border border-red-200 rounded whitespace-pre-wrap text-sm">{error.message}</pre>
      <pre className="p-4 bg-white border border-red-200 rounded whitespace-pre-wrap text-xs mt-2">{error.stack}</pre>
    </div>
  );
}
