import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSlugAvailability } from '@/hooks/useBackend';
import { useToast } from '@/components/ToastProvider';

export const NewTemplatePage = () => {
  const create = useMutation(api.templates.createTemplate);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'survey' | 'checklist'>('survey');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();
  const availability = useSlugAvailability(slug);
  const slugTaken = availability.available === false;
  useEffect(() => {
    if (slug && !slugTaken) setError(null);
    if (slugTaken) setError('Slug is already taken');
  }, [slug, slugTaken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Title required');
    if (!slug.trim()) return setError('Slug required');
    if (!/^[-a-z0-9]+$/.test(slug))
      return setError('Slug must be lowercase letters, numbers, dashes');
    try {
      setSaving(true);
      if (slugTaken) return;
      await create({
        title: title.trim(),
        slug: slug.trim(),
        type,
        body: { questions: [] },
      });
      push('Template created', 'success');
      if (globalThis.window?.location) {
        globalThis.window.location.href = `/templates/${slug.trim()}`;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function deriveSlug(v: string) {
    const s = v
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    setSlug(s);
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">New Template</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 bg-white dark:bg-gray-900 p-4 border dark:border-gray-700 rounded shadow-sm"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full border dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) deriveSlug(e.target.value);
            }}
            placeholder="Interdisciplinary Care Survey"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium flex items-center justify-between">
            <span>Slug</span>
            <button
              type="button"
              className="text-xs underline hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => deriveSlug(title)}
            >
              Derive
            </button>
          </label>
          <input
            className="w-full border dark:border-gray-700 rounded px-2 py-1 text-sm font-mono bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="interdisciplinary-care-survey"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Lowercase, numbers and dashes only.{' '}
            {slug && availability.available === true && !slugTaken && (
              <span className="text-green-600">Available</span>
            )}
            {slugTaken && <span className="text-red-600">Not available</span>}
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Type</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as 'survey' | 'checklist')}
          >
            <option value="survey">Survey</option>
            <option value="checklist">Checklist</option>
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || slugTaken}
            className="px-4 py-1 rounded bg-blue-600 disabled:opacity-60 text-white text-sm hover:bg-blue-700"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
          <a
            href="/templates"
            className="px-4 py-1 rounded border dark:border-gray-700 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};
