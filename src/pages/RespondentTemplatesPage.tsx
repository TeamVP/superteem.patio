import React from 'react';
import { useRespondentTemplates, usePublishedTemplatesPublic } from '@/hooks/useBackend';

export const RespondentTemplatesPage: React.FC = () => {
  const respondentTemplates = useRespondentTemplates();
  const publishedTemplates = usePublishedTemplatesPublic();
  if (respondentTemplates === undefined || publishedTemplates === undefined) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading templates...</div>;
  }
  const templates = respondentTemplates.length > 0 ? respondentTemplates : publishedTemplates;
  const usingFallback = respondentTemplates.length === 0;
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Available Surveys</h1>
      {templates.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">No surveys available.</div>
      ) : (
        <ul className="divide-y border rounded bg-white dark:bg-gray-900 dark:border-gray-700 divide-gray-200 dark:divide-gray-800">
          {templates.map((t) => (
            <li
              key={t._id}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{t.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Slug: {t.slug}</div>
                {usingFallback && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Public Survey
                  </div>
                )}
              </div>
              <a
                href={`/respondent/${t._id}`}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                Start
              </a>
            </li>
          ))}
        </ul>
      )}
      {usingFallback && templates.length > 0 && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Showing all published surveys because you have no personalized assignments.
        </p>
      )}
    </div>
  );
};
