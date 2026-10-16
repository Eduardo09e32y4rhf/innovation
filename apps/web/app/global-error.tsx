'use client';

import { useEffect } from 'react';

/** Último recurso: erro no próprio layout. */
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="pt-BR">
      <body>
        <div role="alert" style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Algo deu errado</h2>
          <p>Já registramos o problema. Tente de novo.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 20px' }}>Tentar de novo</button>
        </div>
      </body>
    </html>
  );
}
