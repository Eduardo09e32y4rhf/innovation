import type { Metadata } from 'next';
import { JobDetails } from './job-details';

type JobDetailsPageProps = {
  params: Promise<{
    companyId: string;
    jobId: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Detalhes da vaga',
  description: 'Confira os detalhes da oportunidade e envie sua candidatura.',
};

export default async function JobDetailsPage(props: JobDetailsPageProps) {
  const params = await props.params;
  return <JobDetails companyId={params.companyId} jobId={params.jobId} />;
}
