import React, { useState } from 'react';
import ReviewStatusBadge, { ReviewStatus } from './ReviewStatusBadge';

export interface ReviewNote {
  _id: string;
  createdAt: number;
  createdBy: string;
  note?: string;
  statusAfter?: ReviewStatus;
}

export interface ResponseRecord {
  _id: string;
  templateId: string;
  createdAt: number;
  reviewStatus: ReviewStatus;
  lastReviewedAt?: number;
  lastReviewedBy?: string;
  reviewNoteCount: number;
}

interface Props {
  response: ResponseRecord;
  notes: ReviewNote[];
  onAddNote: (note: string, statusAfter?: ReviewStatus) => Promise<void> | void;
  onChangeStatus: (status: ReviewStatus) => Promise<void> | void;
}

const STATUS_OPTIONS: ReviewStatus[] = ['unreviewed', 'in_review', 'reviewed'];

export function ResponseReviewDetail({ response, notes, onAddNote, onChangeStatus }: Props) {
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [nextStatus, setNextStatus] = useState<ReviewStatus>(response.reviewStatus);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note && nextStatus === response.reviewStatus) return;
    setPending(true);
    try {
      await onAddNote(note, nextStatus !== response.reviewStatus ? nextStatus : undefined);
      setNote('');
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(s: ReviewStatus) {
    setNextStatus(s);
    if (s !== response.reviewStatus && !note) {
      // direct status change without note
      await onChangeStatus(s);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Response {response._id.slice(-6)}</h2>
        <ReviewStatusBadge status={response.reviewStatus} />
      </header>
      <div className="text-xs text-gray-600 flex gap-4">
        <span>Created {new Date(response.createdAt).toLocaleString()}</span>
        {response.lastReviewedAt && (
          <span>Last Reviewed {new Date(response.lastReviewedAt).toLocaleString()}</span>
        )}
      </div>
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Notes</h3>
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {notes.map((n) => (
            <li key={n._id} className="border rounded p-2 bg-white">
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                <span>{new Date(n.createdAt).toLocaleString()}</span>
                {n.statusAfter && <ReviewStatusBadge status={n.statusAfter} />}
              </div>
              {n.note && <p className="text-sm whitespace-pre-line">{n.note}</p>}
            </li>
          ))}
          {!notes.length && <li className="text-xs text-gray-400">No notes yet</li>}
        </ul>
      </section>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="w-full border rounded p-2 text-sm"
          rows={3}
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={nextStatus}
            onChange={(e) => changeStatus(e.target.value as ReviewStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ResponseReviewDetail;
