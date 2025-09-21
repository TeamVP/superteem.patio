import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { validateAnswers, Question } from './validation';

// saveResponseDraft: upsert draft for submitter & template
export const saveResponseDraft = mutation({
  args: {
    templateId: v.id('templates'),
    answers: v.any(),
    payload: v.any(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, { templateId, answers, payload, context }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    // allow respondents (no template role assert needed for draft; could tighten later)
    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) throw new Error('User missing');

    const existing = await ctx.db
      .query('responses')
      .withIndex('by_template_version', (q) =>
        q.eq('templateId', templateId).eq('templateVersion', template.latestVersion || 0)
      )
      .collect();
    const draft = existing.find((r) => r.submitterId === viewer._id && r.status === 'draft');
    const now = Date.now();
    if (draft) {
      await ctx.db.patch(draft._id, { answers, payload, context, updatedAt: now });
      return draft._id;
    }
    return await ctx.db.insert('responses', {
      templateId,
      templateVersion: template.latestVersion,
      teamId: template.teamId ?? undefined,
      submitterId: viewer._id,
      status: 'draft',
      answers,
      payload,
      context,
      createdAt: now,
      updatedAt: now,
      submittedAt: undefined,
    });
  },
});

// submitResponse: validate & finalize
export const submitResponse = mutation({
  args: {
    templateId: v.id('templates'),
    answers: v.any(),
    payload: v.any(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, { templateId, answers, payload, context }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    if (template.status !== 'published') throw new Error('Template not published');

    const validation = validateAnswers(
      template.body as Question[],
      answers as Record<string, unknown>
    );
    if (!validation.ok) {
      // Throw a structured object that clients can detect (Convex will serialize)
      throw { code: 'INVALID_RESPONSE', fieldErrors: validation.fieldErrors };
    }

    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) throw new Error('User missing');

    const now = Date.now();
    // Insert new submitted response (immutable after submit)
    const responseId = await ctx.db.insert('responses', {
      templateId,
      templateVersion: template.latestVersion,
      teamId: template.teamId ?? undefined,
      submitterId: viewer._id,
      status: 'submitted',
      answers,
      payload,
      context,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
    });
    return responseId;
  },
});

export const listResponsesByTemplateVersion = query({
  args: { templateId: v.id('templates'), version: v.optional(v.number()) },
  handler: async (ctx, { templateId, version }) => {
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    const targetVersion = version ?? template.latestVersion;
    const list = await ctx.db
      .query('responses')
      .withIndex('by_template_version', (q) =>
        q.eq('templateId', templateId).eq('templateVersion', targetVersion)
      )
      .collect();
    return list.filter((r) => r.status === 'submitted');
  },
});

