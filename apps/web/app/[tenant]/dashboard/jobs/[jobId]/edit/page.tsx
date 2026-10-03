'use client';

import { useParams } from 'next/navigation';
import { JobWizard } from '../../_components/job-wizard';

export default function EditJobPage() {
  const { jobId = '' } = useParams<{ jobId: string }>();
  return <JobWizard jobId={jobId} />;
}
