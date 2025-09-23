import React from 'react';
import { useHasRole } from '../hooks/useHasRole';

interface RoleGuardProps {
  roles: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const ok = useHasRole(roles);
  if (!ok) return <>{fallback}</>;
  return <>{children}</>;
}
