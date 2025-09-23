import { mutation, query } from './_generated/server';
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
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    if (args.teamId) {
      await assertTeamRole(ctx, args.teamId, ['editor', 'publisher', 'admin']);
    }
    // Enforce slug uniqueness within team scope
    const existing = await ctx.db
      .query('templates')
      .withIndex('by_team_slug', (q) =>
        q.eq('teamId', args.teamId ?? undefined).eq('slug', args.slug)
      )
      .first();
    if (existing) throw new Error('Template slug exists');

    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
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
  handler: async (ctx, { templateId, body, title, type }) => {
    await assertTemplateRole(ctx, templateId, ['editor', 'publisher', 'admin']);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Not found');
    if (template.status === 'archived') throw new Error('Archived');
    const patch: { body: unknown; updatedAt: number; title?: string; type?: string } = {
      body,
      updatedAt: Date.now(),
    };
    if (title) patch.title = title;
    if (type) patch.type = type;
    await ctx.db.patch(templateId, patch);
    await ctx.runMutation(internal.audit.logAudit, {
      entityType: 'template',
      entityId: templateId,
      action: 'edit',
      summary: 'edit draft',
      actorId: template.createdBy,
    });
  },
});

export const publishTemplateVersion = mutation({
  args: { templateId: v.id('templates') },
  handler: async (ctx, { templateId }) => {
    await assertTemplateRole(ctx, templateId, ['publisher', 'admin']);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Not found');
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    const version = template.latestVersion + 1;
    const now = Date.now();
    await ctx.db.insert('templateVersions', {
      templateId,
      version,
      body: template.body,
      schemaVersion: 'v1',
      createdAt: now,
      createdBy: viewer?._id,
      publishedAt: now,
      status: 'published',
    });
    await ctx.db.patch(templateId, { latestVersion: version, status: 'published', updatedAt: now });
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
  handler: async (ctx, { templateId, version }) => {
    await assertTemplateRole(ctx, templateId, ['publisher', 'admin']);
    const snapshot = await ctx.db
      .query('templateVersions')
      .withIndex('by_template_version', (q) =>
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
  },
});

export const listTemplateVersions = query({
  args: { templateId: v.id('templates') },
  handler: async (ctx, { templateId }) => {
    // Basic authorization: ensure template is visible
    // (Editors/respondents can view published history; keeping simple here)
    const versions = await ctx.db
      .query('templateVersions')
      .withIndex('by_template', (q) => q.eq('templateId', templateId))
      .collect();
    return versions.sort((a, b) => b.version - a.version);
  },
});

// List published templates the current viewer can respond to (team-scoped or global)
export const listForRespondent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) return [];
    // Collect team memberships
    const memberships = await ctx.db
      .query('users_teams')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .collect();
    const teamSet = new Set(memberships.map((m) => m.teamId));
    const published = await ctx.db
      .query('templates')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect();
    return published
      .filter((t) => !t.teamId || teamSet.has(t.teamId))
      .map((t) => ({
        _id: t._id,
        title: t.title,
        slug: t.slug,
        type: t.type,
        latestVersion: t.latestVersion,
        teamId: t.teamId ?? null,
      }));
  },
});

// Fetch a published template (latest version body) by its slug (global scope only for now)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tmpl = await ctx.db
      .query('templates')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();
    if (!tmpl) return null;
    if (tmpl.status !== 'published') {
      // Allow creator (or team editor) to view draft
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      const viewer = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
        .first();
      if (!viewer) return null;
      if (!tmpl.createdBy || tmpl.createdBy !== viewer._id) return null;
    }
    const version = await ctx.db
      .query('templateVersions')
      .withIndex('by_template_version', (q) =>
        q.eq('templateId', tmpl._id).eq('version', tmpl.latestVersion)
      )
      .first();
    return {
      _id: tmpl._id,
      slug: tmpl.slug,
      title: tmpl.title,
      type: tmpl.type,
      latestVersion: tmpl.latestVersion,
      status: tmpl.status,
      teamId: tmpl.teamId ?? null,
      body: version?.body ?? tmpl.body,
      version: tmpl.latestVersion,
    };
  },
});

// Public list of globally published templates (no auth required)
export const listPublishedGlobal = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query('templates')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect();
    return published
      .filter((t) => !t.teamId)
      .map((t) => ({
        _id: t._id,
        slug: t.slug,
        title: t.title,
        type: t.type,
        latestVersion: t.latestVersion,
      }));
  },
});

// Draft templates created by current user (simple ownership by createdBy)
export const listMyDraftTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const viewer = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first();
    if (!viewer) return [];
    const drafts = await ctx.db
      .query('templates')
      .withIndex('by_status', (q) => q.eq('status', 'draft'))
      .collect();
    return drafts
      .filter((t) => t.createdBy && t.createdBy === viewer._id)
      .map((t) => ({
        _id: t._id,
        slug: t.slug,
        title: t.title,
        type: t.type,
        updatedAt: t.updatedAt,
      }));
  },
});

// Internal: basic initial seed (team + sample template) for respondent testing
export const seedInitial = mutation({
  args: {},
  handler: async (ctx) => {
    // Idempotent: check for a demo team and template
    const existingTeam = await ctx.db
      .query('teams')
      .withIndex('by_slug', (q) => q.eq('slug', 'demo'))
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
      .withIndex('by_team_slug', (q) => q.eq('teamId', teamId).eq('slug', 'demo-survey'))
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
  handler: async (ctx) => {
    const now = Date.now();
    const ensureTemplate = async (slug: string, title: string, body: unknown, type = 'survey') => {
      const existing = await ctx.db
        .query('templates')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
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
        { id: 'patient_census', type: 'number', label: 'Team patient census' },
        {
          id: 'sibr_occurred',
          type: 'multipleChoice',
          label: 'Did SIBR occur?',
          options: ['No', 'Yes'],
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

    return {
      ok: true,
      inserted: {
        interdisciplinaryCare,
        sibrObservation,
        sibrReadiness,
      },
    };
  },
});

// Public slug availability check (global scope only)
export const slugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query('templates')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();
    return { available: !existing };
  },
});
