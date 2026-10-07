'use client';

import { useEffect } from 'react';

/**
 * Rede de segurança: um erro numa tela não derruba mais o sistema inteiro (o menu e o layout continuam de pé).
 * O atributo data-robo-queda deixa o robô de teste reconhecer a queda e seguir para a próxima etapa.
 */
export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" data-robo-queda style={{ padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Algo deu errado nesta tela</h2>
      <p style={{ color: '#4b5563', margin: '8px 0 16px' }}>
        Já registramos o problema. Tente de novo; se continuar, volte ao início{error.digest ? ` e informe o código ${error.digest} ao suporte` : ''}.
      </p>
      <button type="button" onClick={reset} style={{ minHeight: 44, padding: '0 20px', marginRight: 8, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Tentar de novo</button>
      <a href="/" style={{ display: 'inline-block', lineHeight: '44px', padding: '0 20px', borderRadius: 8, background: '#7c3aed', color: '#fff', textDecoration: 'none' }}>Voltar ao início</a>
    </div>
  );
}
