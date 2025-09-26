import { mutation, query } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { assertTemplateRole, assertTeamRole } from './rbac';

export const createTemplate = mutation({
  args: {
    teamId: v.optional(v.id('teams')),
    slug: v.string(),
    title: v.string(),
    type: v.string(),
    body: v.any(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    if (args.teamId) {
      await assertTeamRole(ctx, args.teamId, ['editor', 'publisher', 'admin']);
    }
    // Enforce slug uniqueness within team scope
    const existing = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_team_slug', (q: any) =>
        q.eq('teamId', args.teamId ?? undefined).eq('slug', args.slug)
      )
      .first();
    if (existing) throw new Error('Template slug exists');

    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    const now = Date.now();
    const templateId = await ctx.db.insert('templates', {
      teamId: args.teamId ?? undefined,
      slug: args.slug,
      title: args.title,
      type: args.type,
      body: args.body,
      latestVersion: 0,
      status: 'draft',
      createdBy: viewer?._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'template',
      entityId: templateId,
      action: 'create',
      summary: `create template ${args.slug}`,
      actorId: viewer?._id,
    });
    return templateId;
  },
});

export const saveTemplateDraft = mutation({
  args: {
    templateId: v.id('templates'),
    body: v.any(),
    title: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, { templateId, body, title, type }) => {
    // CQRS: Do not mutate templates table on edit. Draft saving is a no-op server-side.
    // Frontend should keep draft state locally and only create a new snapshot on publish.
    await assertTemplateRole(ctx, templateId, ['editor', 'publisher', 'admin']);
    void body;
    void title;
    void type;
    return { ok: true } as const;
  },
});

// Begin edit mode (no-op server-side). Client enters edit locally; no templates writes.
export const beginEdit = mutation({
  args: { templateId: v.id('templates') },
  handler: async (ctx: MutationCtx, { templateId }: { templateId: Id<'templates'> }) => {
    // Require editor/publisher/admin to begin edits (no anonymous flips to draft)
    await assertTemplateRole(ctx, templateId, ['editor', 'publisher', 'admin']);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Not found');
    if (template.status === 'archived') throw new Error('Archived');
    // No status change; UI will enter editing mode client-side while keeping the
    // template publicly available via published snapshots until publish.
    return { ok: true, status: template.status };
  },
});

export const publishTemplateVersion = mutation({
  args: {
    templateId: v.id('templates'),
    body: v.any(),
    title: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    {
      templateId,
      body,
      title,
      type,
    }: { templateId: Id<'templates'>; body: unknown; title?: string; type?: string }
  ) => {
    await assertTemplateRole(ctx, templateId, ['publisher', 'admin']);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Not found');
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    const version = (template.latestVersion ?? 0) + 1;
    const now = Date.now();
    await ctx.db.insert('templateVersions', {
      templateId,
      version,
      body,
      schemaVersion: 'v1',
      createdAt: now,
      createdBy: viewer?._id,
      publishedAt: now,
      status: 'published',
    });
    // Keep read model (templates) in sync with latest snapshot (CQRS-style projection)
    await ctx.db.patch(templateId, {
      latestVersion: version,
      status: 'published',
      updatedAt: now,
      ...(title ? { title } : {}),
      ...(type ? { type } : {}),
    });
    await syncTemplateLatestFromVersions(ctx, templateId);
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'templateVersion',
      entityId: templateId,
      action: 'publish',
      summary: `publish v${version}`,
      actorId: viewer?._id,
      version,
    });
    return { version };
  },
});

export const revertTemplateVersion = mutation({
  args: { templateId: v.id('templates'), version: v.number() },
  handler: async (
    ctx: MutationCtx,
    { templateId, version }: { templateId: Id<'templates'>; version: number }
  ) => {
    await assertTemplateRole(ctx, templateId, ['publisher', 'admin']);
    const snapshot = await ctx.db
      .query('templateVersions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', templateId).eq('version', version)
      )
      .first();
    if (!snapshot) throw new Error('Snapshot not found');
    await ctx.db.patch(templateId, { body: snapshot.body, updatedAt: Date.now() });
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'template',
      entityId: templateId,
      action: 'revert',
      summary: `revert to v${version}`,
      version,
    });
    await syncTemplateLatestFromVersions(ctx, templateId);
  },
});

