import React from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export const ProfilePage: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold">Profile</h1>
      {isSignedIn ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Signed in as{' '}
            <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/' })}
              className="text-xs px-3 py-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">You are not signed in.</div>
      )}
    </div>
  );
};

export default ProfilePage;
