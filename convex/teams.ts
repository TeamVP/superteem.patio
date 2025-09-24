import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { assertTeamRole } from './rbac';

export const createTeam = mutation({
  args: { slug: v.string(), name: v.string() },
  handler: async (ctx: any, { slug, name }: { slug: string; name: string }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    // Ensure slug uniqueness
    const existing = await ctx.db
      .query('teams')
      .withIndex('by_slug', (q: any) => q.eq('slug', slug))
      .first();
    if (existing) throw new Error('Team slug already exists');

    const now = Date.now();
    const createdBy = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q: any) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    const teamId = await ctx.db.insert('teams', {
      slug,
      name,
      status: 'active',
      createdBy: createdBy?._id,
      createdAt: now,
    });

    // Creator becomes team admin
    if (createdBy) {
      await ctx.db.insert('users_teams', {
        userId: createdBy._id,
        teamId,
        roles: ['admin'],
        joinedAt: now,
        invitedBy: createdBy._id,
        status: 'active',
      });
    }
    return teamId;
  },
});

export const addOrUpdateMember = mutation({
  args: {
    teamId: v.id('teams'),
    userId: v.id('users'),
    roles: v.array(v.string()),
  },
  handler: async (
    ctx: any,
    { teamId, userId, roles }: { teamId: string; userId: string; roles: string[] }
  ) => {
    await assertTeamRole(ctx, teamId, ['admin']);
    const now = Date.now();
    const existing = await ctx.db
      .query('users_teams')
      .withIndex('by_user_team', (q: any) => q.eq('userId', userId).eq('teamId', teamId))
      .first();
    if (existing) {
    await ctx.db.patch(existing._id, { roles, status: 'active' });
      return existing._id;
    }
    return await ctx.db.insert('users_teams', {
      userId,
      teamId,
      roles,
      joinedAt: now,
      status: 'active',
    });
  },
});

export const removeMember = mutation({
  args: { teamId: v.id('teams'), userId: v.id('users') },
  handler: async (ctx: any, { teamId, userId }: { teamId: string; userId: string }) => {
    await assertTeamRole(ctx, teamId, ['admin']);
    const existing = await ctx.db
      .query('users_teams')
      .withIndex('by_user_team', (q: any) => q.eq('userId', userId).eq('teamId', teamId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const listTeamMembers = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx: any, { teamId }: { teamId: string }) => {
    await assertTeamRole(ctx, teamId, ['admin', 'publisher', 'editor']);
    return await ctx.db
      .query('users_teams')
      .withIndex('by_team', (q: any) => q.eq('teamId', teamId))
      .collect();
  },
});

export const listViewerTeams = query({
  args: {},
  handler: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q: any) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) return [];
    const links = await ctx.db
      .query('users_teams')
      .withIndex('by_user', (q: any) => q.eq('userId', viewer._id))
      .collect();
    return links;
  },
});

// Local assertTeamRole removed; using shared helper from rbac.
