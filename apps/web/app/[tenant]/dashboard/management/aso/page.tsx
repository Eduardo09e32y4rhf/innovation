import { redirect } from 'next/navigation';

// A tela de ASO foi refeita dentro de Segurança do trabalho; esta rota fica só para links antigos.
export default function AsoRedirect({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/dashboard/management/seguranca/aso`);
}
