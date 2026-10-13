import type { Metadata } from 'next';
import { GlobalCareersHub } from './global-careers-hub';

export const metadata: Metadata = {
  title: 'Portal de Oportunidades & Carreiras | Innovation RH Connect',
  description:
    'Encontre seu próximo desafio em empresas inovadoras de todo o Brasil. Envie seu currículo, acompanhe a candidatura e, se contratado, mande os documentos pelo link.',
  openGraph: {
    title: 'Portal de Oportunidades & Carreiras | Innovation RH Connect',
    description:
      'Explore vagas abertas em diversas empresas clientes do nosso ecossistema oficial. Candidate-se agora!',
  },
};

export default function GlobalCareersPage() {
  return <GlobalCareersHub />;
}
