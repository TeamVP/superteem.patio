import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useHomeData() {
  const templates = useQuery(api.templates.listForRespondent, {});
  const drafts = useQuery(api.responses.listDraftsForUser, {});
  const recent = useQuery(api.responses.listRecentSubmissionsForUser, {});
  return { templates, drafts, recent };
}
