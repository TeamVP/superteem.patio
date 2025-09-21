import { migrateExpression } from '../lib/expression/parser';

describe('expression migration', () => {
  it('migrates logical && with indexed variable comparison', () => {
    const r = migrateExpression('$sibr_occurred && $sibr_occurred[0] === 1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Should flatten into && with == (=== downgraded)
      expect(r.warnings).toContain('operator=== downgraded to ==');
      expect(r.ast).toEqual({
        '&&': [{ var: 'sibr_occurred' }, { '==': [{ var: 'sibr_occurred.0' }, 1] }],
      });
    }
  });

  it('migrates arithmetic with precedence and fallbacks', () => {
    const r = migrateExpression('$patient_census >= ($bedside || 0) + ($hallway || 0)');
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Current parser leaves || nodes; verify structure reflects precedence: >= left var vs + right
      expect(r.warnings).toContain('fallback_pattern');
      expect(r.ast).toEqual({
        '>=': [
          { var: 'patient_census' },
          { '+': [{ '||': [{ var: 'bedside' }, 0] }, { '||': [{ var: 'hallway' }, 0] }] },
        ],
      });
    }
  });

  it('rejects non-zero index', () => {
    const r = migrateExpression('$foo[1]');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('unsupported_index');
      expect(r.detail).toMatch(/Only zero index/);
      expect(r.issues?.[0].code).toBe('unsupported_index');
    }
  });

  it('rejects unknown trailing tokens', () => {
    const r = migrateExpression('$foo 123');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason === 'parse_error' || r.reason === 'trailing_tokens').toBe(true);
    }
  });
});
