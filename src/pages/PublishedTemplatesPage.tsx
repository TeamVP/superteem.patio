import React from 'react';
import { usePublishedTemplatesPublic, useMyDraftTemplates } from '@/hooks/useBackend';

export const PublishedTemplatesPage: React.FC = () => {
  const published = usePublishedTemplatesPublic();
  const drafts = useMyDraftTemplates();
  if (published === undefined || drafts === undefined)
    return <div className="p-6 text-sm">Loading…</div>;
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Available Surveys</h1>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Published surveys you can view/respond to. Drafts below are your in-progress survey
        definitions (not yet published).
      </p>
      {published.length === 0 ? (
        <div className="text-sm border rounded p-4 bg-white dark:bg-gray-900 dark:border-gray-700 space-y-2">
          <div className="text-gray-600 dark:text-gray-400">No published surveys yet.</div>
          <form method="post" action="#" onSubmit={(e) => e.preventDefault()} className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await globalThis.fetch?.('/api/seed-examples').catch(() => {});
                  globalThis.location.reload();
                } catch {
                  // ignore
                }
              }}
              className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Seed Example Surveys
            </button>
          </form>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Or create your own using the Create Template button below.
          </div>
        </div>
      ) : (
        <ul className="divide-y border rounded bg-white dark:bg-gray-900 dark:border-gray-700 divide-gray-200 dark:divide-gray-800">
          {published.map((t) => (
            <li
              key={t._id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{t.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Slug: {t.slug}</div>
              </div>
              <a
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                href={`/templates/${t.slug}`}
              >
                View
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="pt-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Drafts</h2>
          <a
            href="/templates/new"
            className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            Create Template
          </a>
        </div>
        {drafts.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 border rounded p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
            You have no drafts yet. Drafts are editable surveys you have not published.
          </div>
        ) : (
          <ul className="divide-y border rounded bg-white dark:bg-gray-900 dark:border-gray-700 divide-gray-200 dark:divide-gray-800">
            {drafts.map((d) => (
              <li
                key={d._id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{d.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Slug: {d.slug}</div>
                </div>
                <a
                  className="text-sm px-3 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  href={`/templates/${d.slug}`}
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
