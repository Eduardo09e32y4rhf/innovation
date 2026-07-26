import type { Metadata } from 'next';
import { CareersList } from './careers-list';

type CareersPageProps = {
  params: { companyId: string };
};

export const metadata: Metadata = {
  title: 'Vagas abertas',
  description: 'Conheça as oportunidades abertas e encontre a próxima etapa da sua carreira.',
};

export default function CareersPage({ params }: CareersPageProps) {
  return <CareersList companyId={params.companyId} />;
}
