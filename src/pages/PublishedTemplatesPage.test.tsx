// Test for PublishedTemplatesPage – types may be partial in minimal env
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishedTemplatesPage } from './PublishedTemplatesPage';
// convex/react module is mocked below

vi.mock('convex/react', async () => {
  const actual = (await vi.importActual('convex/react')) as Record<string, unknown>;
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useQuery: (ref: any) => {
      if (ref?._name?.includes('listPublishedGlobal')) {
        return [
          {
            _id: 't1',
            title: 'Quick Check',
            slug: 'quick-check',
            type: 'survey',
          },
        ];
      }
      if (ref?._name?.includes('listMyDraftTemplates')) {
        return [];
      }
      return undefined;
    },
  };
});

// Minimal mock of useQuery for listForRespondent

describe('PublishedTemplatesPage', () => {
  it('renders published templates list', () => {
    render(<PublishedTemplatesPage />);
    expect(screen.getByText('Published Templates')).toBeInTheDocument();
    expect(screen.getByText('Quick Check')).toBeInTheDocument();
  });
});
