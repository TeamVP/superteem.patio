import React, { useState } from 'react';
import type { Template, Question } from '../../../types/template';
import { validateTemplate, validationErrors } from '../../../lib/validation';
import { QuestionPalette } from './QuestionPalette';
import { QuestionEditor } from './QuestionEditor';
import { diffTemplates, TemplateDiffSummary } from '../json/diff';

interface TemplateEditorProps {
  initial?: Template;
  onChange?: (tpl: Template) => void;
}

type Tab = 'editor' | 'json';

export function TemplateEditor({ initial, onChange }: TemplateEditorProps) {
  const [active, setActive] = useState<Tab>('editor');
  const [template, setTemplate] = useState<Template>(
    initial || {
      id: 'temp-local',
      type: 'survey',
      title: 'Untitled Template',
      version: '1.0.0',
      body: [],
    }
  );
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enableIfWarning, setEnableIfWarning] = useState<string | null>(null);
  const [pendingDiff, setPendingDiff] = useState<TemplateDiffSummary | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);

  function ensureIds(qs: Question[]): Question[] {
    return qs.map((q, idx) => {
      if (q.id) return q;
      const id = `q_${idx}_${Math.random().toString(36).slice(2, 8)}`;
      return { ...q, id } as Question;
    });
  }

  function updateTemplate(partial: Partial<Template>) {
    const next: Template = { ...template, ...partial };
    setTemplate(next);
    onChange?.(next);
  }

  function handleJsonApply() {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object') {
        if (!validateTemplate(parsed)) {
          setSchemaErrors(validationErrors());
          setJsonError('Schema validation failed');
          return;
        }
        const next = { ...parsed } as Template;
        if (Array.isArray((next as Template).body)) {
          next.body = ensureIds(next.body as Question[]);
        }
        // Compute diff and require confirm if changes exist
        const summary = diffTemplates(template, next);
        setPendingDiff(summary);
        setPendingTemplate(next);
        setJsonError(null);
        setSchemaErrors([]);
      }
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b pb-2">
        <button
          className={active === 'editor' ? 'font-semibold' : ''}
          onClick={() => setActive('editor')}
          type="button"
        >
          Editor
        </button>
        <button
          className={active === 'json' ? 'font-semibold' : ''}
          onClick={() => setActive('json')}
          type="button"
        >
          JSON
        </button>
      </div>
      {active === 'editor' && (
        <div className="grid gap-4 md:grid-cols-[250px_1fr_300px]">
          <div className="border rounded p-2 space-y-2">
            <h3 className="font-medium">Palette</h3>
            <QuestionPalette
              onAdd={(q) => {
                const rand = Math.random().toString(36).slice(2, 6);
                const id = q.id || `q_${template.body.length}_${rand}`;
                const nextBody = [...template.body, { ...q, id } as Question];
                updateTemplate({ body: nextBody });
              }}
            />
          </div>
          <div className="border rounded p-2 space-y-2">
            <h3 className="font-medium">Questions</h3>
            {template.body.length === 0 && (
              <p className="text-sm text-gray-500">No questions yet.</p>
            )}
            <ul className="space-y-1">
              {template.body.map((q) => (
                <li
                  key={q.id}
                  className={`text-sm flex items-center gap-2 cursor-pointer rounded px-1 ${selectedId === q.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedId(q.id || null)}
                >
                  <span className="font-mono text-gray-500">{q.id}</span>
                  <span className="flex-1 truncate">{q.label || '(no label)'}</span>
                  <span className="text-xs text-gray-400">{q.type}</span>
                  {selectedId === q.id && (
                    <span className="flex gap-1 ml-2">
                      <button
                        type="button"
                        className="border rounded px-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = template.body.findIndex((x) => x.id === q.id);
                          if (idx > 0) {
                            const next = [...template.body];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            updateTemplate({ body: next });
                          }
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="border rounded px-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = template.body.findIndex((x) => x.id === q.id);
                          if (idx < template.body.length - 1) {
                            const next = [...template.body];
                            [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            updateTemplate({ body: next });
                          }
                        }}
                      >
                        ↓
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="border rounded p-2 space-y-2">
            <h3 className="font-medium">Details</h3>
            <label className="flex flex-col gap-1 text-sm">
              <span>Name</span>
              <input
                value={template.title || ''}
                onChange={(e) => updateTemplate({ title: e.target.value })}
                className="border rounded px-2 py-1"
              />
            </label>
            {selectedId && (
              <QuestionEditor
                question={template.body.find((q) => q.id === selectedId)!}
                onChange={(updated) => {
                  const nextBody = template.body.map((q) => (q.id === updated.id ? updated : q));
                  updateTemplate({ body: nextBody });
                }}
                onEnableIfWarning={(w) => setEnableIfWarning(w)}
              />
            )}
            {enableIfWarning && <p className="text-xs text-amber-600">{enableIfWarning}</p>}
          </div>
        </div>
      )}
      {active === 'json' && (
        <div className="space-y-2">
          <textarea
            className="w-full h-64 border rounded font-mono text-sm p-2"
            placeholder="Paste template JSON..."
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
          <div className="flex gap-2 items-start">
            {!pendingDiff && (
              <button type="button" className="border rounded px-3 py-1" onClick={handleJsonApply}>
                Validate & Diff
              </button>
            )}
            {pendingDiff && pendingTemplate && (
              <div className="space-y-2 flex-1">
                <div className="text-xs font-mono border rounded p-2 bg-gray-50">
                  <div>Added: {pendingDiff.addedQuestions}</div>
                  <div>Removed: {pendingDiff.removedQuestions}</div>
                  <div>Changed: {pendingDiff.changedQuestions}</div>
                  {pendingDiff.metadataChanges.length > 0 && (
                    <div>Meta: {pendingDiff.metadataChanges.join(', ')}</div>
                  )}
                  {pendingDiff.orphanedVariables.length > 0 && (
                    <div className="text-red-600">
                      Orphans: {pendingDiff.orphanedVariables.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingDiff.orphanedVariables.length > 0}
                    className="border rounded px-3 py-1 disabled:opacity-50"
                    onClick={() => {
                      updateTemplate(pendingTemplate);
                      setPendingDiff(null);
                      setPendingTemplate(null);
                      setRawJson('');
                    }}
                  >
                    Confirm Apply
                  </button>
                  <button
                    type="button"
                    className="border rounded px-3 py-1"
                    onClick={() => {
                      setPendingDiff(null);
                      setPendingTemplate(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {jsonError && <span className="text-red-600 text-sm">{jsonError}</span>}
          </div>
          {schemaErrors.length > 0 && (
            <ul className="text-xs text-red-700 list-disc pl-4 space-y-0.5">
              {schemaErrors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default TemplateEditor;
