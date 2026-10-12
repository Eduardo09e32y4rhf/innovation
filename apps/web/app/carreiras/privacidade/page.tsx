import type { Metadata } from 'next';
import { PrivacyRequestForm } from './request-form';

export const metadata: Metadata = { title: 'Meus dados (LGPD)', description: 'Peça acesso, correção ou exclusão dos dados da sua candidatura.' };

export default function PrivacyPage() {
  return <PrivacyRequestForm />;
}