export const listTemplateVersions = query({
  args: { templateId: v.id('templates') },
  handler: async (ctx: QueryCtx, { templateId }: { templateId: Id<'templates'> }) => {
    // Fetch persisted snapshots
    const snapshots = (await ctx.db
      .query('templateVersions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template', (q: any) => q.eq('templateId', templateId))
      .collect()) as Doc<'templateVersions'>[];
    const tmpl = (await ctx.db.get(templateId)) as Doc<'templates'> | null;
    if (!tmpl) return [];
    // If the template.latestVersion has no snapshot (e.g. manual DB edit),
    // surface an ephemeral version so respondent UI displays the current body.
    const hasLatest = snapshots.some((s) => s.version === tmpl.latestVersion);
    let all = snapshots;
    if (!hasLatest && tmpl.body) {
      const now = Date.now();
      const ephemeral: Doc<'templateVersions'> = {
        _id: 'ephemeral' as Id<'templateVersions'>,
        _creationTime: now,
        templateId,
        version: tmpl.latestVersion,
        body: tmpl.body,
        schemaVersion: 'v1',
        createdAt: tmpl.updatedAt ?? now,
        createdBy: tmpl.createdBy,
        publishedAt: tmpl.updatedAt ?? now,
        status: tmpl.status ?? 'published',
      };
      all = [...snapshots, ephemeral];
    }
    return all.sort((a, b) => b.version - a.version);
  },
});

// List published templates the current viewer can respond to (team-scoped or global)
export const listForRespondent = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) return [];
    // Collect team memberships
    const memberships = await ctx.db
      .query('users_teams')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_user', (q: any) => q.eq('userId', viewer._id))
      .collect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamSet = new Set(memberships.map((m: any) => m.teamId));

    // Include templates whose latest snapshot is published, even if template.status is draft
    const allTemplates = await ctx.db.query('templates').collect();
    const out = [] as Array<{
      _id: Id<'templates'>;
      title: string;
      slug: string;
      type: string;
      latestVersion: number;
      teamId: Id<'teams'> | null;
    }>;
    for (const t of allTemplates) {
      // Team visibility gate
      if (t.teamId && !teamSet.has(t.teamId)) continue;
      // Consider any published snapshot, not just latestVersion linkage
      const snaps = await ctx.db
        .query('templateVersions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_template', (q: any) => q.eq('templateId', t._id))
        .collect();
      const isPublished = snaps.some((s: Doc<'templateVersions'>) => s.status === 'published');
      if (!isPublished) continue;
      out.push({
        _id: t._id,
        title: t.title,
        slug: t.slug,
        type: t.type,
        latestVersion: t.latestVersion,
        teamId: t.teamId ?? null,
      });
    }
    return out;
  },
});

// Fetch a published template (latest version body) by its slug (global scope only for now)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx: QueryCtx, { slug }: { slug: string }) => {
    const tmpl = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_slug', (q: any) => q.eq('slug', slug))
      .first();
    if (!tmpl) return null;

    // Gather all snapshots and determine the latest published one for visibility/body
    const snapshots = (await ctx.db
      .query('templateVersions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template', (q: any) => q.eq('templateId', tmpl._id))
      .collect()) as Doc<'templateVersions'>[];
    const publishedSnaps = snapshots.filter((s) => s.status === 'published');
    const latestPublished = publishedSnaps.sort((a, b) => b.version - a.version)[0] || null;

    if (!latestPublished) {
      // No published snapshot exists; restrict to editors/owner
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
      const allowed = ['editor', 'publisher', 'admin'];
      let canView = false;
      if (tmpl.createdBy && viewer._id === tmpl.createdBy) canView = true;
      if (tmpl.teamId) {
        const link = await ctx.db
          .query('users_teams')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex('by_user_team', (q: any) =>
            q.eq('userId', viewer._id).eq('teamId', tmpl.teamId!)
          )
          .first();
        if (
          link &&
          Array.isArray(link.roles) &&
          link.roles.some((r: string) => allowed.includes(r))
        ) {
          canView = true;
        }
      } else {
        // Global template: allow platform roles based on user.roles
        const vDoc = viewer as Doc<'users'>;
        if (Array.isArray(vDoc.roles) && vDoc.roles.some((r) => allowed.includes(r))) {
          canView = true;
        }
      }
      if (!canView) return null;

      // For authorized editors without a published snapshot, return current template body
      return {
        _id: tmpl._id,
        slug: tmpl.slug,
        title: tmpl.title,
        type: tmpl.type,
        latestVersion: tmpl.latestVersion,
        status: tmpl.status,
        teamId: tmpl.teamId ?? null,
        body: tmpl.body,
        version: tmpl.latestVersion,
      };
    }

    // Publicly visible when at least one published snapshot exists; serve the latest published
    return {
      _id: tmpl._id,
      slug: tmpl.slug,
      title: tmpl.title,
      type: tmpl.type,
      latestVersion: tmpl.latestVersion,
      status: 'published',
      teamId: tmpl.teamId ?? null,
      body: latestPublished.body,
      version: latestPublished.version,
    };
  },
});

