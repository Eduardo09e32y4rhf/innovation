import type { Metadata } from 'next';
import { CareersList } from './careers-list';

type CareersPageProps = {
  params: Promise<{ companyId: string }>;
};

export const metadata: Metadata = {
  title: 'Vagas abertas',
  description: 'Conheça as oportunidades abertas e encontre a próxima etapa da sua carreira.',
};

export default async function CareersPage(props: CareersPageProps) {
  const params = await props.params;
  return <CareersList companyId={params.companyId} />;
}
