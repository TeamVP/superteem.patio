import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, tokenIdentifier, email, name, imageUrl }) => {
    const now = Date.now();
    let user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', clerkId))
      .first();
    if (!user && email) {
      user = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', email))
        .first();
    }
    if (!user && tokenIdentifier) {
      user = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', tokenIdentifier))
        .first();
    }
    if (user) {
      await ctx.db.patch(user._id, {
        clerkId,
        tokenIdentifier: tokenIdentifier ?? user.tokenIdentifier,
        email: email ?? user.email,
        name: name ?? user.name,
        imageUrl: imageUrl ?? user.imageUrl,
        lastSeenAt: now,
        status: user.status || 'active',
      });
      return user._id;
    }
    return await ctx.db.insert('users', {
      clerkId,
      tokenIdentifier: tokenIdentifier ?? undefined,
      email: email ?? undefined,
      name: name ?? undefined,
      imageUrl: imageUrl ?? undefined,
      roles: ['respondent'],
      status: 'active',
      createdAt: now,
      lastSeenAt: now,
      teamIds: [],
    });
  },
});

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    return user ?? null;
  },
});