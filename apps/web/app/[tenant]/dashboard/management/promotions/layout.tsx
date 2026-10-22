import type { ReactNode } from 'react';
import { FeatureGate } from '@/app/components/feature-gate';

export default function Layout({ children }: { children: ReactNode }) {
  return <FeatureGate feature="promotions">{children}</FeatureGate>;
}
