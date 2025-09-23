/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
import { requireRole } from '../../shared/auth';

// Mutation to bootstrap or update user roles.
// Accepts an array of { email, roles } and upserts user documents.
// Restricted to admin role.

export const bootstrapRoles = mutationGeneric({
  args: {
    assignments: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
        roles: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin']);
    const { db } = ctx as any;
    const now = Date.now();
    const results: { email: string; created: boolean; roles: string[] }[] = [];
    for (const a of args.assignments) {
      const existing = await db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', a.email))
        .unique();
      if (existing) {
        await db.patch(existing._id, { roles: a.roles });
        results.push({ email: a.email, created: false, roles: a.roles });
      } else {
        await db.insert('users', {
          email: a.email,
          name: a.name || a.email.split('@')[0],
          createdAt: now,
          roles: a.roles,
        });
        results.push({ email: a.email, created: true, roles: a.roles });
      }
    }
    return { count: results.length, results };
  },
});
