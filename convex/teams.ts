import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const createTeam = mutation({
  args: { slug: v.string(), name: v.string() },
  handler: async (ctx, { slug, name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    // Ensure slug uniqueness
    const existing = await ctx.db
      .query('teams')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .first();
    if (existing) throw new Error('Team slug already exists');

    const now = Date.now();
    const createdBy = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
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
  handler: async (ctx, { teamId, userId, roles }) => {
    // Require caller to be team admin
    await assertTeamRole(ctx, teamId, ['admin']);
    const now = Date.now();
    const existing = await ctx.db
      .query('users_teams')
  .withIndex('by_user_team', (q) => q.eq('userId', userId).eq('teamId', teamId))
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
  handler: async (ctx, { teamId, userId }) => {
    await assertTeamRole(ctx, teamId, ['admin']);
    const existing = await ctx.db
      .query('users_teams')
  .withIndex('by_user_team', (q) => q.eq('userId', userId).eq('teamId', teamId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const listTeamMembers = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, { teamId }) => {
    await assertTeamRole(ctx, teamId, ['admin', 'publisher', 'editor']);
    return await ctx.db
      .query('users_teams')
  .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect();
  },
});

export const listViewerTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
  .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) return [];
    const links = await ctx.db
      .query('users_teams')
  .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .collect();
    return links;
  },
});

// Helper: assert caller has one of the roles on team
interface UserIdentity { tokenIdentifier: string }
interface QueryBuilder<T> { withIndex(name: string, fn: (q: any) => any): QueryBuilder<T>; first(): Promise<T | null>; collect(): Promise<T[]> }
interface Database {
  query<T>(name: string): QueryBuilder<T>;
  insert(table: string, value: any): Promise<any>;
  patch(id: any, value: any): Promise<void>;
  delete(id: any): Promise<void>;
}
interface Auth { getUserIdentity(): Promise<UserIdentity | null> }
interface Ctx { auth: Auth; db: Database }

async function assertTeamRole(ctx: Ctx, teamId: string, allowed: string[]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  const viewer = await ctx.db
    .query('users')
  .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .first();
  if (!viewer) throw new Error('No user');
  const link = await ctx.db
    .query('users_teams')
  .withIndex('by_user_team', (q) => q.eq('userId', viewer._id).eq('teamId', teamId))
    .first();
  if (!link || !link.roles.some((r: string) => allowed.includes(r))) {
    throw new Error('Forbidden');
  }
}
