import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { storePostAuthRedirect, consumePostAuthRedirect } from '@/auth/postAuthRedirect';
import { AdminAnalyticsPage } from './AdminAnalytics';

interface MockUser {
  publicMetadata?: Record<string, unknown>;
  primaryEmailAddress?: { emailAddress?: string };
}
interface ClerkMockShape {
  useUser: () => { user: MockUser | undefined; isSignedIn: boolean };
}
let currentUseUser: ClerkMockShape['useUser'] = () => ({ user: undefined, isSignedIn: false });
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => currentUseUser(),
}));

describe('post-auth redirect helpers', () => {
  // Minimal Storage interface (subset) so tests compile in jsdom/node without DOM lib
  interface MinimalStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
    key(index: number): string | null;
    readonly length: number;
  }
  type GlobalWithSession = typeof globalThis & { sessionStorage?: MinimalStorage };
  function ensureSessionStorage() {
    const g = globalThis as GlobalWithSession;
    if (typeof g.sessionStorage === 'undefined') {
      const store: Record<string, string> = {};
      const memoryStorage: MinimalStorage = {
        getItem(key: string) {
          return key in store ? store[key] : null;
        },
        setItem(key: string, value: string) {
          store[key] = value;
        },
        removeItem(key: string) {
          delete store[key];
        },
        clear() {
          Object.keys(store).forEach((k) => delete store[k]);
        },
        key(index: number) {
          return Object.keys(store)[index] || null;
        },
        get length() {
          return Object.keys(store).length;
        },
      };
      g.sessionStorage = memoryStorage;
    }
    g.sessionStorage!.clear();
  }
  beforeEach(() => {
    ensureSessionStorage();
  });
  it('stores and consumes path', () => {
    storePostAuthRedirect('/respondent/abc');
    const storageA = (globalThis as GlobalWithSession).sessionStorage!;
    expect(storageA.getItem('postAuthRedirectPath')).toBe('/respondent/abc');
    const consumed = consumePostAuthRedirect();
    expect(consumed).toBe('/respondent/abc');
    const storageB = (globalThis as GlobalWithSession).sessionStorage!;
    expect(storageB.getItem('postAuthRedirectPath')).toBeNull();
  });
});

describe('AdminAnalyticsPage gating', () => {
  it('denies non-admin', () => {
    render(<AdminAnalyticsPage />);
    expect(screen.getByText(/Access denied/i)).toBeDefined();
  });
  it('allows admin (publicMetadata.role)', () => {
    currentUseUser = () => ({
      isSignedIn: true,
      user: {
        publicMetadata: { role: 'admin' },
        primaryEmailAddress: { emailAddress: 'admin@example.com' },
      },
    });
    render(<AdminAnalyticsPage />);
    expect(screen.queryByText(/Access denied/i)).toBeNull();
    expect(screen.getByText(/Analytics Instrumentation/i)).toBeDefined();
  });
});
