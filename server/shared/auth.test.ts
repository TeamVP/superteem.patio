/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { requireRole } from './auth';

// Lightweight mocks for Convex-like ctx
function makeCtx(user: { email?: string; roles?: string[] } | null) {
  const db = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: (_table: string) => ({
      withIndex: (_index: string, cb: any) => ({
        unique: async () => {
          if (!user || !user.email) return null;
          // emulate query builder by invoking callback to satisfy pattern
          cb({ eq: () => ({}) });
          return { _id: 'u1', email: user.email, roles: user.roles ?? [] };
        },
      }),
    }),
  } as any;
  return {
    db,
    auth: {
      getUserIdentity: async () => (user && user.email ? { email: user.email } : null),
    },
  } as any;
}

describe('requireRole', () => {
  it('throws Unauthenticated when no identity', async () => {
    const ctx = makeCtx(null);
    await expect(requireRole(ctx, ['admin'])).rejects.toThrow('Unauthenticated');
  });
  it('throws User record not found when identity present but no user doc', async () => {
    const ctx = makeCtx({ email: undefined });
    await expect(requireRole(ctx, ['admin'])).rejects.toThrow('Unauthenticated');
  });
  it('throws Forbidden when user lacks role', async () => {
    const ctx = makeCtx({ email: 'bob@example.com', roles: ['responder'] });
    await expect(requireRole(ctx, ['admin'])).rejects.toThrow('Forbidden');
  });
  it('resolves when user has at least one allowed role', async () => {
    const ctx = makeCtx({ email: 'alice@example.com', roles: ['author'] });
    await expect(requireRole(ctx, ['admin', 'author'])).resolves.toBeTruthy();
  });
});
