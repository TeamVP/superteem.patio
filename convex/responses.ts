import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { validateAnswers, Question } from './validation';
import type { Id } from './_generated/dataModel';

// saveResponseDraft: upsert draft for submitter & template
export const saveResponseDraft = mutation({
  args: {
    templateId: v.id('templates'),
    answers: v.any(),
    payload: v.any(),
    context: v.optional(v.any()),
  },
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    args: {
      templateId: Id<'templates'>;
      answers: unknown;
      payload: unknown;
      context?: unknown;
    }
  ) => {
    const { templateId, answers, payload, context } = args;
    const identity = await ctx.auth.getUserIdentity();
    // In unauthenticated contexts (e.g., public dev), silently no-op drafts
    if (!identity) return undefined;
    const stripDollarKeys = (obj: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj || {})) {
        const key = k.startsWith('$') ? k.slice(1) : k;
        out[key] = obj[k];
      }
      return out;
    };
    const storedAnswers = stripDollarKeys(answers as Record<string, unknown>);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    // allow respondents (no template role assert needed for draft; could tighten later)
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) throw new Error('User missing');

    const existing = await ctx.db
      .query('responses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', templateId).eq('templateVersion', template.latestVersion || 0)
      )
      .collect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draft = existing.find((r: any) => r.submitterId === viewer._id && r.status === 'draft');
    const now = Date.now();
    if (draft) {
      await ctx.db.patch(draft._id, { answers: storedAnswers, payload, context, updatedAt: now });
      return draft._id;
    }
    return await ctx.db.insert('responses', {
      templateId,
      templateVersion: template.latestVersion,
      teamId: template.teamId ?? undefined,
      submitterId: viewer._id,
      status: 'draft',
      answers: storedAnswers,
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
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    args: {
      templateId: Id<'templates'>;
      answers: unknown;
      payload: unknown;
      context?: unknown;
    }
  ) => {
    const { templateId, answers, payload, context } = args;
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    if (template.status !== 'published') throw new Error('Template not published');
    const identity = await ctx.auth.getUserIdentity();
    // Allow anonymous submissions only for global (no team) published templates
    if (!identity && template.teamId) throw new Error('Unauthenticated');

    // Extract questions array from body or use as-is if already an array
    const rawBody = template.body as unknown;
    let templateBody: Question[] = [];
    if (Array.isArray(rawBody)) {
      templateBody = rawBody as Question[];
    } else if (rawBody && typeof rawBody === 'object') {
      const maybe = rawBody as { questions?: unknown };
      if (Array.isArray(maybe.questions)) templateBody = maybe.questions as Question[];
    }
    // Normalize legacy short types to full types
    const normalizeTypes = (qs: Question[]): Question[] =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qs.map((q: any) => {
        const t = q.type;
        let type = t;
        if (t === 'text') type = 'StringQuestion';
        if (t === 'number') type = 'IntegerQuestion';
        if (t === 'multipleChoice') type = 'MultipleChoiceQuestion';
        const out = { ...q, type } as Question;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((out as any).questions)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (out as any).questions = normalizeTypes((out as any).questions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((out as any).question)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (out as any).question = normalizeTypes([(out as any).question])[0];
        return out;
      });
    const validation = validateAnswers(
      normalizeTypes(templateBody),
      answers as Record<string, unknown>
    );
    if (!validation.ok) {
      // Throw a structured object that clients can detect (Convex will serialize)
      throw { code: 'INVALID_RESPONSE', fieldErrors: validation.fieldErrors };
    }

    let viewer: { _id: Id<'users'> } | null = null;
    if (identity) {
      viewer = await ctx.db
        .query('users')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_tokenIdentifier', (q: any) =>
          q.eq('tokenIdentifier', identity.tokenIdentifier)
        )
        .first();
      // If authenticated but user record missing, treat as unauth for submission insert
    }

    const now = Date.now();
    const stripDollarKeys = (obj: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj || {})) {
        const key = k.startsWith('$') ? k.slice(1) : k;
        out[key] = obj[k];
      }
      return out;
    };
    const storedAnswers = stripDollarKeys(answers as Record<string, unknown>);
    // Insert new submitted response (immutable after submit)
    const responseId = await ctx.db.insert('responses', {
      templateId,
      templateVersion: template.latestVersion,
      teamId: template.teamId ?? undefined,
      submitterId: viewer?._id,
      status: 'submitted',
      answers: storedAnswers,
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
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    args: { templateId: Id<'templates'>; version?: number }
  ) => {
    const { templateId, version } = args;
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    const targetVersion = version ?? template.latestVersion;
    const list = await ctx.db
      .query('responses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', templateId).eq('templateVersion', targetVersion)
      )
      .collect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.filter((r: any) => r.status === 'submitted');
  },
});

export const getDraft = query({
  args: { templateId: v.id('templates') },
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    args: { templateId: Id<'templates'> }
  ) => {
    const { templateId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) return null;
    const drafts = await ctx.db
      .query('responses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template_version', (q: any) => q.eq('templateId', templateId))
      .collect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return drafts.find((r: any) => r.submitterId === viewer._id && r.status === 'draft') || null;
  },
});

// listDraftsForUser: recent drafts sorted by updatedAt desc
export const listDraftsForUser = query({
  args: {},
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as DraftSummary[];
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) return [] as DraftSummary[];
    const drafts = await ctx.db
      .query('responses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_submitter_updated', (q: any) => q.eq('submitterId', viewer._id))
      .collect();
    const filtered = drafts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.status === 'draft')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
      .slice(0, 25);
    const cache = new Map<string, string>();
    const out: DraftSummary[] = [];
    for (const d of filtered) {
      const key = d.templateId as unknown as string;
      let title = cache.get(key);
      if (!title) {
        const t = await ctx.db.get(d.templateId);
        if (t?.title) {
          cache.set(key, t.title);
          title = t.title;
        }
      }
      out.push({
        _id: d._id,
        templateId: d.templateId,
        updatedAt: d.updatedAt,
        templateTitle: title,
      });
    }
    return out;
  },
});

// listRecentSubmissionsForUser: last 5 submitted responses desc by submittedAt
export const listRecentSubmissionsForUser = query({
  args: {},
  handler: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as SubmissionSummary[];
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) return [] as SubmissionSummary[];
    const submitted = await ctx.db
      .query('responses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_submitter_submitted', (q: any) => q.eq('submitterId', viewer._id))
      .collect();
    const filtered = submitted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.status === 'submitted' && r.submittedAt)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.submittedAt! - a.submittedAt!)
      .slice(0, 5);
    const cache = new Map<string, string>();
    const out: SubmissionSummary[] = [];
    for (const r of filtered) {
      const key = r.templateId as unknown as string;
      let title = cache.get(key);
      if (!title) {
        const t = await ctx.db.get(r.templateId);
        if (t?.title) {
          cache.set(key, t.title);
          title = t.title;
        }
      }
      out.push({
        _id: r._id,
        templateId: r.templateId,
        submittedAt: r.submittedAt!,
        templateTitle: title,
      });
    }
    return out;
  },
});

interface DraftSummary {
  _id: Id<'responses'>;
  templateId: Id<'templates'>;
  updatedAt: number;
  templateTitle?: string;
}

interface SubmissionSummary {
  _id: Id<'responses'>;
  templateId: Id<'templates'>;
  submittedAt: number;
  templateTitle?: string;
}

