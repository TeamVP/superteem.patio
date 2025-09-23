/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';
import { buildValidationContext, runValidation } from '../../shared/validation';
import { requireRole } from '../../shared/auth';
import type { Template } from '../../../src/types/template';
import { writeAudit } from '../../shared/audit';

async function loadTemplateVersion(
  db: any,
  templateId: string,
  version: number
): Promise<Template | null> {
  const row = await db
    .query('templateVersions')
    .withIndex('by_template_version', (q: any) =>
      q.eq('templateId', templateId).eq('version', version)
    )
    .unique();
  return row?.body ?? null;
}

export const saveDraft = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    templateVersion: v.number(),
    answers: v.any(),
    payload: v.any(),
    submitterId: v.string(),
  },
  handler: async (context, args) => {
    await requireRole(context as any, ['admin', 'author', 'responder']);
    const { db } = context as any;
    const tpl = await loadTemplateVersion(db, args.templateId, args.templateVersion);
    if (!tpl) throw new Error('Template version not found');
    const vctx = buildValidationContext(tpl);
    const result = runValidation(tpl, args.answers, vctx, {});
    // Drafts can have errors; we still store but return them.
    const now = Date.now();
    const id = await db.insert('responses', {
      templateId: args.templateId,
      templateVersion: args.templateVersion,
      answers: args.answers,
      payload: args.payload,
      submitterId: args.submitterId,
      status: 'draft',
      createdAt: now,
      submittedAt: undefined,
    });
    return { id, validation: result };
  },
});

export const submitResponse = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    templateVersion: v.number(),
    answers: v.any(),
    payload: v.any(),
    submitterId: v.string(),
  },
  handler: async (context, args) => {
    await requireRole(context as any, ['admin', 'author', 'responder']);
    const { db } = context as any;
    const tpl = await loadTemplateVersion(db, args.templateId, args.templateVersion);
    if (!tpl) throw new Error('Template version not found');
    const vctx = buildValidationContext(tpl);
    const result = runValidation(tpl, args.answers, vctx, {});
    if (Object.keys(result.fieldErrors).length > 0 || result.formErrors.length > 0) {
      throw new Error('Validation failed');
    }
    const now = Date.now();
    const id = await db.insert('responses', {
      templateId: args.templateId,
      templateVersion: args.templateVersion,
      answers: args.answers,
      payload: args.payload,
      submitterId: args.submitterId,
      status: 'submitted',
      createdAt: now,
      submittedAt: now,
    });
    await writeAudit(context as any, {
      entityType: 'response',
      entityId: String(id),
      action: 'submit',
      actorId: args.submitterId,
      version: args.templateVersion,
      summary: `submit response template ${args.templateId} v${args.templateVersion}`,
    });
    return { id };
  },
});

export const listResponsesByTemplate = queryGeneric({
  args: { templateId: v.id('templates') },
  handler: async ({ db }, args) => {
    const rows = await db
      .query('responses')
      .withIndex('by_template_version', (q: any) => q.eq('templateId', args.templateId))
      .collect();
    return rows.map((r: any) => ({
      id: r._id,
      templateVersion: r.templateVersion,
      status: r.status,
      createdAt: r.createdAt,
    }));
  },
});
