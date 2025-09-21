import React from 'react';
import ReviewStatusBadge, { ReviewStatus } from './ReviewStatusBadge';

export interface ResponseListItem {
  _id: string;
  templateId: string;
  createdAt: number;
  reviewStatus: ReviewStatus;
  lastReviewedAt?: number;
  lastReviewedBy?: string;
  reviewNoteCount: number;
}

interface Props {
  responses: ResponseListItem[];
  onSelect: (id: string) => void;
}

export function ResponseReviewList({ responses, onSelect }: Props) {
  if (!responses.length) return <div className="text-sm text-gray-500">No responses</div>;
  return (
    <ul className="divide-y divide-gray-200 border rounded-md bg-white">
      {responses.map((r) => (
        <li
          key={r._id}
          className="p-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSelect(r._id)}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{r._id.slice(-6)}</div>
            <ReviewStatusBadge status={r.reviewStatus} />
          </div>
          <div className="mt-1 flex text-xs text-gray-500 gap-4">
            <span>{new Date(r.createdAt).toLocaleString()}</span>
            {r.reviewNoteCount > 0 && (
              <span>
                {r.reviewNoteCount} note{r.reviewNoteCount > 1 ? 's' : ''}
              </span>
            )}
            {r.lastReviewedAt && (
              <span>Reviewed {new Date(r.lastReviewedAt).toLocaleDateString()}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ResponseReviewList;
