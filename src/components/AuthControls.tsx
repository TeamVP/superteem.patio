import React from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

export const AuthControls: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  if (!isSignedIn) return null;
  return (
    <div className="flex items-center gap-2 text-xs bg-white/80 dark:bg-gray-800 px-2 py-1 rounded shadow">
      <span
        className="text-gray-600 dark:text-gray-300 max-w-[140px] truncate"
        title={user?.primaryEmailAddress?.emailAddress || user?.id}
      >
        {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User'}
      </span>
      <a
        href="/templates"
        className="px-2 py-0.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Templates
      </a>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          globalThis.location.href = '/';
        }}
        className="px-2 py-0.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Logout
      </button>
    </div>
  );
};
