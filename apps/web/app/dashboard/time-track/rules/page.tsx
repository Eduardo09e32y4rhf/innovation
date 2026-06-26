'use client';

import { redirect } from 'next/navigation';

export default function WorkScheduleRulesPage() {
  redirect('/dashboard/management?tab=rules');
}