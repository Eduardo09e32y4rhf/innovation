import type { Metadata } from 'next';
import { DocumentUpload } from './upload';

// Link privado: nunca indexar nem vazar o token por referrer.
export const metadata: Metadata = {
  title: 'Envio de documentos',
  description: 'Envie os documentos solicitados para o seu processo seletivo.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function CandidateDocumentsPage({ params }: { params: { token: string } }) {
  return <DocumentUpload token={params.token} />;
}