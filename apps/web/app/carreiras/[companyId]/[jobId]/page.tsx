import type { Metadata } from 'next';
import { JobDetails } from './job-details';

type JobDetailsPageProps = {
  params: {
    companyId: string;
    jobId: string;
  };
};

export const metadata: Metadata = {
  title: 'Detalhes da vaga',
  description: 'Confira os detalhes da oportunidade e envie sua candidatura.',
};

export default function JobDetailsPage({ params }: JobDetailsPageProps) {
  return <JobDetails companyId={params.companyId} jobId={params.jobId} />;
}
