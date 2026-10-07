'use client';

import { useEffect } from 'react';
import { recuperarDeQuedaTotal } from './_components/robo-qa/engine/queda';

/** Último recurso: erro no próprio layout. Se o robô de teste estiver rodando, anota a queda e recarrega para ele seguir. */
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    const destino = recuperarDeQuedaTotal(String(error?.message ?? error));
    if (destino) {
      const t = setTimeout(() => window.location.assign(destino), 1200);
      return () => clearTimeout(t);
    }
  }, [error]);
  return (
    <html lang="pt-BR">
      <body>
        <div role="alert" data-robo-queda style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Algo deu errado</h2>
          <p>Já registramos o problema. Tente de novo.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 20px' }}>Tentar de novo</button>
        </div>
      </body>
    </html>
  );
}
