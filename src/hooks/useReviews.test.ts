import { renderHook, act } from '@testing-library/react';
import { useReviewState } from './useReviews';
import type { Id } from '../../convex/_generated/dataModel';

describe('useReviewState', () => {
  it('manages selection and status filter', () => {
    const { result } = renderHook(() => useReviewState());
    expect(result.current.selectedResponse).toBeNull();
    act(() => result.current.setStatusFilter('reviewed'));
    expect(result.current.statusFilter).toBe('reviewed');
    const fakeId = 'resp_123' as unknown as Id<'responses'>;
    act(() => result.current.select(fakeId));
    expect(result.current.selectedResponse).toBe(fakeId);
  });
});
