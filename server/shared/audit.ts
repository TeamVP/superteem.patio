/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric } from 'convex/server';
import { v } from 'convex/values';

export async function writeAudit(
  ctx: any,
  entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    version?: number;
    summary: string;
  }
) {
  await ctx.db.insert('auditLogs', {
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    version: entry.version,
    summary: entry.summary.slice(0, 200),
    timestamp: Date.now(),
  });
}

// Generic mutation to fetch recent (primarily for quick manual query use)
export const logAudit = mutationGeneric({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actorId: v.string(),
    version: v.optional(v.number()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await writeAudit(ctx, args);
    return true;
  },
});
