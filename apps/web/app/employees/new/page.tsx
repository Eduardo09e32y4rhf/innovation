import { redirect } from 'next/navigation';

export default function NewEmployeeRedirect() {
  redirect('/dashboard/employees/new');
}