// Public list of globally published templates (no auth required)
export const listPublishedGlobal = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const all = await ctx.db.query('templates').collect();
    const out: Array<{
      _id: Id<'templates'>;
      slug: string;
      title: string;
      type: string;
      latestVersion: number;
    }> = [];
    for (const t of all) {
      if (t.teamId) continue; // global only
      const snaps = await ctx.db
        .query('templateVersions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_template', (q: any) => q.eq('templateId', t._id))
        .collect();
      const isPublished = snaps.some((s: Doc<'templateVersions'>) => s.status === 'published');
      if (!isPublished) continue;
      out.push({
        _id: t._id,
        slug: t.slug,
        title: t.title,
        type: t.type,
        latestVersion: t.latestVersion,
      });
    }
    return out;
  },
});

// Draft templates created by current user (simple ownership by createdBy)
export const listMyDraftTemplates = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_tokenIdentifier', (q: any) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier)
      )
      .first();
    if (!viewer) return [];
    const drafts = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_status', (q: any) => q.eq('status', 'draft'))
      .collect();
    return (
      drafts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any) => t.createdBy && t.createdBy === viewer._id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => ({
          _id: t._id,
          slug: t.slug,
          title: t.title,
          type: t.type,
          updatedAt: t.updatedAt,
        }))
    );
  },
});

// Internal: basic initial seed (team + sample template) for respondent testing
export const seedInitial = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    // Idempotent: check for a demo team and template
    const existingTeam = await ctx.db
      .query('teams')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_slug', (q: any) => q.eq('slug', 'demo'))
      .first();
    let teamId = existingTeam?._id;
    if (!teamId) {
      teamId = await ctx.db.insert('teams', {
        slug: 'demo',
        name: 'Demo Team',
        status: 'active',
        createdBy: undefined,
        createdAt: Date.now(),
      });
    }
    // Seed a simple published template if none exists
    const existingTemplate = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_team_slug', (q: any) => q.eq('teamId', teamId).eq('slug', 'demo-survey'))
      .first();
    if (!existingTemplate) {
      const now = Date.now();
      const templateId = await ctx.db.insert('templates', {
        teamId,
        slug: 'demo-survey',
        title: 'Demo Survey',
        type: 'survey',
        body: {
          version: 1,
          questions: [
            { id: 'q1', type: 'text', label: 'How are you today?' },
            { id: 'q2', type: 'number', label: 'Rate energy (1-10)' },
          ],
        },
        latestVersion: 1,
        status: 'published',
        createdBy: undefined,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('templateVersions', {
        templateId,
        version: 1,
        body: {
          version: 1,
          questions: [
            { id: 'q1', type: 'text', label: 'How are you today?' },
            { id: 'q2', type: 'number', label: 'Rate energy (1-10)' },
          ],
        },
        schemaVersion: 'v1',
        createdAt: now,
        createdBy: undefined,
        publishedAt: now,
        status: 'published',
      });
    }
    return { ok: true };
  },
});

