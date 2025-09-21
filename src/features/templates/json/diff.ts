import type { Template, Question } from '../../../types/template';

export interface TemplateDiffSummary {
  addedQuestions: number;
  removedQuestions: number;
  changedQuestions: number;
  metadataChanges: string[];
  orphanedVariables: string[];
}

function questionKey(q: Question): string {
  return q.id || q.variable || Math.random().toString(36).slice(2, 8);
}

export function diffTemplates(a: Template, b: Template): TemplateDiffSummary {
  const aMap = new Map<string, Question>();
  const bMap = new Map<string, Question>();
  a.body.forEach((q) => aMap.set(questionKey(q), q));
  b.body.forEach((q) => bMap.set(questionKey(q), q));

  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const [k, v] of bMap) {
    if (!aMap.has(k)) added++;
    else if (!sameQuestion(aMap.get(k)!, v)) changed++;
  }
  for (const k of aMap.keys()) {
    if (!bMap.has(k)) removed++;
  }
  const metadataChanges: string[] = [];
  if (a.title !== b.title) metadataChanges.push('title');
  if (a.version !== b.version) metadataChanges.push('version');
  if ((a.tags || []).join(',') !== (b.tags || []).join(',')) metadataChanges.push('tags');

  // Simple orphan detection: variables referenced in enableIf no longer provided
  const provided = new Set<string>();
  const referenced = new Set<string>();
  for (const q of b.body) if (q.variable) provided.add(q.variable.replace(/^\$/, ''));
  const refVarRegex = /\$[a-zA-Z0-9_]+/g;
  for (const q of b.body) {
    const src = [q.enableIf, ...(q.customValidations || []).map((r) => r.expression)].filter(
      Boolean
    ) as string[];
    for (const s of src) {
      const matches = s.match(refVarRegex) || [];
      matches.forEach((m) => referenced.add(m.slice(1)));
    }
  }
  const orphanedVariables = Array.from(referenced).filter((v) => !provided.has(v));

  return {
    addedQuestions: added,
    removedQuestions: removed,
    changedQuestions: changed,
    metadataChanges,
    orphanedVariables,
  };
}

function sameQuestion(a: Question, b: Question): boolean {
  return a.type === b.type && a.label === b.label && a.variable === b.variable;
}
