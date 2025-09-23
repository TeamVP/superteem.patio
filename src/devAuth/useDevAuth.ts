import { useCallback, useRef } from 'react';
import { Buffer } from 'buffer';
import { getDevJwt } from './devJwt';

interface FetchArgs {
  forceRefreshToken: boolean;
}

export function useDevAuth() {
  const enabled = import.meta.env.VITE_DEV_AUTH === '1';
  const tokenRef = useRef<{ token: string; exp: number } | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: FetchArgs) => {
      if (!enabled) return null;
      const now = Math.floor(Date.now() / 1000);
      if (!forceRefreshToken && tokenRef.current && tokenRef.current.exp - 60 > now) {
        return tokenRef.current.token;
      }
      const token = await getDevJwt('dev_user_123', 'Dev User', 'dev@example.com');
      // Decode simple payload to extract exp (without verifying) for refresh logic; use Buffer for Node env
      const part = token.split('.')[1] || '';
      let payload: { exp?: number } = {};
      try {
        payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
      } catch {
        payload = {};
      }
      tokenRef.current = { token, exp: payload.exp || now + 15 * 60 };
      return token;
    },
    [enabled]
  );

  if (!enabled) {
    return { isLoading: false, isAuthenticated: false, fetchAccessToken: async () => null };
  }
  return { isLoading: false, isAuthenticated: true, fetchAccessToken };
}
