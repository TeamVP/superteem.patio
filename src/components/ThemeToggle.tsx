import React, { useEffect, useState } from 'react';

function getSystemPref(): 'dark' | 'light' {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadStored(): 'dark' | 'light' | null {
  try {
    const v = globalThis.localStorage?.getItem('theme');
    if (v === 'dark' || v === 'light') return v;
  } catch {
    // ignore
  }
  return null;
}

function applyTheme(theme: 'dark' | 'light') {
  const root = globalThis.document?.documentElement;
  if (!root) return;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => loadStored() || getSystemPref());
  useEffect(() => {
    applyTheme(theme);
    try {
      globalThis.localStorage?.setItem('theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const listener = () => {
      if (!loadStored()) {
        const sys = getSystemPref();
        setTheme(sys);
      }
    };
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-xs px-2 py-1 rounded border bg-white/70 dark:bg-gray-800 dark:text-gray-200 backdrop-blur hover:bg-white dark:hover:bg-gray-700 transition"
      title="Toggle theme"
    >
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};
