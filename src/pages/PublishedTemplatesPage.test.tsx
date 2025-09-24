// Test for PublishedTemplatesPage – types may be partial in minimal env
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishedTemplatesPage } from './PublishedTemplatesPage';
vi.mock('@/hooks/useBackend', () => ({
  usePublishedTemplatesPublic: () => [
    { _id: 't1', title: 'Quick Check', slug: 'quick-check', type: 'survey', latestVersion: 1 },
  ],
  useMyDraftTemplates: () => [],
}));

// Minimal mock of useQuery for listForRespondent

describe('PublishedTemplatesPage', () => {
  it('renders published templates list', () => {
    render(<PublishedTemplatesPage />);
    expect(screen.getByText(/Available Surveys/i)).toBeInTheDocument();
    expect(screen.getByText('Quick Check')).toBeInTheDocument();
  });
});
