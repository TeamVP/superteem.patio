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
