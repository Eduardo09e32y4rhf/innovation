import type { Metadata } from 'next';
import { GlobalCareersHub } from './global-careers-hub';

export const metadata: Metadata = {
  title: 'Portal de Oportunidades & Carreiras | Innovation RH Connect',
  description:
    'Encontre seu próximo desafio em empresas inovadoras de todo o Brasil. Processos seletivos transparentes, triagem inteligente com IA e admissão 100% digital.',
  openGraph: {
    title: 'Portal de Oportunidades & Carreiras | Innovation RH Connect',
    description:
      'Explore vagas abertas em diversas empresas clientes do nosso ecossistema oficial. Candidate-se agora!',
  },
};

export default function GlobalCareersPage() {
  return <GlobalCareersHub />;
}
