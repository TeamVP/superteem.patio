import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { assertTemplateRole } from './rbac';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Id, Doc } from './_generated/dataModel';

const REVIEW_STATUSES = ['unreviewed', 'in_review', 'reviewed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function ensureStatus(status: string): ReviewStatus {
  if (!REVIEW_STATUSES.includes(status as ReviewStatus)) throw new Error('Invalid status');
  return status as ReviewStatus;
}

function assertValidTransition(prev: ReviewStatus, next: ReviewStatus) {
  if (prev === next) return;
  const allowed: Record<ReviewStatus, ReviewStatus[]> = {
    unreviewed: ['in_review', 'reviewed'],
    in_review: ['reviewed'],
    reviewed: [],
  };
  if (!allowed[prev].includes(next)) {
    throw new Error(`Invalid review status transition ${prev} -> ${next}`);
  }
}

async function resolveCurrentUserId(ctx: any): Promise<Id<'users'>> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  if (identity.tokenIdentifier) {
    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .unique();
    if (user) return user._id as Id<'users'>;
  }
  if (identity.email) {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q: any) => q.eq('email', identity.email))
      .unique();
    if (user) return user._id as Id<'users'>;
  }
  throw new Error('User record not found');
}
async function requireReviewer(ctx: any, templateId: Id<'templates'>) {
  // RQ-016: reviewer or admin may perform review actions
  await assertTemplateRole(ctx, templateId, ['admin', 'reviewer']);
}

export const addResponseReviewNote = mutation({
  args: {
    responseId: v.id('responses'),
    note: v.optional(v.string()),
    statusAfter: v.optional(v.string()),
  },
  handler: async (ctx, { responseId, note, statusAfter }) => {
    const userId = await resolveCurrentUserId(ctx);
    const response = await ctx.db.get(responseId);
    if (!response) throw new Error('Not found');
    await requireReviewer(ctx, response.templateId);
    let newStatus: ReviewStatus | undefined;
    if (statusAfter) {
      newStatus = ensureStatus(statusAfter);
      const prev = (response.reviewStatus as ReviewStatus) || 'unreviewed';
      if (newStatus) assertValidTransition(prev, newStatus);
    }
    const now = Date.now();
    await ctx.db.insert('responseReviews', {
      responseId,
      createdAt: now,
      createdBy: userId,
      note: note ?? undefined,
      statusAfter: newStatus,
    });
    const patch: Partial<
      Pick<
        Doc<'responses'>,
        'reviewNoteCount' | 'reviewStatus' | 'lastReviewedAt' | 'lastReviewedBy'
      >
    > = {
      reviewNoteCount: (response.reviewNoteCount ?? 0) + 1,
    };
    if (newStatus) {
      patch.reviewStatus = newStatus;
      patch.lastReviewedAt = now;
      patch.lastReviewedBy = userId;
    }
    await ctx.db.patch(responseId, patch);
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'response',
      entityId: responseId,
      action: newStatus ? 'review_status_change' : 'review_note_add',
      summary: newStatus ? `status -> ${newStatus}` : 'add review note',
      actorId: userId,
      meta: { noteLength: note?.length ?? 0 },
    });
    return { ok: true };
  },
});

export const setResponseReviewStatus = mutation({
  args: { responseId: v.id('responses'), status: v.string() },
  handler: async (ctx, { responseId, status }) => {
    const userId = await resolveCurrentUserId(ctx);
    const response = await ctx.db.get(responseId);
    if (!response) throw new Error('Not found');
    await requireReviewer(ctx, response.templateId);
    const newStatus = ensureStatus(status);
    const prev = (response.reviewStatus as ReviewStatus) || 'unreviewed';
    assertValidTransition(prev, newStatus);
    const now = Date.now();
    await ctx.db.patch(responseId, {
      reviewStatus: newStatus,
      lastReviewedAt: now,
      lastReviewedBy: userId,
    });
    await ctx.db.insert('responseReviews', {
      responseId,
      createdAt: now,
      createdBy: userId,
      statusAfter: newStatus,
    });
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'response',
      entityId: responseId,
      action: 'review_status_change',
      summary: `status ${prev} -> ${newStatus}`,
      actorId: userId,
    });
    return { ok: true };
  },
});

