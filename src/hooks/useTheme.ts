import { useState, useEffect } from 'react';

function systemPref(): 'light' | 'dark' {
  try {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
function loadStored(): 'light' | 'dark' | null {
  try {
    const v = globalThis.localStorage?.getItem('theme');
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore
  }
  return null;
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadStored() || systemPref());

  // Apply theme side effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      globalThis.localStorage?.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // React to system changes if user has not explicitly chosen (no stored value)
  useEffect(() => {
    if (loadStored()) return; // user preference pinned
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const listener = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);

  // Sync across tabs
  useEffect(() => {
  const handler = (e: globalThis.StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    globalThis.addEventListener?.('storage', handler);
    return () => globalThis.removeEventListener?.('storage', handler);
  }, []);

  return { theme, setTheme };
}
