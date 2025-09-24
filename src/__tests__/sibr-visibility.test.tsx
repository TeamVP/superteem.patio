import { describe, it, expect } from 'vitest';
import { evaluate } from '../features/responses/runtime/eval';
import { toJSONLogic } from '../lib/expression/parser';

const raw = '$sibr_occurred && $sibr_occurred[0] === 1';
const migrated = toJSONLogic(raw);
if (!migrated.ok) throw new Error('Failed to parse expression for test');
const ast = migrated.ast;

const ctx = (vars: Record<string, unknown>) => ({ answers: vars });

describe('SIBR branching visibility', () => {
  it('is false when unanswered', () => {
    expect(evaluate(ast, ctx({}))).toBeFalsy();
  });
  it('is false when selection is No (0)', () => {
    expect(evaluate(ast, ctx({ sibr_occurred: [0] }))).toBeFalsy();
  });
  it('is true when selection is Yes (1)', () => {
    expect(evaluate(ast, ctx({ sibr_occurred: [1] }))).toBeTruthy();
  });
  it('returns to false after changing back to No', () => {
    expect(evaluate(ast, ctx({ sibr_occurred: [1] }))).toBeTruthy();
    expect(evaluate(ast, ctx({ sibr_occurred: [0] }))).toBeFalsy();
  });
});