export const listReviewedResponses = query({
  args: {
    templateId: v.id('templates'),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { templateId, status, limit }) => {
    await assertTemplateRole(ctx, templateId, ['admin', 'reviewer', 'publisher', 'editor']);
    const filterStatus = status ? ensureStatus(status) : 'unreviewed';
    const rows = await ctx.db
      .query('responses')
      .withIndex('by_template_reviewStatus', (q) =>
        q.eq('templateId', templateId).eq('reviewStatus', filterStatus)
      )
      .collect();
    rows.sort((a: Doc<'responses'>, b: Doc<'responses'>) => b.createdAt - a.createdAt);
    const subset = limit ? rows.slice(0, limit) : rows;
    return subset.map((r: Doc<'responses'>) => ({
      _id: r._id,
      templateId: r.templateId,
      reviewStatus: r.reviewStatus || 'unreviewed',
      createdAt: r.createdAt,
      lastReviewedAt: r.lastReviewedAt,
      lastReviewedBy: r.lastReviewedBy,
      reviewNoteCount: r.reviewNoteCount || 0,
    }));
  },
});

// Paginated list with optional status filter. Cursor uses createdAt of last item.
export const listResponsesPaginated = query({
  args: {
    templateId: v.id('templates'),
    status: v.optional(v.string()),
    cursor: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { templateId, status, cursor, limit }) => {
    await assertTemplateRole(ctx, templateId, ['admin', 'reviewer', 'publisher', 'editor']);
    const pageSize = Math.min(Math.max(limit ?? 25, 1), 100);
    let q: any;
    if (status) {
      const s = ensureStatus(status);
      q = ctx.db
        .query('responses')
        .withIndex('by_template_reviewStatus', (idx: any) =>
          idx.eq('templateId', templateId).eq('reviewStatus', s)
        )
        .order('desc');
      if (cursor) q = q.lt('createdAt', cursor);
    } else {
      q = ctx.db
        .query('responses')
        .withIndex('by_template_created', (idx: any) => idx.eq('templateId', templateId))
        .order('desc');
      if (cursor) q = q.lt('createdAt', cursor);
    }
    const rows = await q.take(pageSize + 1);
    const hasMore = rows.length > pageSize;
    const slice = hasMore ? rows.slice(0, pageSize) : rows;
    const items = slice.map((r: Doc<'responses'>) => ({
      id: r._id,
      createdAt: r.createdAt,
      reviewStatus: (r.reviewStatus as ReviewStatus) || 'unreviewed',
      lastReviewedAt: r.lastReviewedAt,
      lastReviewedBy: r.lastReviewedBy,
      reviewNoteCount: r.reviewNoteCount || 0,
    }));
    const nextCursor = hasMore ? slice[slice.length - 1].createdAt : null;
    return { items, nextCursor, hasMore };
  },
});

export const getResponseWithReviews = query({
  args: { responseId: v.id('responses') },
  handler: async (ctx, { responseId }) => {
    const response = await ctx.db.get(responseId);
    if (!response) throw new Error('Not found');
    await assertTemplateRole(ctx, response.templateId, [
      'admin',
      'reviewer',
      'publisher',
      'editor',
    ]);
    const reviews = await ctx.db
      .query('responseReviews')
      .withIndex('by_response', (q: any) => q.eq('responseId', responseId))
      .collect();
    reviews.sort(
      (a: Doc<'responseReviews'>, b: Doc<'responseReviews'>) => a.createdAt - b.createdAt
    );
    return { response, reviews };
  },
});
