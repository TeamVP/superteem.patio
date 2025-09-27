import { describe, it, expect } from 'vitest';

const ORDER = ['respondent', 'reviewer', 'author', 'admin', 'siteAdmin', 'superadmin'] as const;

describe('settings minTemplateCreationRole ordering', () => {
  it('superadmin always allowed regardless of min role', () => {
    for (const min of ORDER) {
      const minIdx = ORDER.indexOf(min);
      const allowed = ORDER.slice(minIdx);
      expect(allowed.includes('superadmin')).toBe(true);
    }
  });

  it('author min role includes author..superadmin', () => {
    const min = 'author';
    const allowed = ORDER.slice(ORDER.indexOf(min));
    expect(allowed).toEqual(['author', 'admin', 'siteAdmin', 'superadmin']);
  });
});
