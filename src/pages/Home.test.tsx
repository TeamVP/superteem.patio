import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home';
vi.mock('@/hooks/useBackend', () => ({
  usePublishedTemplatesPublic: () => [
    { _id: 't1', title: 'Quick Check', slug: 'quick-check', type: 'survey', latestVersion: 1 },
  ],
  useMyDraftTemplates: () => [],
  useRespondentTemplates: () => [],
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: false }),
}));
vi.mock('@/hooks/useHomeData', () => ({
  useHomeData: () => ({ templates: [], drafts: [], recent: [] }),
}));

describe('Home (public)', () => {
  it('renders hero heading', () => {
    render(<Home />);
    expect(screen.getByText(/Improve Care Quality/i)).toBeInTheDocument();
    expect(screen.getByText('Quick Check')).toBeInTheDocument();
  });
});
