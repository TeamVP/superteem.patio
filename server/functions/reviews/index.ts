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

export const listReviewedResponses = queryGeneric({
  args: { templateId: v.id('templates'), status: v.optional(v.string()) },
  handler: async ({ db }, args) => {
    const q = db
      .query('responses')
      .withIndex('by_template_reviewStatus', (idx: any) =>
        idx.eq('templateId', args.templateId).eq('reviewStatus', args.status || 'unreviewed')
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
