import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { ThemeToggle } from './ThemeToggle';

export const TopBar: React.FC = () => {
  const { isSignedIn } = useUser();
  const path = globalThis.location?.pathname || '/';
  const brandIsLink = path !== '/';
  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b bg-white/80 dark:bg-gray-900/80 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {brandIsLink ? (
            <a
              href="/"
              className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400 hover:underline"
            >
              Superteem
            </a>
          ) : (
            <span className="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-100">
              Superteem
            </span>
          )}
        </div>
        <nav className="flex-1 flex items-center justify-center gap-2">
          <a
            href="/templates"
            className="text-xs px-3 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Templates
          </a>
          {isSignedIn && (
            <a
              href="/profile"
              className="text-xs px-3 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Profile
            </a>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <a
              href="/sign-in"
              className="text-xs px-3 py-1 rounded border bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sign In
            </a>
          ) : (
            <ThemeToggle />
          )}
        </div>
      </div>
    </header>
  );
};