// Seed multiple example templates (spec examples + two minimal) idempotently.
export const seedExamples = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const now = Date.now();
    const ensureTemplate = async (slug: string, title: string, body: unknown, type = 'survey') => {
      const existing = await ctx.db
        .query('templates')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_slug', (q: any) => q.eq('slug', slug))
        .first();
      if (existing) return existing._id;
      const templateId = await ctx.db.insert('templates', {
        teamId: undefined,
        slug,
        title,
        type,
        body,
        latestVersion: 1,
        status: 'published',
        createdBy: undefined,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('templateVersions', {
        templateId,
        version: 1,
        body,
        schemaVersion: 'v1',
        createdAt: now,
        createdBy: undefined,
        publishedAt: now,
        status: 'published',
      });
      return templateId;
    };

    // Minimal simple templates
    await ensureTemplate('quick-check', 'Quick Check', {
      version: 1,
      questions: [
        { id: 'mood', type: 'text', label: 'How do you feel today?' },
        { id: 'pain', type: 'number', label: 'Pain level (0-10)' },
      ],
    });
    await ensureTemplate('handoff-notes', 'Handoff Notes', {
      version: 1,
      questions: [
        { id: 'shift', type: 'text', label: 'Current shift lead' },
        { id: 'risk', type: 'text', label: 'Any immediate risks?' },
      ],
    });

    // Spec example templates loaded inline to avoid dynamic fs access
    const interdisciplinaryCareFull = [
      'I am satisfied with the multidisciplinary teamwork on this ward.',
      'I am confident in communicating with other clinicians on this ward.',
      'The way clinicians work together saves time.',
      'The way clinicians work together improves the quality and safety of patient care.',
      "Each patient's goals and preferences are considered in the daily delivery of care.",
      'Patients are included in care planning and care delivery.',
      'Patient families are encouraged to participate in the planning and delivery of care.',
      'Patients are provided with the information they need to make decisions regarding their care.',
      'Clinicians are encouraged to think critically.',
      'Clinicians share information with others that they alone hold.',
      'Clinicians are treated as equals on this ward.',
      'Clinicians act respectfully towards each other on this ward.',
      'Tasks for team members are made clear.',
      'Continuous learning and sharing among clinical teams is promoted on this ward.',
      'Clinical teams on this ward are effective in addressing potential care problems before they arise.',
      'Clinical teams on this ward are effective in addressing potential discharge barriers before they arise.',
      'Clinical team members have the freedom to propose solutions.',
      'Clinicians combine their information to improve clinical decisions on this ward.',
      'Clinicians on this ward often go beyond their job requirements to help others accomplish their goals.',
      'There is trust between clinicians on this ward.',
      'The teamwork on this ward is better now than 6-12 months ago.',
    ];
    const interdisciplinaryCare = await ensureTemplate(
      'interdisciplinary-care-survey',
      'Interdisciplinary Care Survey',
      {
        version: 1,
        questions: interdisciplinaryCareFull.map((label, i) => ({
          id: `q${i + 1}`,
          type: 'multipleChoice',
          label,
          options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        })),
      }
    );

    const sibrObservation = await ensureTemplate('sibr-observation', 'SIBR Observation', {
      version: 1,
      questions: [
        {
          id: 'patient_census',
          type: 'number',
          label: 'Team patient census',
          minimum: 0,
          maximum: 30,
        },
        {
          id: 'sibr_occurred',
          type: 'multipleChoice',
          label: 'Did SIBR occur?',
          options: ['No', 'Yes'],
          maximumResponses: 1,
          valueMode: 'index',
        },
      ],
    });

    const sibrReadiness = await ensureTemplate('sibr-readiness-survey', 'SIBR Readiness Survey', {
      version: 1,
      questions: [
        {
          id: 'program_good',
          type: 'multipleChoice',
          label: 'This would be a good program to have on my unit:',
          options: ['Strongly Disagree', 'Disagree', 'Agree', 'Strongly Agree'],
        },
        { id: 'benefits', type: 'text', label: 'Benefits you see?' },
        { id: 'concerns', type: 'text', label: 'Concerns about implementation?' },
      ],
    });

    // AHPEQS Survey (Multiple-choice only)
    const ahpeqsBody = [
      {
        type: 'MultipleChoiceQuestion',
        label: 'My views and concerns were listened to',
        note: null,
        required: false,
        variable: '$views_listened',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never', "Didn't apply"],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'My individual needs were met',
        note: null,
        required: false,
        variable: '$needs_met',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'When a need could not be met, staff explained why',
        note: null,
        required: false,
        variable: '$needs_explained',
        enableIf: '$needs_met && $needs_met[0] >= 2',
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'I felt cared for',
        note: null,
        required: false,
        variable: '$felt_cared',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'I was involved as much as I wanted in making decisions about my treatment and care',
        note: null,
        required: false,
        variable: '$involved',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'I was kept informed as much as I wanted about my treatment and care',
        note: null,
        required: false,
        variable: '$informed',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label:
          'As far as I could tell, the staff involved in my care communicated with each other about my treatment',
        note: null,
        required: false,
        variable: '$team_communicated',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never', "Didn't apply"],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'I received pain relief that met my needs',
        note: null,
        required: false,
        variable: '$pain_relief',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never', "Didn't apply"],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label:
          'When I was in the hospital, I felt confident in the safety of my treatment and care',
        note: null,
        required: false,
        variable: '$confident_safety',
        enableIf: null,
        customValidations: [],
        options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'I experienced unexpected harm or distress as a result of my treatment or care',
        note: null,
        required: false,
        variable: '$harm_distress',
        enableIf: null,
        customValidations: [],
        options: ['Yes, physical harm', 'Yes, emotional distress', 'Yes, both', 'No'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'My harm or distress was discussed with me by staff',
        note: null,
        required: false,
        variable: '$harm_discussed',
        enableIf: '$harm_distress && $harm_distress[0] !== 3',
        customValidations: [],
        options: ['Yes', 'No', 'Not sure', "Didn't want to discuss it"],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'Overall, the quality of the treatment and care I received was:',
        note: null,
        required: false,
        variable: '$overall_quality',
        enableIf: null,
        customValidations: [],
        options: ['Very good', 'Good', 'Average', 'Poor', 'Very poor'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
    ];
    const ahpeqs = await ensureTemplate('ahpeqs-survey', 'AHPEQS Survey', ahpeqsBody);

    return {
      ok: true,
      inserted: {
        interdisciplinaryCare,
        sibrObservation,
        sibrReadiness,
        ahpeqs,
      },
    };
  },
});

// Public slug availability check (global scope only)
export const slugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx: QueryCtx, { slug }: { slug: string }) => {
    const existing = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_slug', (q: any) => q.eq('slug', slug))
      .first();
    return { available: !existing };
  },
});

