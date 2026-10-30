import { redirect } from 'next/navigation';
export default async function ColaboradoresPage(props: { params: Promise<{ tenant: string }> }) {
  const params = await props.params;
  redirect(`/${params.tenant}/dashboard/employees`);
}
