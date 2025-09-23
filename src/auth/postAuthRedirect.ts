/* global sessionStorage */
const KEY = 'postAuthRedirectPath';

export function storePostAuthRedirect(path?: string) {
  try {
    const current =
      path ||
      (globalThis.location?.pathname || '/') +
        (globalThis.location?.search || '') +
        (globalThis.location?.hash || '');
    if (!current) return;
    if (['/', '/sign-in', '/sign-up'].includes(current)) return;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(KEY, current);
    }
  } catch {
    /* ignore */
  }
}

export function consumePostAuthRedirect(): string | null {
  try {
    const value = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
    if (value && typeof sessionStorage !== 'undefined') sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}

export function peekPostAuthRedirect(): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
  } catch {
    return null;
  }
}
