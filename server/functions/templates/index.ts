/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
import { buildValidationContext } from '../../shared/validation';
import { requireRole } from '../../shared/auth';
import { writeAudit } from '../../shared/audit';
import type { Template } from '../../../src/types/template';
import { actionGeneric } from 'convex/server';

// Simplified Template record stored in templateVersions.body
export const createTemplate = mutationGeneric({
  args: {
    name: v.string(),
    type: v.string(),
    createdBy: v.string(),
    body: v.any(),
    schemaVersion: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const { db } = ctx as any;
    const now = Date.now();
    const templateId = await db.insert('templates', {
      name: args.name,
      type: args.type,
      latestVersion: 1,
      createdBy: args.createdBy,
      createdAt: now,
    });
    const template: Template = {
      id: String(templateId),
      type: args.type as unknown as Template['type'],
      version: '1',
      body: args.body,
    };
    buildValidationContext(template);
    await db.insert('templateVersions', {
      templateId,
      version: 1,
      body: template,
      schemaVersion: args.schemaVersion,
      createdAt: now,
      createdBy: args.createdBy,
    });
    await writeAudit(ctx, {
      entityType: 'template',
      entityId: String(templateId),
      action: 'publish',
      actorId: args.createdBy,
      version: 1,
      summary: 'initial publish',
    });
    return templateId;
  },
});

export const publishVersion = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    body: v.any(),
    schemaVersion: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const { db } = ctx as any;
    const tpl = await db.get(args.templateId);
    if (!tpl) throw new Error('Template not found');
    const nextVersion = (tpl.latestVersion || 0) + 1;
    const now = Date.now();
    const template: Template = {
      id: String(args.templateId),
      type: tpl.type as unknown as Template['type'],
      version: String(nextVersion),
      body: args.body,
    };
    buildValidationContext(template);
    await db.insert('templateVersions', {
      templateId: args.templateId,
      version: nextVersion,
      body: template,
      schemaVersion: args.schemaVersion,
      createdAt: now,
      createdBy: args.createdBy,
    });
    await db.patch(args.templateId, { latestVersion: nextVersion });
    await writeAudit(ctx, {
      entityType: 'template',
      entityId: String(args.templateId),
      action: 'publish',
      actorId: args.createdBy,
      version: nextVersion,
      summary: `publish v${nextVersion}`,
    });
    return { templateId: args.templateId, version: nextVersion };
  },
});

export const saveDraft = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    body: v.any(),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const { db } = ctx as any;
    // store draft as latestVersion body patch? For now just log edit; body kept only when published.
    const tpl = await db.get(args.templateId);
    if (!tpl) throw new Error('Template not found');
    await writeAudit(ctx, {
      entityType: 'template',
      entityId: String(args.templateId),
      action: 'edit',
      actorId: args.actorId,
      version: tpl.latestVersion,
      summary: 'draft edit',
    });
    return true;
  },
});

export const revertToVersion = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    version: v.number(),
    actorId: v.string(),
    schemaVersion: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const { db } = ctx as any;
    const tpl = await db.get(args.templateId);
    if (!tpl) throw new Error('Template not found');
    const target = await db
      .query('templateVersions')
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', args.templateId).eq('version', args.version)
      )
      .unique();
    if (!target) throw new Error('Version not found');
    const nextVersion = (tpl.latestVersion || 0) + 1;
    const now = Date.now();
    await db.insert('templateVersions', {
      templateId: args.templateId,
      version: nextVersion,
      body: { ...target.body, version: String(nextVersion) },
      schemaVersion: args.schemaVersion,
      createdAt: now,
      createdBy: args.actorId,
    });
    await db.patch(args.templateId, { latestVersion: nextVersion });
    await writeAudit(ctx, {
      entityType: 'template',
      entityId: String(args.templateId),
      action: 'publish',
      actorId: args.actorId,
      version: nextVersion,
      summary: `revert from v${args.version} -> v${nextVersion}`,
    });
    return { templateId: args.templateId, version: nextVersion };
  },
});

export const getTemplate = queryGeneric({
  args: { templateId: v.id('templates') },
  handler: async ({ db }, args) => {
    const tpl = await db.get(args.templateId);
    if (!tpl) return null;
    const latest = await db
      .query('templateVersions')
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', args.templateId).eq('version', tpl.latestVersion)
      )
      .unique();
    return { ...tpl, latestVersionBody: latest?.body };
  },
});

export const getTemplateVersion = queryGeneric({
  args: { templateId: v.id('templates'), version: v.number() },
  handler: async ({ db }, args) => {
    const row = await db
      .query('templateVersions')
      .withIndex('by_template_version', (q: any) =>
        q.eq('templateId', args.templateId).eq('version', args.version)
      )
      .unique();
    return row?.body ?? null;
  },
});

export const listTemplates = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    const all = await db.query('templates').collect();
    return all.map((t) => ({
      id: t._id,
      name: t.name,
      type: t.type,
      latestVersion: t.latestVersion,
    }));
  },
});

// Seed a small set of templates + responses for user testing.
export const seedDemoData = actionGeneric({
  args: { actorId: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { db } = ctx as any;
    const existingTemplates = await db.query('templates').collect();
    if (existingTemplates.length && !args.force) {
      return { skipped: true, reason: 'Templates already exist (use force=true to reseed)' };
    }
    // Simple template bodies
    const baseTemplates: Array<{ name: string; type: string; body: any }> = [
      { name: 'Readiness Survey', type: 'survey', body: { id: 'readiness', questions: [] } },
      { name: 'Observation Form', type: 'observation', body: { id: 'observation', questions: [] } },
      { name: 'Care Review', type: 'survey', body: { id: 'care', questions: [] } },
    ];
    const now = Date.now();
    const created: string[] = [];
    for (const tpl of baseTemplates) {
      const id = await db.insert('templates', {
        name: tpl.name,
        type: tpl.type,
        latestVersion: 1,
        createdBy: args.actorId,
        createdAt: now,
      });
      await db.insert('templateVersions', {
        templateId: id,
        version: 1,
        body: { id: String(id), type: tpl.type, version: '1', body: tpl.body },
        schemaVersion: '1',
        createdAt: now,
        createdBy: args.actorId,
      });
      created.push(String(id));
      // Insert responses with varied reviewStatus
      const reviewStatuses = ['unreviewed', 'in_review', 'reviewed'];
      for (let i = 0; i < 6; i++) {
        const rs = reviewStatuses[i % reviewStatuses.length];
        const rId = await db.insert('responses', {
          templateId: id,
          templateVersion: 1,
          answers: {},
          payload: {},
          submitterId: 'demo_user',
          status: 'submitted',
          createdAt: now + i * 1000,
          submittedAt: now + i * 1000,
          reviewStatus: rs,
          lastReviewedAt: rs !== 'unreviewed' ? now + i * 1000 : undefined,
          lastReviewedBy: rs !== 'unreviewed' ? args.actorId : undefined,
          reviewNoteCount: rs === 'reviewed' ? 1 : 0,
        });
        if (rs === 'reviewed') {
          await db.insert('responseReviews', {
            responseId: rId,
            createdAt: now + i * 1000,
            createdBy: args.actorId,
            note: 'Approved in seed',
            statusAfter: 'reviewed',
          });
        }
      }
    }
    return { createdTemplates: created, responsesPerTemplate: 6 };
  },
});
