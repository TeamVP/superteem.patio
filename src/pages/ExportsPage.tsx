import React from 'react';
import { ExportPanel } from '@/components/ExportPanel';
import Button from '@/components/Button';

async function fakeDownload(mode: 'raw' | 'aggregate', templateId: string): Promise<string> {
  // Placeholder: integrate Convex client here later
  return `mode,templateId\n${mode},${templateId}`;
}

export function ExportsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Exports</h1>
        <Button onClick={() => (globalThis.location.href = '/')}>Back Home</Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Download CSV (raw or aggregate) for submitted responses.
      </p>
      <ExportPanel onDownload={fakeDownload} />
    </div>
  );
}
