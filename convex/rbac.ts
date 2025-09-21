/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from './_generated/server';

interface UserLike {
  _id: string;
  roles: string[];
}
interface MembershipLike {
  roles: string[];
}
interface TemplateLike {
  teamId?: string;
}

// Fetch viewer user row (utility query)
export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
  },
});

// Internal helper (copy logic inline when used in mutations)
export async function assertTeamRole(ctx: any, teamId: string, allowed: string[]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  const viewer = await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q: any) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .first();
  if (!viewer) throw new Error('No user');
  const link = (await ctx.db
    .query('users_teams')
    .withIndex('by_user_team', (q: any) =>
      q.eq('userId', (viewer as UserLike)._id).eq('teamId', teamId)
    )
    .first()) as MembershipLike | null;
  if (!link || !link.roles.some((r) => allowed.includes(r))) {
    throw new Error('Forbidden');
  }
  return { viewer, link };
}

// allowed roles now may include 'reviewer' (RQ-016)
export async function assertTemplateRole(ctx: any, templateId: string, allowed: string[]) {
  const template = (await ctx.db.get(templateId)) as TemplateLike | null;
  if (!template) throw new Error('Template not found');
  if (template.teamId) {
    await assertTeamRole(ctx, template.teamId, allowed);
  } else {
    // Global template: fall back to platform roles
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const viewer = (await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first()) as UserLike | null;
    if (!viewer) throw new Error('No user');
    if (!viewer.roles.some((r) => allowed.includes(r))) throw new Error('Forbidden');
  }
}
