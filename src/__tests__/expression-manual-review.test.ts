import { migrateExpression } from '../lib/expression/parser';

describe('expression manual review flags', () => {
  it('flags unsupported operator ^', () => {
    const r = migrateExpression('$a ^ $b');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unexpected_character');
      expect(r.issues?.[0].code).toBe('unexpected_character');
    }
  });

  it('flags unsupported non-zero index', () => {
    const r = migrateExpression('$foo[2]');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_index');
      expect(r.issues?.[0].code).toBe('unsupported_index');
    }
  });

  it('flags unsupported chained index on number literal', () => {
    const r = migrateExpression('1[0]');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // parse_error due to unexpected token flow (number cannot be indexed in current impl)
      expect(['parse_error', 'unsupported_index']).toContain(r.reason);
    }
  });
});
