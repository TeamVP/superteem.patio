import { describe, it, expect } from 'vitest';
import { useHasRole } from './useHasRole';

// Placeholder test verifying current stub always returns true.
// Will evolve once real auth integration present.

describe('useHasRole', () => {
  it('returns true for any role set in stub implementation', () => {
    expect(useHasRole('admin')).toBe(true);
    expect(useHasRole(['author', 'responder'])).toBe(true);
  });
});
