import React from 'react';

export type ReviewStatus = 'unreviewed' | 'in_review' | 'reviewed';

interface Props {
  status: ReviewStatus;
  className?: string;
}

const COLORS: Record<ReviewStatus, string> = {
  unreviewed: 'bg-gray-200 text-gray-700',
  in_review: 'bg-amber-200 text-amber-800',
  reviewed: 'bg-emerald-200 text-emerald-800',
};

const LABELS: Record<ReviewStatus, string> = {
  unreviewed: 'Unreviewed',
  in_review: 'In Review',
  reviewed: 'Reviewed',
};

export function ReviewStatusBadge({ status, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COLORS[status]} ${className}`.trim()}
    >
      {LABELS[status]}
    </span>
  );
}

export default ReviewStatusBadge;
