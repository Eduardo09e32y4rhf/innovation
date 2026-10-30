import { redirect } from 'next/navigation';

// A tela de ASO foi refeita dentro de Segurança do trabalho; esta rota fica só para links antigos.
export default async function AsoRedirect(props: { params: Promise<{ tenant: string }> }) {
  const params = await props.params;
  redirect(`/${params.tenant}/dashboard/management/seguranca/aso`);
}
