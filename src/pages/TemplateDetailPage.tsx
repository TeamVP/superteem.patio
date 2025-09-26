import React, { useState } from 'react';
import { useTemplateBySlug, usePublishTemplateVersion } from '@/hooks/useBackend';
import { useToast } from '@/components/ToastProvider';

interface Props {
  slug: string;
}

export const TemplateDetailPage: React.FC<Props> = ({ slug }) => {
  const tmpl = useTemplateBySlug(slug);
  const publish = usePublishTemplateVersion();
  const { push } = useToast();
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [busy, setBusy] = useState(false);
  if (tmpl === undefined) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!tmpl)
    return <div className="p-6 text-sm text-muted-foreground">Not found or not published.</div>;
  type RawQuestion = { id?: string; label?: string; type?: string };
  const body: unknown = tmpl.body;
  let questions: RawQuestion[] = [];
  if (body && typeof body === 'object' && 'questions' in (body as Record<string, unknown>)) {
    const q = (body as { questions?: unknown }).questions;
    if (Array.isArray(q)) questions = q as RawQuestion[];
  } else if (Array.isArray(body)) {
    questions = body as RawQuestion[];
  }
  const isPublished = tmpl.status === 'published';
  const beginEdit = () => {
    setDraftTitle(tmpl.title);
    setDraftBody(JSON.stringify(tmpl.body, null, 2));
    setEditing(true);
  };
  function onBeginEdit() {
    beginEdit();
    push('Draft mode enabled', 'success');
  }
  async function onPublish() {
    try {
      setBusy(true);
      if (!tmpl) return;
      let parsed: unknown = tmpl.body;
      try {
        parsed = JSON.parse(draftBody);
      } catch {
        // if invalid JSON, keep previous body
      }
      await publish({
        templateId: tmpl._id,
        body: parsed,
        title: draftTitle || tmpl.title,
        type: tmpl.type,
      });
      push('Saved new version', 'success');
      setEditing(false);
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
        <a href="/templates" className="text-sm text-primary underline">
          Back
        </a>
      </div>
      <div className="text-xs text-muted-foreground space-x-2">
        <span>Slug: {tmpl.slug}</span>
        <span>Version: v{tmpl.version}</span>
        <span>Status: {tmpl.status}</span>
        {isPublished && !editing && (
          <button
            type="button"
            disabled={busy}
            onClick={onBeginEdit}
            className="ml-2 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start Edit'}
          </button>
        )}
        {editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="ml-2 text-muted-foreground underline"
          >
            Cancel
          </button>
        )}
      </div>
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onPublish();
          }}
          className="space-y-3 border rounded p-4 bg-card text-card-foreground"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">Title</label>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full border border-input rounded px-2 py-1 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Body JSON</label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              className="w-full border border-input rounded px-2 py-1 text-xs font-mono h-60 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save new version'}
            </button>
          </div>
        </form>
      )}
      <div>
        <h2 className="font-medium mb-2">Questions ({questions.length})</h2>
        {questions.length === 0 && (
          <div className="text-sm text-muted-foreground">No questions parsed.</div>
        )}
        <ol className="list-decimal list-inside space-y-1">
          {questions.map((q: RawQuestion, i: number) => (
            <li key={q.id || i} className="text-sm">
              <span className="font-medium">{q.label || q.id || `Q${i + 1}`}</span>{' '}
              <span className="text-muted-foreground">({q.type || 'unknown'})</span>
            </li>
          ))}
        </ol>
      </div>
      <button
        type="button"
        onClick={() => setShowRaw((s) => !s)}
        className="text-xs px-2 py-1 border rounded-md hover:bg-muted bg-background"
      >
        {showRaw ? 'Hide Raw JSON' : 'Show Raw JSON'}
      </button>
      {showRaw && (
        <pre className="text-xs bg-popover text-popover-foreground p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(tmpl.body, null, 2)}
        </pre>
      )}
    </div>
  );
};
