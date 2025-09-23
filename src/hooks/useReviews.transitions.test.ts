import { describe, it, expect } from 'vitest';
import { canTransition, ReviewStatus } from '../../server/functions/reviews/index';

const statuses: ReviewStatus[] = ['unreviewed', 'in_review', 'reviewed'];

describe('review status transitions', () => {
  it('allows idempotent transitions', () => {
    statuses.forEach((s) => expect(canTransition(s, s)).toBe(true));
  });
  it('allows forward transitions', () => {
    expect(canTransition('unreviewed', 'in_review')).toBe(true);
    expect(canTransition('unreviewed', 'reviewed')).toBe(true);
    expect(canTransition('in_review', 'reviewed')).toBe(true);
  });
  it('blocks backward transitions', () => {
    expect(canTransition('in_review', 'unreviewed')).toBe(false);
    expect(canTransition('reviewed', 'in_review')).toBe(false);
    expect(canTransition('reviewed', 'unreviewed')).toBe(false);
  });
});
