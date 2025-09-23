import { useEffect, useState } from 'react';

interface TemplateSummary {
  id: string;
  name: string;
  type: string;
  latestVersion: number;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const g = globalThis as unknown as { listTemplates?: () => Promise<TemplateSummary[]> };
        const resp = g.listTemplates ? await g.listTemplates() : [];
        if (!cancelled) setTemplates(resp || []);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, loading, error };
}
