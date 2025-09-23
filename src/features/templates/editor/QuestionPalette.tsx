import React from 'react';
import type { Question } from '../../../types/template';

interface QuestionPaletteProps {
  onAdd: (q: Question) => void;
}

const templates: { label: string; factory: () => Question }[] = [
  {
    label: 'String',
    factory: () => ({ type: 'StringQuestion', id: '', label: 'New Text', required: false }),
  },
  {
    label: 'Integer',
    factory: () => ({ type: 'IntegerQuestion', id: '', label: 'New Number', required: false }),
  },
  {
    label: 'Multiple Choice',
    factory: () => ({
      type: 'MultipleChoiceQuestion',
      id: '',
      label: 'New MC',
      options: ['A', 'B'],
    }),
  },
  {
    label: 'User',
    factory: () => ({ type: 'UserQuestion', id: '', label: 'User', required: false }),
  },
  {
    label: 'Composite',
    factory: () => ({ type: 'CompositeQuestion', id: '', label: 'Group', questions: [] }),
  },
];

export function QuestionPalette({ onAdd }: QuestionPaletteProps) {
  return (
    <div className="space-y-2">
      {templates.map((t) => (
        <button
          key={t.label}
          type="button"
          className="w-full text-left border rounded px-2 py-1 text-sm hover:bg-gray-50"
          onClick={() => onAdd(t.factory())}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default QuestionPalette;
