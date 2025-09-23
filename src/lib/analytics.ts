/* Minimal, environment-safe analytics helpers (no direct DOM type names) */
export function collectAnalyticsIds(root?: {
  querySelectorAll: (sel: string) => unknown;
}): string[] {
  try {
    const ctx =
      root ||
      (typeof document !== 'undefined'
        ? (document as unknown as { querySelectorAll: (sel: string) => unknown })
        : undefined);
    if (!ctx) return [];
    const raw = ctx.querySelectorAll('[data-analytics]') as unknown;
    const results: string[] = [];
    const visit = (node: unknown) => {
      const maybe = node as { getAttribute?: (k: string) => string | null };
      const val = maybe.getAttribute ? maybe.getAttribute('data-analytics') : null;
      if (val) results.push(val);
    };
    if (Array.isArray(raw)) raw.forEach(visit);
    else if (raw && typeof (raw as { forEach?: unknown }).forEach === 'function') {
      (raw as { forEach: (cb: (n: unknown) => void) => void }).forEach(visit);
    }
    return Array.from(new Set(results)).sort();
  } catch {
    return [];
  }
}

export function getDevRole(): string | undefined {
  if (import.meta.env.VITE_DEV_AUTH !== '1') return undefined;
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ls = (globalThis as any).localStorage as { getItem: (k: string) => string | null };
      return ls?.getItem('devRole') || undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
