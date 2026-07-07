import { redirect , useParams } from 'next/navigation';
export default function WorkScheduleRulesPage() {
  const params = useParams();
  const tenant = params?.tenant as string;
 redirect(`/${tenant}/dashboard/management?tab=rules`); }