// Backfill a missing templateVersions snapshot when template.latestVersion was
// manually incremented or body updated without publishTemplateVersion.
export const backfillTemplateVersion = mutation({
  args: { templateId: v.id('templates') },
  handler: async (ctx: MutationCtx, { templateId }: { templateId: Id<'templates'> }) => {
    await assertTemplateRole(ctx, templateId, ['publisher', 'admin']);
    const tmpl = await ctx.db.get(templateId);
    if (!tmpl) throw new Error('Template not found');
    const existing = await ctx.db
      .query('templateVersions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', templateId).eq('version', tmpl.latestVersion)
      )
      .first();
    if (existing) {
      return {
        ok: true,
        skipped: true,
        reason: 'Snapshot already exists',
        version: existing.version,
      };
    }
    const now = Date.now();
    await ctx.db.insert('templateVersions', {
      templateId,
      version: tmpl.latestVersion,
      body: tmpl.body,
      schemaVersion: 'v1',
      createdAt: now,
      createdBy: tmpl.createdBy,
      publishedAt: now,
      status: 'published',
    });
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'templateVersion',
      entityId: templateId,
      action: 'publish',
      summary: `backfill snapshot v${tmpl.latestVersion}`,
      version: tmpl.latestVersion,
      actorId: tmpl.createdBy,
    });
    await syncTemplateLatestFromVersions(ctx, templateId);
    return { ok: true, skipped: false, version: tmpl.latestVersion };
  },
});

// Admin: Sync all templates.latestVersion/body from latest snapshot in templateVersions
export const adminSyncTemplatesFromVersions = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const allTemplates = await ctx.db.query('templates').collect();
    for (const t of allTemplates) {
      await syncTemplateLatestFromVersions(ctx, t._id);
    }
    return { ok: true, count: allTemplates.length };
  },
});

// Admin: Ensure any template with at least one published snapshot is marked published.
// If a template has no snapshots but has a body/latestVersion, create a backfill snapshot and publish it.
export const adminPublishAllFromSnapshots = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const all = await ctx.db.query('templates').collect();
    let madePublished = 0;
    let backfilled = 0;
    for (const t of all) {
      const snaps = await ctx.db
        .query('templateVersions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_template', (q: any) => q.eq('templateId', t._id))
        .collect();
      if (snaps.length === 0) {
        // No snapshots yet; if template has a body/latestVersion, create one as published
        if (t.latestVersion >= 0) {
          await ctx.db.insert('templateVersions', {
            templateId: t._id,
            version: t.latestVersion,
            body: t.body,
            schemaVersion: 'v1',
            createdAt: t.updatedAt ?? Date.now(),
            createdBy: t.createdBy,
            publishedAt: t.updatedAt ?? Date.now(),
            status: 'published',
          });
          backfilled++;
          await syncTemplateLatestFromVersions(ctx, t._id);
        }
        continue;
      }
      const hasPublished = snaps.some((s: Doc<'templateVersions'>) => s.status === 'published');
      if (hasPublished && t.status !== 'published') {
        await ctx.db.patch(t._id, { status: 'published', updatedAt: Date.now() });
        madePublished++;
      }
    }
    return { ok: true, madePublished, backfilled };
  },
});

