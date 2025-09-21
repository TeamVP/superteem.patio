import React, { useState, useEffect } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import {
  useResponseList,
  useResponseDetail,
  useReviewActions,
  useReviewState,
} from '@/hooks/useReviews';
import ResponseReviewList, { ResponseListItem } from '@/components/ResponseReviewList';
import ResponseReviewDetail, { ReviewNote } from '@/components/ResponseReviewDetail';
import ReviewStatusBadge, { ReviewStatus } from '@/components/ReviewStatusBadge';
import { useToast } from '@/components/ToastProvider';

interface Props {
  templateId: Id<'templates'> | string; // Accept string placeholder for now
}

const STATUS_OPTIONS = ['unreviewed', 'in_review', 'reviewed'] as const;

export function ReviewDashboard({ templateId }: Props) {
  const tid = templateId as Id<'templates'>; // internal cast for Convex
  const { statusFilter, setStatusFilter, selectedResponse, select } = useReviewState();
  const { responses, isLoading, isLoadingMore, hasMore, loadMore } = useResponseList(
    tid,
    statusFilter
  );
  const { detail } = useResponseDetail(selectedResponse);
  const { addNote, setStatus } = useReviewActions();
  const [optimisticNotes, setOptimisticNotes] = useState<ReviewNote[]>([]);
  const [localStatus, setLocalStatus] = useState<ReviewStatus>('unreviewed');
  const { push } = useToast();

  // Sync local status when underlying detail loads/changes
  useEffect(() => {
    if (!detail) return;
    const status = (detail.response.reviewStatus as ReviewStatus) || 'unreviewed';
    setLocalStatus(status);
  }, [detail]);

  async function handleAddNote(note: string, statusAfter?: ReviewStatus) {
    if (!selectedResponse) return;
    const optimistic: ReviewNote = {
      _id: `tmp_${Date.now()}`,
      createdAt: Date.now(),
      createdBy: 'local_user',
      note: note || undefined,
      statusAfter,
    };
    setOptimisticNotes((n) => [...n, optimistic]);
    try {
      await addNote({ responseId: selectedResponse, note: note || undefined, statusAfter });
      if (statusAfter) setLocalStatus(statusAfter as ReviewStatus);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      push(`Failed to add note: ${msg}`, 'error');
    } finally {
      setOptimisticNotes((n) => n.filter((x) => x !== optimistic));
    }
  }

  async function handleChangeStatus(s: ReviewStatus) {
    if (!selectedResponse) return;
    setLocalStatus(s); // optimistic update
    try {
      await setStatus({ responseId: selectedResponse, status: s });
    } catch (e: unknown) {
      // revert on failure
      if (detail?.response?.reviewStatus) {
        setLocalStatus((detail.response.reviewStatus as ReviewStatus) || 'unreviewed');
      }
      const msg = e instanceof Error ? e.message : String(e);
      push(`Failed to set status: ${msg}`, 'error');
    }
  }

  return (
    <div className="p-4 grid grid-cols-12 gap-4 h-full">
      <div className="col-span-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && (
          <>
            <ResponseReviewList
              responses={responses as ResponseListItem[]}
              onSelect={(id) => select(id as unknown as Id<'responses'>)}
            />
            {hasMore && (
              <button
                onClick={() => loadMore()}
                disabled={isLoadingMore}
                className="mt-2 w-full text-sm border rounded py-1 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
      <div className="col-span-8">
        {!selectedResponse && (
          <div className="text-sm text-gray-500">Select a response to review.</div>
        )}
        {selectedResponse && detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Response Detail</h2>
              <ReviewStatusBadge status={localStatus} />
            </div>
            <ResponseReviewDetail
              response={{
                _id: detail.response._id,
                templateId: detail.response.templateId,
                createdAt: detail.response.createdAt,
                reviewStatus: localStatus,
                lastReviewedAt: detail.response.lastReviewedAt,
                lastReviewedBy: detail.response.lastReviewedBy,
                reviewNoteCount: detail.response.reviewNoteCount || 0,
              }}
              notes={[...detail.reviews, ...optimisticNotes]}
              onAddNote={handleAddNote}
              onChangeStatus={handleChangeStatus}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewDashboard;
