import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to find a user by clerkId
async function getByClerkId(db: any, clerkId: string) {
  return await db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", clerkId)).first();
}

// Helper to find a user by tokenIdentifier
async function getByToken(db: any, tokenIdentifier: string) {
  return await db.query("users").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", tokenIdentifier)).first();
}

// Returns the current viewer's user row or null
export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const byToken = await getByToken(ctx.db, identity.tokenIdentifier);
    return byToken ?? null;
  },
});

// Ensures a user record exists for the current identity; updates profile fields
export const upsertViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const { subject, tokenIdentifier, name, email, pictureUrl } = identity;

    const now = Date.now();
    const existing = await getByToken(ctx.db, tokenIdentifier);
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: name ?? existing.name,
        email: email ?? existing.email,
        imageUrl: pictureUrl ?? existing.imageUrl,
        lastSeenAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: subject,
        tokenIdentifier,
        email: email ?? undefined,
        name: name ?? undefined,
        imageUrl: pictureUrl ?? undefined,
        roles: ["respondent"],
        teamIds: [],
        status: "active",
        createdAt: now,
        lastSeenAt: now,
      });
    }
  },
});

// Update roles (admin/publisher/editor/respondent)
export const setRoles = mutation({
  args: { userId: v.id("users"), roles: v.array(v.string()) },
  handler: async (ctx, { userId, roles }) => {
    // Gate with your own admin check here
    await ctx.db.patch(userId, { roles });
  },
});

// Bump lastSeen for heartbeat
export const touchLastSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const user = await getByToken(ctx.db, identity.tokenIdentifier);
    if (user) await ctx.db.patch(user._id, { lastSeenAt: Date.now() });
  },
});
