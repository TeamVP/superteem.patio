import { describe, it, expect, vi } from 'vitest';
import { useDevAuth } from './useDevAuth';
import { renderHook, act } from '@testing-library/react';

// Helper to mutate import.meta.env during tests
function setEnv(key: string, value: string | undefined) {
  // @ts-ignore
  import.meta.env[key] = value;
}

describe('useDevAuth', () => {
  it('disabled when VITE_DEV_AUTH not set', async () => {
    setEnv('VITE_DEV_AUTH', undefined as any);
    const { result } = renderHook(() => useDevAuth());
    expect(result.current.isAuthenticated).toBe(false);
    const token = await result.current.fetchAccessToken({ forceRefreshToken: false });
    expect(token).toBeNull();
  });
  it('enabled returns token', async () => {
    setEnv('VITE_DEV_AUTH', '1');
    setEnv('VITE_DEV_JWT_SECRET', 'testsecret');
    const { result } = renderHook(() => useDevAuth());
    expect(result.current.isAuthenticated).toBe(true);
    const token = await result.current.fetchAccessToken({ forceRefreshToken: true });
    expect(typeof token).toBe('string');
    expect((token as string).split('.').length).toBe(3);
  });
});
