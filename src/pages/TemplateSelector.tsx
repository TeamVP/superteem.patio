import React, { useState } from 'react';
import { useTemplates } from '@/hooks/useTemplates';

interface Props {
  children: (templateId: string) => React.ReactNode;
}

export function TemplateSelector({ children }: Props) {
  const { templates, loading, error } = useTemplates();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading templates...</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load templates</div>;
  if (!templates.length)
    return <div className="p-4 text-sm text-gray-500">No templates available.</div>;

  const active = selected || templates[0].id;

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex items-center gap-2 bg-gray-50">
        <label className="text-xs font-medium">Template</label>
        <select
          className="text-sm border rounded px-2 py-1"
          value={active}
          onChange={(e) => setSelected(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id as string}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-hidden">{children(active)}</div>
    </div>
  );
}

export default TemplateSelector;
