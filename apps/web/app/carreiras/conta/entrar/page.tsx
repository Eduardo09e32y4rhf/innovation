import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function CandidateLoginPage() {
  return <Suspense fallback={<main className="p-6"><p role="status">Carregando…</p></main>}><LoginForm /></Suspense>;
}
