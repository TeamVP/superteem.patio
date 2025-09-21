import { renderHook, act } from '@testing-library/react';
import { useReviewState } from './useReviews';

describe('useReviewState', () => {
  it('manages selection and status filter', () => {
    const { result } = renderHook(() => useReviewState());
    expect(result.current.selectedResponse).toBeNull();
    act(() => result.current.setStatusFilter('reviewed'));
    expect(result.current.statusFilter).toBe('reviewed');
  act(() => result.current.select('resp_123' as unknown as string));
    expect(result.current.selectedResponse).toBe('resp_123');
  });
});
