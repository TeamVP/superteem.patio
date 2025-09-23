import React, { useState, useEffect } from 'react';
import type { Question } from '../../../types/template';
import { migrateExpression } from '../../../lib/expression/parser';

interface QuestionEditorProps {
  question: Question;
  onChange: (q: Question) => void;
  onEnableIfWarning?: (w: string | null) => void;
}

export function QuestionEditor({ question, onChange, onEnableIfWarning }: QuestionEditorProps) {
  const [local, setLocal] = useState<Question>(question);
  const [enableIfInput, setEnableIfInput] = useState<string>(question.enableIf || '');

  useEffect(() => {
    setLocal(question);
    setEnableIfInput(question.enableIf || '');
  }, [question]);

  useEffect(() => {
    if (!enableIfInput) {
      onEnableIfWarning?.(null);
      return;
    }
    const res = migrateExpression(enableIfInput);
    if (!res.ok) {
      onEnableIfWarning?.(res.reason + (res.detail ? `: ${res.detail}` : ''));
    } else if (res.warnings && res.warnings.length) {
      onEnableIfWarning?.(res.warnings.join(', '));
    } else {
      onEnableIfWarning?.(null);
    }
  }, [enableIfInput, onEnableIfWarning]);

  function commit(partial: Partial<Question>) {
    const next = { ...local, ...partial } as Question;
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="space-y-2 border-t pt-2">
      <h4 className="text-sm font-medium">Question</h4>
      <label className="flex flex-col gap-1 text-xs">
        <span>Label</span>
        <input
          value={local.label || ''}
          onChange={(e) => commit({ label: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span>Variable</span>
        <input
          value={local.variable || ''}
          onChange={(e) => commit({ variable: e.target.value || null })}
          placeholder="$example_var"
          className="border rounded px-2 py-1 text-sm font-mono"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span>Enable If (expression)</span>
        <input
          value={enableIfInput}
          onChange={(e) => {
            setEnableIfInput(e.target.value);
            commit({ enableIf: e.target.value || null });
          }}
          placeholder="$foo && $foo[0] === 1"
          className="border rounded px-2 py-1 text-sm font-mono"
        />
      </label>
    </div>
  );
}

export default QuestionEditor;
