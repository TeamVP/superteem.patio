import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useHomeData } from '@/hooks/useHomeData';
import { usePublishedTemplatesPublic } from '@/hooks/useBackend';
import { storePostAuthRedirect } from '@/auth/postAuthRedirect';

function useSafeSignedIn(): boolean {
  try {
    return !!useUser().isSignedIn;
  } catch {
    return false;
  }
}

export default function Home() {
  const isSignedIn = useSafeSignedIn();
  const { templates: respondentTemplates, drafts, recent } = useHomeData();
  const publishedTemplates = usePublishedTemplatesPublic();
  const loading =
    respondentTemplates === undefined ||
    drafts === undefined ||
    recent === undefined ||
    publishedTemplates === undefined;
  const published = publishedTemplates || [];
  const personalized = respondentTemplates || [];
  // Merge while avoiding duplicates (prefer personalized order first, then published)
  const seen = new Set<string>();
  const templates = [...personalized, ...published].filter((t) => {
    if (seen.has(String(t._id))) return false;
    seen.add(String(t._id));
    return true;
  });

  if (!isSignedIn) {
    return <HomePublic templates={templates} loading={loading} />;
  }
  return (
    <HomeDashboard
      templates={templates || []}
      drafts={drafts || []}
      recent={recent || []}
      loading={loading}
    />
  );
}

interface HomePublicProps {
  templates: Array<{ _id: string; title: string }> | undefined;
  loading: boolean;
}
function HomePublic({ templates, loading }: HomePublicProps) {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Improve Care Quality with Structured Surveys
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-sm leading-relaxed">
          Capture patient experience, readiness checks, interdisciplinary observations, and
          operational compliance data in one secure workflow platform.
        </p>
        <div className="flex justify-center gap-4">
          <AuthButtons />
        </div>
      </header>
      <section>
        <h2 className="text-lg font-semibold mb-3">Available Surveys</h2>
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {!loading && (!templates || templates.length === 0) && (
          <div className="text-sm text-gray-500">No surveys are published yet.</div>
        )}
        <ul className="grid gap-4 md:grid-cols-2">
          {(templates || []).slice(0, 5).map((t) => (
            <li
              key={t._id}
              className="border rounded p-4 bg-white dark:bg-gray-800 shadow-sm flex flex-col gap-2"
            >
              <div className="font-medium text-sm">{t.title}</div>
              <a
                href={`/respondent/${t._id}`}
                data-analytics="start-survey"
                className="px-3 py-1 rounded bg-blue-600 text-white text-xs inline-block text-center hover:bg-blue-700"
              >
                Start
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface HomeDashboardProps {
  templates: Array<{ _id: string; title: string }>;
  drafts: Array<{ _id: string; templateId: string; updatedAt: number; templateTitle?: string }>;
  recent: Array<{ _id: string; templateId: string; submittedAt: number; templateTitle?: string }>;
  loading: boolean;
}
function HomeDashboard({ templates, drafts, recent, loading }: HomeDashboardProps) {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Surveys</h1>
          <p className="text-xs text-gray-500 mt-1">Manage drafts and begin new submissions.</p>
        </div>
      </header>
      <div className="grid gap-8 md:grid-cols-3">
        <SectionCard
          title="Available Surveys"
          loading={loading}
          empty={templates.length === 0}
          emptyText="No published surveys."
        >
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate" title={t.title}>
                  {t.title}
                </span>
                <a
                  href={`/respondent/${t._id}`}
                  className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                  data-analytics="start-survey"
                >
                  Start
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard
          title="My Drafts"
          loading={loading}
          empty={drafts.length === 0}
          emptyText="You have no in-progress drafts."
        >
          <ul className="space-y-2">
            {drafts.slice(0, 10).map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate" title={d.templateTitle}>
                  {d.templateTitle || 'Untitled'}
                </span>
                <a
                  href={`/respondent/${d.templateId}`}
                  className="px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs"
                  data-analytics="resume-draft"
                >
                  Resume
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard
          title="Recently Submitted"
          loading={loading}
          empty={recent.length === 0}
          emptyText="No submissions yet."
        >
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate" title={r.templateTitle}>
                  {r.templateTitle || 'Untitled'}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(r.submittedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}
function SectionCard({ title, loading, empty, emptyText, children }: SectionCardProps) {
  return (
    <div
      className="border rounded shadow-sm bg-white dark:bg-gray-800 p-4 flex flex-col"
      role="region"
      aria-label={title}
    >
      <h2 className="font-medium text-sm mb-3 tracking-wide uppercase text-gray-600 dark:text-gray-400">
        {title}
      </h2>
      {loading && <div className="text-xs text-gray-500">Loading…</div>}
      {!loading && empty && <div className="text-xs text-gray-500">{emptyText}</div>}
      {!loading && !empty && <div className="flex-1 overflow-y-auto">{children}</div>}
    </div>
  );
}

function AuthButtons() {
  return (
    <div className="flex gap-3">
      <a
        href="/sign-up"
        className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        data-analytics="home-hero-cta"
        onClick={() => storePostAuthRedirect()}
      >
        Sign Up
      </a>
      <a
        href="/sign-in"
        className="px-4 py-2 rounded border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950"
        onClick={() => storePostAuthRedirect()}
      >
        Log In
      </a>
    </div>
  );
}

// ProfileArea removed; TopBar now owns account & sign out controls.
