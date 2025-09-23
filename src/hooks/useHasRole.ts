// RQ-009: Frontend gating hook
// For now, always returns true in dev; will integrate real auth provider roles later.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useHasRole(_roles: string | string[]): boolean {
  return true;
}
