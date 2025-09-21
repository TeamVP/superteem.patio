import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme (RQ-001)', () => {
  it('toggles between light and dark themes', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });
});
