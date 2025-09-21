/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryGeneric } from 'convex/server';
import { v } from 'convex/values';

export const getByEntity = queryGeneric({
  args: { entityType: v.string(), entityId: v.string(), limit: v.optional(v.number()) },
  handler: async ({ db }, args) => {
    const lim = args.limit ?? 50;
    const rows = await db
      .query('auditLogs')
      .withIndex('by_entity', (q: any) =>
        q.eq('entityType', args.entityType).eq('entityId', args.entityId)
      )
      .order('desc')
      .take(lim);
    return rows.map(strip);
  },
});

export const getRecent = queryGeneric({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db }, args) => {
    const lim = args.limit ?? 100;
    const rows = await db
      .query('auditLogs')
      .withIndex('recent', (q: any) => q)
      .order('desc')
      .take(lim);
    return rows.map(strip);
  },
});

function strip(r: any) {
  return {
    id: r._id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    actorId: r.actorId,
    version: r.version,
    timestamp: r.timestamp,
    summary: r.summary,
  };
}
