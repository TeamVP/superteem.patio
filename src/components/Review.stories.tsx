import type { Meta, StoryObj } from '@storybook/react';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { ResponseReviewList, ResponseListItem } from './ResponseReviewList';
import { ResponseReviewDetail, ResponseRecord, ReviewNote } from './ResponseReviewDetail';
import React, { useState } from 'react';

const meta: Meta = {
  title: 'Components/Review',
  tags: ['autodocs'],
};
export default meta;

// Status Badge stories
export const StatusBadges: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <ReviewStatusBadge status="unreviewed" />
      <ReviewStatusBadge status="in_review" />
      <ReviewStatusBadge status="reviewed" />
    </div>
  ),
};

// Mock data
const baseCreated = Date.now() - 1000 * 60 * 60;
const responses: ResponseListItem[] = [
  {
    _id: 'resp_1',
    templateId: 'tmpl_1',
    createdAt: baseCreated,
    reviewStatus: 'unreviewed',
    reviewNoteCount: 0,
  },
  {
    _id: 'resp_2',
    templateId: 'tmpl_1',
    createdAt: baseCreated + 20000,
    reviewStatus: 'in_review',
    reviewNoteCount: 2,
    lastReviewedAt: baseCreated + 40000,
  },
  {
    _id: 'resp_3',
    templateId: 'tmpl_1',
    createdAt: baseCreated + 40000,
    reviewStatus: 'reviewed',
    reviewNoteCount: 3,
    lastReviewedAt: baseCreated + 60000,
  },
];

function ListStatesRender() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-2 gap-4">
      <ResponseReviewList responses={responses} onSelect={setSelected} />
      <div className="border rounded p-3 text-sm text-gray-500">Selected: {selected || 'None'}</div>
    </div>
  );
}

export const ListStates: StoryObj = {
  render: () => <ListStatesRender />,
};

const detailResponse: ResponseRecord = {
  _id: 'resp_2',
  templateId: 'tmpl_1',
  createdAt: baseCreated + 20000,
  reviewStatus: 'in_review',
  lastReviewedAt: baseCreated + 40000,
  reviewNoteCount: 2,
};

const notes: ReviewNote[] = [
  {
    _id: 'note_1',
    createdAt: baseCreated + 25000,
    createdBy: 'user_1',
    note: 'Initial triage started',
  },
  {
    _id: 'note_2',
    createdAt: baseCreated + 35000,
    createdBy: 'user_2',
    note: 'Clarified patient context; moving toward completion',
    statusAfter: 'in_review',
  },
];

export const DetailPanel: StoryObj = {
  render: () => (
    <div className="max-w-lg">
      <ResponseReviewDetail
        response={detailResponse}
        notes={notes}
        onAddNote={(n, s) => {
          console.log('Add note', { n, s });
        }}
        onChangeStatus={(s) => {
          console.log('Change status', s);
        }}
      />
    </div>
  ),
};
