import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useState, useCallback, useEffect, useRef } from 'react';

// Helper no-op to satisfy typing when ID absent (Convex accepts undefined function ref already,
// but strict typing path caused friction; wrap cast in a constant to isolate eslint disable).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DISABLED: any = undefined;

export function useResponseList(templateId: Id<'templates'> | null, status?: string) {
  const [cursor, setCursor] = useState<number | null>(null);
  const [responses, setResponses] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [internalStatus, setInternalStatus] = useState<string | undefined>(status);
  const statusRef = useRef(status);

  // Reset when template or status changes
  useEffect(() => {
    if (statusRef.current !== status || internalStatus !== status || templateId) {
      setCursor(null);
      setResponses([]);
      setInternalStatus(status);
      statusRef.current = status;
    }
  }, [templateId, status, internalStatus]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = templateId ? (api.reviews as any).listResponsesPaginated : DISABLED;
  const args = templateId
    ? { templateId, status: internalStatus, cursor: cursor ?? undefined, limit: 25 }
    : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = useQuery(fn, args as any);
  const isLoading = !!templateId && page === undefined && responses.length === 0;
  const isLoadingMore = !!templateId && page === undefined && responses.length > 0;

  useEffect(() => {
    if (!page) return;
    if (cursor === null) {
      setResponses(page.items);
    } else {
      // append ensuring no duplicates
      setResponses((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const it of page.items) if (!existing.has(it.id)) merged.push(it);
        return merged;
      });
    }
  }, [page, cursor]);

  const loadMore = useCallback(() => {
    if (page && page.hasMore && page.nextCursor) {
      setCursor(page.nextCursor);
    }
  }, [page]);

  const reset = useCallback(() => {
    setCursor(null);
    setResponses([]);
  }, []);

  return {
    responses,
    isLoading,
    isLoadingMore,
    hasMore: !!page?.hasMore,
    loadMore,
    reset,
  };
}

export function useResponseDetail(responseId: Id<'responses'> | null) {
  const fn = responseId ? api.reviews.getResponseWithReviews : DISABLED;
  const args = responseId ? { responseId } : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = useQuery(fn, args as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { detail: (data as any) ?? null, isLoading: !!responseId && data === undefined };
}

export function useReviewActions() {
  const addNote = useMutation(api.reviews.addResponseReviewNote);
  const setStatus = useMutation(api.reviews.setResponseReviewStatus);
  return { addNote, setStatus };
}

export function useReviewState() {
  const [selectedResponse, setSelectedResponse] = useState<Id<'responses'> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('unreviewed');
  const select = useCallback((id: Id<'responses'>) => setSelectedResponse(id), []);
  return { selectedResponse, statusFilter, setStatusFilter, select };
}
