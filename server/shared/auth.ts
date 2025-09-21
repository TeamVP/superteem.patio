// Using untyped db interface to avoid coupling to generated Convex types (will refine when codegen added)

// Basic role-based authorization helper (RQ-009)
// Usage: await requireRole(ctx, ['admin','author']);
// Assumes identity is attached via Convex auth (or dev shim populates identity fields)

export type Role = 'admin' | 'author' | 'reviewer' | 'responder';

interface IdentityLike {
  name?: string;
  email?: string;
  sub?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MinimalQuery {
  eq(field: string, value: any): MinimalQuery; // flexible for Convex runtime
}
interface MinimalDB {
  query(table: string): {
    withIndex(
      index: string,
      cb: (q: MinimalQuery) => MinimalQuery
    ): {
      unique(): Promise<any>;
    };
  };
}

interface Ctx {
  db: MinimalDB; // simplified
  auth: { getUserIdentity: () => Promise<IdentityLike | null> };
}

export async function getUserWithRoles(db: Ctx['db'], email: string) {
  const user = await db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
  return user;
}

export async function requireRole(ctx: Ctx, allowed: Role[]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new Error('Unauthenticated');
  const user = await getUserWithRoles(ctx.db, identity.email);
  if (!user) throw new Error('User record not found');
  const roles: string[] = user.roles || [];
  const ok = roles.some((r) => allowed.includes(r as Role));
  if (!ok) throw new Error('Forbidden');
  return { identity, user };
}

export async function optionalUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;
  return getUserWithRoles(ctx.db, identity.email);
}
