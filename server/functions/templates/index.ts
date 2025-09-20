import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
import { buildValidationContext } from '../../shared/validation';
import type { Template } from '../../../src/types/template';

// Simplified Template record stored in templateVersions.body
export const createTemplate = mutationGeneric({
  args: {
    name: v.string(),
    type: v.string(),
    createdBy: v.string(),
    body: v.any(),
    schemaVersion: v.string(),
  },
  handler: async ({ db }, args) => {
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
    return templateId;
  },
});

export const publishVersion = mutationGeneric({
  args: { templateId: v.id('templates'), body: v.any(), schemaVersion: v.string(), createdBy: v.string() },
  handler: async ({ db }, args) => {
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
      .withIndex('by_template_version', (q) => q.eq('templateId', args.templateId).eq('version', tpl.latestVersion))
      .unique();
    return { ...tpl, latestVersionBody: latest?.body };
  },
});

export const getTemplateVersion = queryGeneric({
  args: { templateId: v.id('templates'), version: v.number() },
  handler: async ({ db }, args) => {
    const row = await db
      .query('templateVersions')
      .withIndex('by_template_version', (q) => q.eq('templateId', args.templateId).eq('version', args.version))
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
