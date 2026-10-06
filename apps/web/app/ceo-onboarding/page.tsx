import type { Metadata } from 'next';
import { CeoOnboarding } from './onboarding';

export const metadata: Metadata = { title: 'Primeiro acesso do CEO', robots: { index: false, follow: false } };

export default function CeoOnboardingPage() {
  return <CeoOnboarding />;
}