// Admin/backfill utility: overwrite a template body with a new full JSON structure and create next version.
// This is intentionally not exposed to regular editors; use only for data correction/migration.
export const adminOverwriteTemplateBody = mutation({
  args: {
    templateId: v.id('templates'),
    body: v.any(), // raw JSON array from spec/examples/templates/sibr-observation.json
    title: v.optional(v.string()),
    type: v.optional(v.string()),
    schemaVersion: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      templateId: Id<'templates'>;
      body: unknown;
      title?: string;
      type?: string;
      schemaVersion?: string;
    }
  ) => {
    const { templateId, body, title, type, schemaVersion } = args;
    // Authorization: require admin or publisher on template team (reuse assertTemplateRole)
    await assertTemplateRole(ctx, templateId, ['admin', 'publisher']);
    const tmpl = await ctx.db.get(templateId);
    if (!tmpl) throw new Error('Template not found');

    // Normalize & assign deterministic ids to every question node if missing.
    let counter = 0;
    const assignIds = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(assignIds);
      if (!node || typeof node !== 'object') return node;
      const out: Record<string, unknown> = { ...(node as Record<string, unknown>) };
      if (!out.id) out.id = `q${counter++}`;
      if (out.questions && Array.isArray(out.questions)) {
        out.questions = out.questions.map(assignIds);
      }
      if (out.question && typeof out.question === 'object') {
        out.question = assignIds(out.question);
      }
      return out;
    };
    const normalizedBody = assignIds(body);

    const now = Date.now();
    const nextVersion = (tmpl.latestVersion ?? 0) + 1;
    // Patch template with new body & optionally title/type
    await ctx.db.patch(templateId, {
      body: normalizedBody,
      latestVersion: nextVersion,
      updatedAt: now,
      ...(title ? { title } : {}),
      ...(type ? { type } : {}),
    });
    await ctx.db.insert('templateVersions', {
      templateId,
      version: nextVersion,
      body: normalizedBody,
      schemaVersion: schemaVersion || 'v1',
      createdAt: now,
      createdBy: tmpl.createdBy,
      publishedAt: now,
      status: 'published',
    });
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'templateVersion',
      entityId: templateId,
      action: 'publish',
      summary: `admin overwrite to v${nextVersion}`,
      version: nextVersion,
      actorId: tmpl.createdBy,
    });
    await syncTemplateLatestFromVersions(ctx, templateId);
    return { ok: true, version: nextVersion };
  },
});

