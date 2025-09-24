import { describe, it, expect } from 'vitest';
import { toJSONLogic } from '../lib/expression/parser';
import { evaluate } from '../features/responses/runtime/eval';

function evalExpr(src: string, answers: Record<string, unknown>) {
  const migrated = toJSONLogic(src);
  if (!migrated.ok) throw new Error('Parse failed: ' + migrated.reason);
  return evaluate(migrated.ast, { answers });
}

describe('fallback arithmetic patterns ($var || 0)', () => {
  it('treats undefined as 0 in addition fallback pattern', () => {
    const result = evalExpr('($bedside || 0) + ($hallway || 0)', {});
    expect(result).toBe(0);
  });
  it('adds when one operand present', () => {
    expect(evalExpr('($bedside || 0) + ($hallway || 0)', { bedside: 3 })).toBe(3);
    expect(evalExpr('($bedside || 0) + ($hallway || 0)', { hallway: 2 })).toBe(2);
  });
  it('adds when both operands present', () => {
    expect(evalExpr('($bedside || 0) + ($hallway || 0)', { bedside: 3, hallway: 2 })).toBe(5);
  });
  it('works inside comparison expression', () => {
    const ok = evalExpr('$patient_census >= ($bedside || 0) + ($hallway || 0)', {
      patient_census: 5,
      bedside: 2,
      hallway: 2,
    });
    const notOk = evalExpr('$patient_census >= ($bedside || 0) + ($hallway || 0)', {
      patient_census: 3,
      bedside: 2,
      hallway: 2,
    });
    expect(ok).toBe(true);
    expect(notOk).toBe(false);
  });
});
