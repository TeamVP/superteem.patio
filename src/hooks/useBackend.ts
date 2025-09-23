import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';

// Template hooks
// Using string references fallback while codegen excludes some modules
export function useCreateTemplate() {
  return useMutation(api.templates.createTemplate);
}
export function useSaveTemplateDraft() {
  return useMutation(api.templates.saveTemplateDraft);
}
export function usePublishTemplateVersion() {
  return useMutation(api.templates.publishTemplateVersion);
}
export function useRevertTemplateVersion() {
  return useMutation(api.templates.revertTemplateVersion);
}
export function useListTemplateVersions(templateId: Id<'templates'> | undefined) {
  return useQuery(api.templates.listTemplateVersions, templateId ? { templateId } : 'skip');
}

// Response hooks
// TODO: Add responses hooks once Convex codegen includes responses module.
// Responses hooks
export function useSaveResponseDraft() {
  return useMutation(api.responses.saveResponseDraft);
}
export interface SubmitResponseError {
  code: string;
  fieldErrors?: Record<string, string[]>;
}
export function useSubmitResponse() {
  const mutate = useMutation(api.responses.submitResponse);
  return async (args: Parameters<typeof mutate>[0]) => {
    try {
      return await mutate(args);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === 'INVALID_RESPONSE'
      ) {
        throw e as SubmitResponseError;
      }
      throw e;
    }
  };
}
export function useListResponsesByTemplateVersion(
  templateId: Id<'templates'> | undefined,
  version?: number
) {
  return useQuery(
    api.responses.listResponsesByTemplateVersion,
    templateId ? { templateId, version } : 'skip'
  );
}

// Respondent-specific hooks
export function useRespondentTemplates() {
  return useQuery(api.templates.listForRespondent, {});
}
export function useResponseDraft(templateId: Id<'templates'> | undefined) {
  return useQuery(api.responses.getDraft, templateId ? { templateId } : 'skip');
}

// Published template by slug (includes body + latest version)
export function useTemplateBySlug(slug: string | undefined) {
  return useQuery(api.templates.getBySlug, slug ? { slug } : 'skip');
}

export function usePublishedTemplatesPublic() {
  return useQuery(api.templates.listPublishedGlobal, {});
}

export function useMyDraftTemplates() {
  return useQuery(api.templates.listMyDraftTemplates, {});
}

export function useSlugAvailability(slug: string | undefined) {
  const s = (slug || '').trim();
  const result = useQuery(api.templates.slugAvailable, s ? { slug: s } : 'skip');
  if (!s) return { available: undefined } as { available: boolean | undefined };
  return (result as { available: boolean }) || { available: undefined };
}
