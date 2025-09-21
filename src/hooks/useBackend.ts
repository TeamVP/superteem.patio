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
