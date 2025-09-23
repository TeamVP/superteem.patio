// prettier-ignore
import React, { useState, useEffect, createContext, useContext } from 'react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { consumePostAuthRedirect } from '@/auth/postAuthRedirect';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convexClient = new ConvexReactClient(convexUrl);

type Role = 'admin' | 'reviewer' | 'author' | 'responder';
interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
}
interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const RoleContext = createContext<RoleContextValue | undefined>(undefined);
export function useDevRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useDevRole must be used within DevAuthProvider');
  return ctx;
}

export const DevAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [role, setRole] = useState<Role>(() => {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      try {
        const stored = (globalThis as { localStorage: LocalStorageLike }).localStorage.getItem(
          'devRole'
        );
        return (stored as Role) || 'admin';
      } catch {
        return 'admin';
      }
    }
    return 'admin';
  });
  useEffect(() => {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      try {
        (globalThis as { localStorage: LocalStorageLike }).localStorage.setItem('devRole', role);
      } catch {
        /* ignore */
      }
    }
  }, [role]);
  useEffect(() => {
    const redirect = consumePostAuthRedirect();
    if (redirect) {
      globalThis.location.replace(redirect);
    }
  }, []);
  return (
    <ConvexProvider client={convexClient}>
      <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>
    </ConvexProvider>
  );
};

export {};










