import React, { useEffect, useState } from 'react';
import { collectAnalyticsIds, getDevRole } from '@/lib/analytics';
import { useUser } from '@clerk/clerk-react';

export function AdminAnalyticsPage() {
  const { user } = useUser();
  let clerkAdmin = false;
  let devAdmin = false;
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((user.publicMetadata as any)?.role === 'admin') clerkAdmin = true;
    const email = user.primaryEmailAddress?.emailAddress || '';
    if (email.endsWith('@example.com')) clerkAdmin = true;
  }
  // Dev auth heuristic
  const devRole = getDevRole();
  if (devRole === 'admin') devAdmin = true;
  const isAdmin = clerkAdmin || devAdmin;
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(collectAnalyticsIds());
  }, []);
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 text-sm">
        <h1 className="text-xl font-semibold mb-4">Admin</h1>
        <p className="text-red-600">Access denied.</p>
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Analytics Instrumentation</h1>
        <p className="text-xs text-gray-500">Current collected data-analytics identifiers.</p>
      </header>
      <section className="space-y-2">
        {ids.length === 0 && (
          <div className="text-xs text-gray-500">No analytics markers found.</div>
        )}
        {ids.length > 0 && (
          <ul className="text-xs grid md:grid-cols-2 gap-2">
            {ids.map((id) => (
              <li key={id} className="border rounded px-2 py-1 bg-white dark:bg-gray-800">
                {id}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
