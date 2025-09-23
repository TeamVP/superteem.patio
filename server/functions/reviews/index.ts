/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
import { requireRole } from '../../shared/auth';
import { writeAudit } from '../../shared/audit';

export type ReviewStatus = 'unreviewed' | 'in_review' | 'reviewed';

export function canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  if (from === to) return true; // idempotent
  const order: ReviewStatus[] = ['unreviewed', 'in_review', 'reviewed'];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (fi === -1 || ti === -1) return false;
  // Allow forward progression only (cannot go backwards from reviewed)
  if (from === 'reviewed' && to !== 'reviewed') return false;
  return ti >= fi; // forward or same
}

// Legacy simple list (kept temporarily for backward compatibility; prefer listResponsesPaginated)
export const listReviewedResponses = queryGeneric({
  args: { templateId: v.id('templates'), status: v.optional(v.string()) },
  handler: async ({ db }, args) => {
    const status = args.status || 'unreviewed';
    const q = db
      .query('responses')
      .withIndex('by_template_reviewStatus', (idx: any) =>
        idx.eq('templateId', args.templateId).eq('reviewStatus', status)
      )
      .order('desc');
    const rows = await q.collect();
    return rows.map((r: any) => ({
      id: r._id,
      createdAt: r.createdAt,
      reviewStatus: r.reviewStatus || 'unreviewed',
      lastReviewedAt: r.lastReviewedAt,
      lastReviewedBy: r.lastReviewedBy,
      reviewNoteCount: r.reviewNoteCount || 0,
    }));
  },
});

// Paginated list supporting optional status filter. Cursor = createdAt of last item from previous page.
export const listResponsesPaginated = queryGeneric({
  args: {
    templateId: v.id('templates'),
    status: v.optional(v.string()),
    cursor: v.optional(v.number()), // createdAt value to fetch records before
    limit: v.optional(v.number()),
  },
  handler: async ({ db }, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const { status } = args;
    let q: any;
    if (status) {
      // Use compound index (templateId, reviewStatus, createdAt)
      q = db
        .query('responses')
        .withIndex('by_template_reviewStatus', (idx: any) =>
          idx.eq('templateId', args.templateId).eq('reviewStatus', status)
        )
        .order('desc');
      if (args.cursor) {
        // createdAt descending: fetch items with createdAt < cursor
        q = q.lt('createdAt', args.cursor);
      }
    } else {
      // Fallback to (templateId, createdAt) index when no status filter
      q = db
        .query('responses')
        .withIndex('by_template_created', (idx: any) => idx.eq('templateId', args.templateId))
        .order('desc');
      if (args.cursor) {
        q = q.lt('createdAt', args.cursor);
      }
    }

    const rows = await q.take(limit + 1); // request one extra to detect next page
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((r: any) => ({
      id: r._id,
      createdAt: r.createdAt,
      reviewStatus: r.reviewStatus || 'unreviewed',
      lastReviewedAt: r.lastReviewedAt,
      lastReviewedBy: r.lastReviewedBy,
      reviewNoteCount: r.reviewNoteCount || 0,
    }));
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt : null;
    return { items, nextCursor, hasMore };
  },
});

export const getResponseWithReviews = queryGeneric({
  args: { responseId: v.id('responses') },
  handler: async ({ db }, args) => {
    const r = await db.get(args.responseId);
    if (!r) return null;
    const notes = await db
      .query('responseReviews')
      .withIndex('by_response', (q: any) => q.eq('responseId', args.responseId))
      .collect();
    return { response: r, reviews: notes };
  },
});

export const addResponseReviewNote = mutationGeneric({
  args: {
    responseId: v.id('responses'),
    note: v.optional(v.string()),
    statusAfter: v.optional(v.string()),
    actorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'reviewer']);
    const { db } = ctx as any;
    const response = await db.get(args.responseId);
    if (!response) throw new Error('Response not found');
    const currentStatus: ReviewStatus = response.reviewStatus || 'unreviewed';
    const nextStatus = (args.statusAfter as ReviewStatus) || currentStatus;
    if (!canTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid transition ${currentStatus} -> ${nextStatus}`);
    }
    const now = Date.now();
    await db.insert('responseReviews', {
      responseId: args.responseId,
      createdAt: now,
      createdBy: args.actorId || 'unknown',
      note: args.note,
      statusAfter: nextStatus,
    });
    const patches: any = { reviewNoteCount: (response.reviewNoteCount || 0) + 1 };
    if (nextStatus !== currentStatus) {
      patches.reviewStatus = nextStatus;
      patches.lastReviewedAt = now;
      patches.lastReviewedBy = args.actorId || 'unknown';
    }
    await db.patch(args.responseId, patches);
    await writeAudit(ctx, {
      entityType: 'response',
      entityId: String(args.responseId),
      action: 'review',
      actorId: args.actorId || 'unknown',
      summary: args.note
        ? `note ${currentStatus} -> ${nextStatus}`
        : `status ${currentStatus} -> ${nextStatus}`,
    });
    return { status: nextStatus };
  },
});

export const setResponseReviewStatus = mutationGeneric({
  args: { responseId: v.id('responses'), status: v.string(), actorId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'reviewer']);
    const { db } = ctx as any;
    const response = await db.get(args.responseId);
    if (!response) throw new Error('Response not found');
    const currentStatus: ReviewStatus = response.reviewStatus || 'unreviewed';
    const nextStatus = args.status as ReviewStatus;
    if (!canTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid transition ${currentStatus} -> ${nextStatus}`);
    }
    const now = Date.now();
    await db.patch(args.responseId, {
      reviewStatus: nextStatus,
      lastReviewedAt: now,
      lastReviewedBy: args.actorId || 'unknown',
    });
    await writeAudit(ctx, {
      entityType: 'response',
      entityId: String(args.responseId),
      action: 'review',
      actorId: args.actorId || 'unknown',
      summary: `status ${currentStatus} -> ${nextStatus}`,
    });
    return { status: nextStatus };
  },
});
