import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home';

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ isSignedIn: false }),
}));
vi.mock('@/hooks/useHomeData', () => ({
  useHomeData: () => ({ templates: [], drafts: [], recent: [] }),
}));

describe('Home (public)', () => {
  it('renders hero heading', () => {
    render(<Home />);
    expect(screen.getByText(/Improve Care Quality/i)).toBeDefined();
  });
});
