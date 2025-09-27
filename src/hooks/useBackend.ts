import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';

// Template hooks
// Using string references fallback while codegen excludes some modules
export function useCreateTemplate() {
  return useMutation(api.templates.createTemplate);
}
export function usePublishTemplateVersion() {
  return useMutation(api.templates.publishTemplateVersion);
}
export function useBeginEditTemplate() {
  return useMutation(api.templates.beginEdit);
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
      // ConvexError surfaces as an Error with a `data` payload
      if (e && typeof e === 'object') {
        const errAny = e as { data?: unknown } & Record<string, unknown>;
        const data = (errAny.data || null) as {
          code?: string;
          fieldErrors?: Record<string, string[]>;
        } | null;
        if (data?.code === 'INVALID_RESPONSE') {
          const normalized: SubmitResponseError = {
            code: data.code,
            fieldErrors: data.fieldErrors || {},
          };
          throw normalized;
        }
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

// Auth / user
export function useCurrentUser() {
  return useQuery(api.rbac.currentUser, {});
}

// Responses: submitted template ids for current user
export function useSubmittedTemplateIdsForUser() {
  return useQuery(api.responses.listSubmittedTemplateIdsForUser, {});
}

// App settings (with defensive fallback if function missing or errors)
export function useAppSettings(): { minTemplateCreationRole: string } | undefined {
  try {
    const data = useQuery(api.settings.getAppSettings, {});
    if (!data) return { minTemplateCreationRole: 'author' }; // default if undefined during load
    return data as { minTemplateCreationRole: string };
  } catch (e: unknown) {
    // If Convex reports function missing, return default to avoid blocking UI
    const msg = (e as Error | { message?: string } | null)?.message || '';
    if (/Could not find public function/i.test(msg) || /Not registered/i.test(msg)) {
      return { minTemplateCreationRole: 'author' };
    }
    return { minTemplateCreationRole: 'author' };
  }
}
