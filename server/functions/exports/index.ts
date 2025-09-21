/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryGeneric, mutationGeneric } from 'convex/server';
import { v } from 'convex/values';
import { requireRole } from '../../shared/auth';
import { toCsv } from '../../shared/toCsv';
import { writeAudit } from '../../shared/audit';

interface ExportFilters {
  templateId: string;
  from?: number;
  to?: number;
}

async function fetchResponses(db: any, filters: ExportFilters) {
  // Range scan using by_template_created index; if no from/to just collect all
  let q = db
    .query('responses')
    .withIndex('by_template_created', (idx: any) => idx.eq('templateId', filters.templateId));
  const rows = await q.collect();
  return rows.filter((r: any) => {
    if (filters.from && r.createdAt < filters.from) return false;
    if (filters.to && r.createdAt > filters.to) return false;
    return r.status === 'submitted';
  });
}

function collectVariableNames(rows: any[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const ans = r.answers || {};
    Object.keys(ans).forEach((k) => set.add(k));
  }
  return Array.from(set).sort();
}

function normalizeRows(rows: any[]): { header: string[]; data: any[][] } {
  const vars = collectVariableNames(rows);
  const header = ['responseId', 'templateId', 'templateVersion', 'submittedAt', ...vars];
  const data = rows.map((r) => {
    const ans = r.answers || {};
    return [
      r._id,
      r.templateId,
      r.templateVersion,
      r.submittedAt ?? '',
      ...vars.map((v) => ans[v] ?? ''),
    ];
  });
  return { header, data };
}

function aggregate(rows: any[]): Record<string, any> {
  const aggregates: Record<string, any> = { count: rows.length, variables: {} };
  const numericStats: Record<string, { count: number; sum: number; min: number; max: number }> = {};
  const choiceCounts: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const ans = r.answers || {};
    for (const [k, v] of Object.entries(ans)) {
      if (typeof v === 'number') {
        if (!numericStats[k]) numericStats[k] = { count: 0, sum: 0, min: v, max: v };
        const s = numericStats[k];
        s.count += 1;
        s.sum += v;
        if (v < s.min) s.min = v;
        if (v > s.max) s.max = v;
      } else if (typeof v === 'string') {
        choiceCounts[k] = choiceCounts[k] || {};
        choiceCounts[k][v] = (choiceCounts[k][v] || 0) + 1;
      } else if (Array.isArray(v)) {
        // treat arrays of strings as multi-select
        for (const item of v) {
          if (typeof item === 'string') {
            choiceCounts[k] = choiceCounts[k] || {};
            choiceCounts[k][item] = (choiceCounts[k][item] || 0) + 1;
          }
        }
      }
    }
  }
  aggregates.variables.numeric = Object.entries(numericStats).map(([k, s]) => ({
    variable: k,
    count: s.count,
    min: s.min,
    max: s.max,
    avg: s.count ? s.sum / s.count : 0,
  }));
  aggregates.variables.choice = Object.entries(choiceCounts).map(([k, counts]) => ({
    variable: k,
    counts,
  }));
  return aggregates;
}

export const getRawResponses = queryGeneric({
  args: { templateId: v.id('templates'), from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const rows = await fetchResponses((ctx as any).db, {
      templateId: args.templateId,
      from: args.from,
      to: args.to,
    });
    const norm = normalizeRows(rows);
    return { header: norm.header, rows: norm.data };
  },
});

export const getAggregates = queryGeneric({
  args: { templateId: v.id('templates'), from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const rows = await fetchResponses((ctx as any).db, {
      templateId: args.templateId,
      from: args.from,
      to: args.to,
    });
    return aggregate(rows);
  },
});

export const downloadCsv = mutationGeneric({
  args: {
    templateId: v.id('templates'),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    mode: v.string(), // raw | aggregate
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, ['admin', 'author']);
    const rows = await fetchResponses((ctx as any).db, {
      templateId: args.templateId,
      from: args.from,
      to: args.to,
    });
    if (args.mode === 'raw') {
      const norm = normalizeRows(rows);
      await writeAudit(ctx, {
        entityType: 'export',
        entityId: String(args.templateId),
        action: 'export',
        actorId: 'unknown',
        version: undefined,
        summary: 'raw export',
      });
      return toCsv(norm.header, norm.data);
    }
    if (args.mode === 'aggregate') {
      const ag = aggregate(rows);
      // flatten aggregates to CSV rows
      const numeric = ag.variables.numeric || [];
      const choice = ag.variables.choice || [];
      const header = ['type', 'variable', 'metric', 'value'];
      const data: any[][] = [];
      for (const n of numeric) {
        data.push(['numeric', n.variable, 'count', n.count]);
        data.push(['numeric', n.variable, 'min', n.min]);
        data.push(['numeric', n.variable, 'max', n.max]);
        data.push(['numeric', n.variable, 'avg', n.avg]);
      }
      for (const c of choice) {
        for (const [opt, val] of Object.entries(c.counts)) {
          data.push(['choice', c.variable, opt, val as any]);
        }
      }
      const csv = toCsv(header, data);
      await writeAudit(ctx, {
        entityType: 'export',
        entityId: String(args.templateId),
        action: 'export',
        actorId: 'unknown',
        version: undefined,
        summary: 'aggregate export',
      });
      return csv;
    }
    throw new Error('Invalid mode');
  },
});
