'use client';
import { redirect , useParams } from 'next/navigation';

export default function NewEmployeeRedirect() {
  const params = useParams();
  const tenant = params?.tenant as string;

  redirect(`/${tenant}/dashboard/employees/new`);
}
