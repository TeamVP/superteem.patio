import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';

// Internal: backfill reviewStatus/reviewNoteCount for existing responses (RQ-016).
export const backfillResponseReviewFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const responses = await ctx.db.query('responses').collect();
    let count = 0;
    for (const r of responses) {
      if (r.reviewStatus === undefined || r.reviewNoteCount === undefined) {
        await ctx.db.patch(r._id, {
          reviewStatus: r.reviewStatus ?? 'unreviewed',
          reviewNoteCount: r.reviewNoteCount ?? 0,
        });
        count++;
      }
    }
    if (count) {
      await ctx.runMutation(internal.audit.logAudit, {
        entityType: 'migration',
        entityId: 'backfillResponseReviewFields',
        action: 'backfill',
        summary: `Initialized review fields on ${count} responses`,
        actorId: undefined,
        meta: { count },
      });
    }
    return { updated: count };
  },
});
