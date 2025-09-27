/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { assertAnyRole } from './rbac';

const MIN_ROLE_KEY = 'template.minCreationRole';
const DEFAULT_MIN_ROLE = 'author'; // existing behavior
export const allowedCreationRoles = [
  'respondent',
  'reviewer',
  'author',
  'admin',
  'siteAdmin',
  'superadmin',
] as const;

export const getAppSettings = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query('settings')
      .withIndex('by_key', (q: any) => q.eq('key', MIN_ROLE_KEY))
      .first();
    return { minTemplateCreationRole: row?.value ?? DEFAULT_MIN_ROLE };
  },
});

export const updateTemplateCreationMinRole = mutation({
  args: { role: v.string() },
  handler: async (ctx, { role }) => {
    if (!allowedCreationRoles.includes(role as any)) throw new Error('Invalid role');
    // Only admins / siteAdmin / superadmin can change
    await assertAnyRole(ctx, ['admin', 'siteAdmin']);
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity
      ? await ctx.db
          .query('users')
          .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
          .first()
      : null;
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_key', (q: any) => q.eq('key', MIN_ROLE_KEY))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { value: role, updatedAt: now, updatedBy: viewer?._id });
    } else {
      await ctx.db.insert('settings', {
        key: MIN_ROLE_KEY,
        value: role,
        updatedAt: now,
        updatedBy: viewer?._id,
      });
    }
    return { ok: true, role } as const;
  },
});

export const _internal_getMinCreationRole = async (ctx: any): Promise<string> => {
  const row = await ctx.db
    .query('settings')
    .withIndex('by_key', (q: any) => q.eq('key', MIN_ROLE_KEY))
    .first();
  return row?.value ?? DEFAULT_MIN_ROLE;
};
