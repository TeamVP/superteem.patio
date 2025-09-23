import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const logAudit = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    summary: v.string(),
    actorId: v.optional(v.id('users')),
    version: v.optional(v.number()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { entityType, entityId, action, summary, actorId, version, meta } = args;
    const timestamp = Date.now();
    await ctx.db.insert('auditLogs', {
      entityType,
      entityId,
      action,
      summary: summary.slice(0, 256),
      actorId,
      version,
      meta,
      timestamp,
    });
  },
});
