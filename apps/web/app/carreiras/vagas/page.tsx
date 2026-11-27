import type { Metadata } from 'next';
import { CareersCatalog } from '../_components/careers-catalog';

export const metadata: Metadata = {
  title: 'Vagas | Innovation RH Connect',
  description: 'Busque oportunidades por cargo, localização e modelo de trabalho.',
};

export default function CareersMarketplacePage() {
  return <CareersCatalog marketplace />;
}
