import React, { useState } from 'react';
import {
  useTemplateBySlug,
  useSaveTemplateDraft,
  usePublishTemplateVersion,
} from '@/hooks/useBackend';
import { useToast } from '@/components/ToastProvider';

interface Props {
  slug: string;
}

export const TemplateDetailPage: React.FC<Props> = ({ slug }) => {
  const tmpl = useTemplateBySlug(slug);
  const saveDraft = useSaveTemplateDraft();
  const publish = usePublishTemplateVersion();
  const { push } = useToast();
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (tmpl === undefined) return <div className="p-6 text-sm">Loading…</div>;
  if (!tmpl) return <div className="p-6 text-sm text-gray-500">Not found or not published.</div>;
  type RawQuestion = { id?: string; label?: string; type?: string };
  const body: unknown = tmpl.body;
  let questions: RawQuestion[] = [];
  if (body && typeof body === 'object' && 'questions' in (body as Record<string, unknown>)) {
    const q = (body as { questions?: unknown }).questions;
    if (Array.isArray(q)) questions = q as RawQuestion[];
  } else if (Array.isArray(body)) {
    questions = body as RawQuestion[];
  }
  const isDraft = tmpl.status === 'draft';
  const beginEdit = () => {
    setDraftTitle(tmpl.title);
    setDraftBody(JSON.stringify(tmpl.body, null, 2));
    setEditing(true);
  };
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      if (!tmpl) return;
      let parsed: unknown = tmpl.body;
      try {
        parsed = JSON.parse(draftBody);
      } catch {
        // keep old body if invalid
      }
      await saveDraft({ templateId: tmpl._id, body: parsed, title: draftTitle });
      push('Draft saved', 'success');
      setEditing(false);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  }
  async function onPublish() {
    try {
      setBusy(true);
      if (!tmpl) return;
      await publish({ templateId: tmpl._id });
      push('Published', 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Publish failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{editing ? draftTitle : tmpl.title}</h1>
        <a href="/templates" className="text-sm text-blue-600 underline">
          Back
        </a>
      </div>
      <div className="text-xs text-gray-500 space-x-2">
        <span>Slug: {tmpl.slug}</span>
        <span>Version: v{tmpl.version}</span>
        <span>Status: {tmpl.status}</span>
        {isDraft && !editing && (
          <button type="button" onClick={beginEdit} className="ml-2 text-blue-600 underline">
            Edit Draft
          </button>
        )}
        {isDraft && editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="ml-2 text-gray-600 underline"
          >
            Cancel
          </button>
        )}
        {isDraft && !editing && (
          <button
            type="button"
            disabled={busy}
            onClick={onPublish}
            className="ml-2 text-xs px-2 py-1 rounded bg-green-600 text-white disabled:opacity-60"
          >
            Publish
          </button>
        )}
      </div>
      {isDraft && editing && (
        <form
          onSubmit={onSave}
          className="space-y-3 border rounded p-4 bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">Title</label>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full border dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Body JSON</label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              className="w-full border dark:border-gray-700 rounded px-2 py-1 text-xs font-mono h-60 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="px-3 py-1 text-sm rounded bg-green-600 text-white disabled:opacity-60"
            >
              {busy ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      )}
      <div>
        <h2 className="font-medium mb-2">Questions ({questions.length})</h2>
        {questions.length === 0 && (
          <div className="text-sm text-gray-500">No questions parsed.</div>
        )}
        <ol className="list-decimal list-inside space-y-1">
          {questions.map((q: RawQuestion, i: number) => (
            <li key={q.id || i} className="text-sm">
              <span className="font-medium">{q.label || q.id || `Q${i + 1}`}</span>{' '}
              <span className="text-gray-500">({q.type || 'unknown'})</span>
            </li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        onClick={() => setShowRaw((s) => !s)}
        className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        {showRaw ? 'Hide Raw JSON' : 'Show Raw JSON'}
      </button>
      {showRaw && (
        <pre className="text-xs bg-gray-900 text-green-200 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(tmpl.body, null, 2)}
        </pre>
      )}
    </div>
  );
};
