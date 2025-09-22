import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useResponseDraft, useSaveResponseDraft, useSubmitResponse } from '@/hooks/useBackend';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Question, Template } from '@/types/template';
import { TemplateRenderer as RuntimeTemplateRenderer } from '@/features/responses/renderer/TemplateRenderer';

type MinimalTemplate = Template;

interface Props {
  templateId: Id<'templates'>;
}

function useTemplate(templateId: Id<'templates'>) {
  return useQuery(api.templates.listTemplateVersions, { templateId });
}

export const RespondentFormPage: React.FC<Props> = ({ templateId }) => {
  const versions = useTemplate(templateId);
  const draft = useResponseDraft(templateId);
  const saveDraft = useSaveResponseDraft();
  const submit = useSubmitResponse();
  const [answers, setAnswers] = useState<Record<string, unknown>>({}); // client-side answers (no leading $)
  const [payload, setPayload] = useState<unknown>(null);
  const [status, setStatus] = useState<
    'idle' | 'saving' | 'saved' | 'submitting' | 'submitted' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Use latest version body as template reference (simple assumption)
  const templateVersion = versions && versions[0];
  // Build Template object directly from version body. Body is expected to be Question[] already.
  type RawTemplateBody = Question[] | { questions?: unknown } | unknown;
  const template: MinimalTemplate | null = useMemo(() => {
    if (!templateVersion) return null;
    let body: Question[] = [];
    const raw: RawTemplateBody = templateVersion.body as RawTemplateBody;
    if (Array.isArray(raw)) {
      body = raw as Question[];
    } else if (raw && typeof raw === 'object' && 'questions' in raw) {
      const q = (raw as { questions?: unknown }).questions;
      if (Array.isArray(q)) body = q as Question[];
    }

    // Normalize legacy seed template question shapes (text/number/multipleChoice)
    type LegacyAtomicType = 'text' | 'number' | 'multipleChoice';
    type LegacyQuestion = Omit<Question, 'type'> & { type: Question['type'] | LegacyAtomicType };
    const normalize = (qs: (Question | LegacyQuestion)[]): Question[] =>
      qs.map((q) => {
        let mappedType: Question['type'];
        switch (q.type) {
          case 'text':
            mappedType = 'StringQuestion';
            break;
          case 'number':
            mappedType = 'IntegerQuestion';
            break;
          case 'multipleChoice':
            mappedType = 'MultipleChoiceQuestion';
            break;
          default:
            mappedType = q.type as Question['type'];
        }
        const base = { ...q, type: mappedType } as Question & {
          questions?: Question[];
          question?: Question;
        };
        if (!base.id) {
          base.id =
            (base as { variable?: string }).variable ||
            base.label ||
            Math.random().toString(36).slice(2);
        }
        if (
          !base.variable &&
          (mappedType === 'StringQuestion' ||
            mappedType === 'IntegerQuestion' ||
            mappedType === 'MultipleChoiceQuestion')
        ) {
          const slug = String(base.id)
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase();
          base.variable = `$${slug}`;
        }
        if (mappedType === 'CompositeQuestion' && Array.isArray(base.questions)) {
          base.questions = normalize(base.questions);
        }
        if (mappedType === 'ListQuestion' && base.question) {
          base.question = normalize([base.question])[0];
        }
        return base as Question;
      });
    body = normalize(body);
    const maybeTitle = (templateVersion as Record<string, unknown>).title;
    return {
      id: String(templateId),
      type: 'survey',
      version: String(templateVersion.version),
      title: typeof maybeTitle === 'string' ? maybeTitle : undefined,
      description: undefined,
      body,
      createdAt: undefined,
      createdBy: undefined,
    };
  }, [templateVersion, templateId]);

  // Transform server answers (with leading $) to client form (without $)
  const fromServerAnswers = useCallback(
    (server: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(server || {})) {
        if (k.startsWith('$')) out[k.slice(1)] = server[k];
        else out[k] = server[k];
      }
      return out;
    },
    []
  );
  const toServerAnswers = useCallback(
    (client: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(client || {})) {
        if (!k.startsWith('$')) out[`$${k}`] = client[k];
        else out[k] = client[k];
      }
      return out;
    },
    []
  );

  // Initialize from draft once
  useEffect(() => {
    if (draft && draft.answers && Object.keys(answers).length === 0) {
      setAnswers(fromServerAnswers(draft.answers as Record<string, unknown>));
    }
  }, [draft, answers, fromServerAnswers]);

  // Debounced autosave
  useEffect(() => {
    if (!templateVersion) return;
    if (status === 'submitting' || status === 'submitted') return;
    const timeout = globalThis.setTimeout(async () => {
      try {
        if (Object.keys(answers).length === 0) return;
        setStatus('saving');
        await saveDraft({ templateId, answers: toServerAnswers(answers), payload: payload || {} });
        setStatus('saved');
      } catch (e) {
        setStatus('error');
        setErrorMsg('Failed to save draft');
      }
    }, 800);
    return () => globalThis.clearTimeout(timeout);
  }, [answers, payload, templateId, templateVersion, saveDraft, status, toServerAnswers]);
  const handleSubmit = useCallback(async () => {
    if (!templateVersion) return;
    try {
      setStatus('submitting');
      await submit({ templateId, answers: toServerAnswers(answers), payload: payload || {} });
      setStatus('submitted');
    } catch (e) {
      setStatus('error');
      setErrorMsg('Submission failed');
    }
  }, [templateVersion, submit, templateId, answers, payload, toServerAnswers]);

  if (versions === undefined) return <div className="p-6 text-sm text-gray-500">Loading...</div>;
  if (!template) return <div className="p-6 text-sm text-gray-500">Template not found.</div>;
  if (status === 'submitted')
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">Thanks for your submission</h1>
        <a href="/respondent" className="text-blue-600 underline text-sm">
          Back to list
        </a>
      </div>
    );

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold mb-2">{template.title ?? 'Survey'}</h1>
      <RuntimeTemplateRenderer
        template={template}
        initialAnswers={answers}
        onChange={(a, p) => {
          setAnswers(a);
          setPayload(p);
        }}
        onSubmit={(a, p) => {
          setAnswers(a);
          setPayload(p);
          handleSubmit();
        }}
        submitLabel={status === 'submitting' ? 'Submitting…' : 'Submit'}
        showDebug={false}
      />
      {status === 'saving' && <span className="text-xs text-gray-500">Saving draft…</span>}
      {status === 'saved' && <span className="text-xs text-gray-500">Draft saved</span>}
      {status === 'error' && <span className="text-xs text-red-600">{errorMsg}</span>}
    </div>
  );
};