// Helper: set templates.latestVersion and body from latest snapshot (CQRS-style)
async function syncTemplateLatestFromVersions(ctx: MutationCtx, templateId: Id<'templates'>) {
  const snapshots = await ctx.db
    .query('templateVersions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex('by_template', (q: any) => q.eq('templateId', templateId))
    .collect();
  if (!snapshots || snapshots.length === 0) return;
  const latest = snapshots.reduce<Doc<'templateVersions'>>(
    (acc: Doc<'templateVersions'>, cur: Doc<'templateVersions'>) =>
      cur.version > acc.version ? cur : acc,
    snapshots[0] as Doc<'templateVersions'>
  );
  await ctx.db.patch(templateId, {
    latestVersion: latest.version,
    body: latest.body,
    updatedAt: Date.now(),
    status: latest.status || 'published',
  });
}

// Admin: ensure SIBR has v2 (current) and v3 (updated) snapshots and sync template to latest
export const adminEnsureSibrV2V3 = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const now = Date.now();
    const slug = 'sibr-observation';
    let tmpl = await ctx.db
      .query('templates')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_slug', (q: any) => q.eq('slug', slug))
      .first();
    if (!tmpl) {
      // Create a blank template to attach versions to
      const templateId = await ctx.db.insert('templates', {
        teamId: undefined,
        slug,
        title: 'SIBR Observation',
        type: 'survey',
        body: [],
        latestVersion: 0,
        status: 'draft',
        createdBy: undefined,
        createdAt: now,
        updatedAt: now,
      });
      tmpl = await ctx.db.get(templateId);
    }
    if (!tmpl) {
      throw new Error('Template not found');
    }

    // Collect existing snapshots
    const snapshots = (await ctx.db
      .query('templateVersions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_template', (q: any) => q.eq('templateId', tmpl._id))
      .collect()) as Doc<'templateVersions'>[];
    const hasV2 = snapshots.some((s) => s.version === 2);
    const hasV3 = snapshots.some((s) => s.version === 3);

    // v2: current body if exists, otherwise empty
    if (!hasV2) {
      await ctx.db.insert('templateVersions', {
        templateId: tmpl._id,
        version: 2,
        body: tmpl.body,
        schemaVersion: 'v1',
        createdAt: now,
        createdBy: tmpl.createdBy,
        publishedAt: now,
        status: 'published',
      });
    }
    // v3: updated body from example spec
    if (!hasV3) {
      await ctx.db.insert('templateVersions', {
        templateId: tmpl._id,
        version: 3,
        body: SIBR_V3_BODY,
        schemaVersion: 'v1',
        createdAt: now,
        createdBy: tmpl.createdBy,
        publishedAt: now,
        status: 'published',
      });
    }

    // Sync template to the latest snapshot
    await syncTemplateLatestFromVersions(ctx, tmpl._id as Id<'templates'>);
    return { ok: true, templateId: tmpl._id };
  },
});

