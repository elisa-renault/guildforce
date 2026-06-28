import { Navigate, useParams } from 'react-router-dom';

import type { KillSwitchFeatureFlagKey } from '@/lib/featureFlags';
import type { ReactNode } from 'react';

import { useKillSwitchFeatureEnabled } from '@/lib/featureFlags';

interface FeatureFlagRouteProps {
  children: ReactNode;
  flagKey: KillSwitchFeatureFlagKey;
  fallbackPath: (params: Readonly<Record<string, string | undefined>>) => string;
}

export const FeatureFlagRoute = ({ children, flagKey, fallbackPath }: FeatureFlagRouteProps) => {
  const params = useParams();
  const enabled = useKillSwitchFeatureEnabled(flagKey);

  if (!enabled) {
    return <Navigate to={fallbackPath(params)} replace />;
  }

  return children;
};
