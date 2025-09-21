import React, { useState } from 'react';

interface ExportPanelProps {
  onDownload: (mode: 'raw' | 'aggregate', templateId: string) => Promise<string>;
}

export function ExportPanel({ onDownload }: ExportPanelProps) {
  const [templateId, setTemplateId] = useState('');
  const [mode, setMode] = useState<'raw' | 'aggregate'>('raw');
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const csv = await onDownload(mode, templateId);
      setContent(csv.slice(0, 800) + (csv.length > 800 ? '\n...truncated' : ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-4 text-sm space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block mb-1 font-medium" htmlFor="exp-template">
            Template ID
          </label>
          <input
            id="exp-template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="border px-2 py-1 w-full rounded"
            placeholder="convex template _id"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="exp-mode">
            Mode
          </label>
          <select
            id="exp-mode"
            className="border px-2 py-1 rounded"
            value={mode}
            onChange={(e) => setMode(e.target.value === 'aggregate' ? 'aggregate' : 'raw')}
          >
            <option value="raw">Raw</option>
            <option value="aggregate">Aggregate</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!templateId || loading}
          className="bg-blue-600 text-white px-3 py-1 rounded disabled:bg-gray-400"
        >
          {loading ? 'Loading…' : 'Download'}
        </button>
      </div>
      {content && (
        <pre className="bg-gray-900 text-gray-100 p-2 rounded overflow-auto max-h-64 text-xs">
          {content}
        </pre>
      )}
    </div>
  );
}