// Inline SIBR v3 body (from spec/examples/templates/sibr-observation.json)
const SIBR_V3_BODY = [
  {
    type: 'CompositeQuestion',
    label: null,
    note: null,
    required: false,
    variable: null,
    enableIf: null,
    customValidations: [],
    layout: 1,
    questions: [
      {
        type: 'IntegerQuestion',
        label: 'Team patient census',
        note: null,
        required: true,
        variable: '$patient_census',
        enableIf: null,
        customValidations: [
          {
            expression: '$patient_census <= 30',
            errorMessage:
              'This patient census seems very high. Please double check before submitting.',
          },
          {
            expression: '$patient_census >= ($bedside || 0) + ($hallway || 0)',
            errorMessage:
              'Patient census must be equal to or greater than the number of SIBRs at the bedside & hallway.',
          },
        ],
        display: 0,
        minimum: 1,
        maximum: null,
      },
      {
        type: 'MultipleChoiceQuestion',
        required: true,
        label: 'Did SIBR occur?',
        customValidations: [],
        options: ['No', 'Yes'],
        minimumResponses: 1,
        maximumResponses: 1,
        variable: '$sibr_occurred',
        note: null,
        enableIf: null,
        valueMode: 'index',
      },
    ],
  },
  {
    type: 'CompositeQuestion',
    label: 'Doctors who attended the round',
    note: null,
    required: false,
    variable: null,
    enableIf: '$sibr_occurred && $sibr_occurred[0] === 1',
    customValidations: [],
    layout: 2,
    questions: [
      {
        type: 'ListQuestion',
        label: null,
        note: null,
        required: false,
        variable: null,
        enableIf: null,
        customValidations: [],
        layout: 2,
        minimumAnswers: 1,
        maximumAnswers: null,
        question: {
          type: 'UserQuestion',
          label: 'Doctor',
          note: null,
          required: false,
          variable: '$doctor',
          enableIf: null,
          customValidations: [],
          jobTypeCategories: ['Medical'],
          jobTypeIds: null,
        },
      },
    ],
  },
  {
    type: 'CompositeQuestion',
    label: 'Allied who attended the round',
    note: null,
    required: false,
    variable: null,
    enableIf: '$sibr_occurred && $sibr_occurred[0] === 1',
    customValidations: [],
    layout: 2,
    questions: [
      {
        type: 'ListQuestion',
        label: null,
        note: null,
        required: false,
        variable: null,
        enableIf: null,
        customValidations: [],
        layout: 2,
        minimumAnswers: 1,
        maximumAnswers: null,
        question: {
          type: 'UserQuestion',
          label: 'Allied',
          note: null,
          required: false,
          variable: '$allied',
          enableIf: null,
          customValidations: [],
          jobTypeCategories: ['Allied Health'],
          jobTypeIds: null,
        },
      },
    ],
  },
  {
    type: 'CompositeQuestion',
    label: 'SIBR details',
    note: null,
    required: false,
    variable: null,
    enableIf: '$sibr_occurred && $sibr_occurred[0] === 1',
    customValidations: [],
    layout: 2,
    questions: [
      {
        type: 'CompositeQuestion',
        label: null,
        note: null,
        required: false,
        variable: null,
        enableIf: null,
        customValidations: [],
        layout: 1,
        questions: [
          {
            type: 'IntegerQuestion',
            required: false,
            label: 'SIBRs at the bedside',
            customValidations: [
              {
                expression: '!$bedside || $patient_census >= $bedside + $hallway',
                errorMessage:
                  'If the number of SIBRs at the bedside & in the hallway are correct, then the Team patient census (near the top of the form) is too low.',
              },
            ],
            display: 0,
            minimum: 0,
            maximum: null,
            variable: '$bedside',
            note: null,
            enableIf: null,
          },
          {
            type: 'IntegerQuestion',
            required: false,
            label: 'SIBRs in the hallway',
            customValidations: [
              {
                expression: '!$hallway || $patient_census >= $bedside + $hallway',
                errorMessage:
                  'If the number of SIBRs at the bedside & in the hallway are correct, then the Team patient census (near the top of the form) is too low.',
              },
            ],
            display: 0,
            minimum: 0,
            maximum: null,
            variable: '$hallway',
            note: null,
            enableIf: null,
          },
          {
            type: 'IntegerQuestion',
            required: false,
            label: 'Families attended on-site',
            customValidations: [
              {
                expression: '!$onsite || ($bedside + $hallway) >= ($onsite + $offsite)',
                errorMessage:
                  'The number of family attended must be less than or equal to the number of SIBRs (at the bedside & hallway).',
              },
            ],
            display: 0,
            minimum: 0,
            maximum: null,
            variable: '$onsite',
            note: null,
            enableIf: null,
          },
          {
            type: 'IntegerQuestion',
            required: false,
            label: 'Families attended remotely',
            customValidations: [
              {
                expression: '!$offsite || ($bedside + $hallway) >= ($onsite + $offsite)',
                errorMessage:
                  'The number of family attended must be less than or equal to the number of SIBRs (at the bedside & hallway).',
              },
            ],
            display: 0,
            minimum: 0,
            maximum: null,
            variable: '$offsite',
            note: null,
            enableIf: null,
          },
        ],
      },
    ],
  },
  {
    type: 'CompositeQuestion',
    label: 'Your review of the round',
    note: null,
    required: false,
    variable: null,
    enableIf: '$sibr_occurred && $sibr_occurred[0] === 1',
    customValidations: [],
    layout: 2,
    questions: [
      {
        type: 'MultipleChoiceQuestion',
        label: 'SIBR started on time',
        note: null,
        required: false,
        variable: '$ontime',
        enableIf: null,
        customValidations: [],
        options: ['No', 'Yes'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'Respectfully engaged and cross-checked patient and family',
        note: null,
        required: false,
        variable: '$structured',
        enableIf: null,
        customValidations: [],
        options: ['Some patients', 'Most patients', 'Almost all patients', 'Every patient'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'Avoided or translated medical jargon',
        note: null,
        required: false,
        variable: '$addresses_issues',
        enableIf: null,
        customValidations: [],
        options: ['Some patients', 'Most patients', 'Almost all patients', 'Every patient'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'Unhurried yet adhered to the SIBR structure',
        note: null,
        required: false,
        variable: '$discharge_plan',
        enableIf: null,
        customValidations: [],
        options: ['Some patients', 'Most patients', 'Almost all patients', 'Every patient'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
      {
        type: 'MultipleChoiceQuestion',
        label: 'Activated team around the plan and EDD',
        note: null,
        required: false,
        variable: '$quality_sibr',
        enableIf: null,
        customValidations: [],
        options: ['Some patients', 'Most patients', 'Almost all patients', 'Every patient'],
        minimumResponses: 0,
        maximumResponses: 1,
        valueMode: 'index',
      },
    ],
  },
  {
    type: 'StringQuestion',
    required: false,
    label: 'Notes',
    customValidations: [],
    lineType: 2,
    minimumLength: null,
    maximumLength: 1000,
    variable: '$notes',
    note: null,
    enableIf: null,
  },
];
