import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RespondentFormPage } from './RespondentFormPage';
import type { Id } from '../../convex/_generated/dataModel';

// Mock convex generated API hooks used inside component
vi.mock('convex/react', () => ({
  useQuery: () => [
    {
      version: 1,
      body: {
        title: 'Validation Test Survey',
        questions: [
          {
            id: 'q1',
            type: 'StringQuestion',
            label: 'Name',
            required: true,
            minimumLength: 2,
          },
          {
            id: 'q2',
            type: 'IntegerQuestion',
            label: 'Age',
            required: true,
            minimum: 10,
            maximum: 20,
          },
        ],
      },
    },
  ],
}));

// Mock backend hooks for draft save & submit
vi.mock('@/hooks/useBackend', () => ({
  useResponseDraft: () => undefined,
  useSaveResponseDraft: () => vi.fn().mockResolvedValue(undefined),
  useSubmitResponse: () => vi.fn().mockResolvedValue(undefined),
}));

// Utility to render with a stable template id
const tplId = 't1' as Id<'templates'>;

describe('RespondentFormPage validation', () => {
  it('blocks submit when required fields empty and shows messages after interaction', async () => {
    render(<RespondentFormPage templateId={tplId} />);
    // Initially submit button disabled because required errors exist
    const submitBtn = await screen.findByRole('button', { name: /submit/i });
    expect(submitBtn).toBeDisabled();

    // Type too short for q1
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'A' } });

    // Age (q2) leave empty -> still invalid
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Fix name length and set valid age
    fireEvent.change(nameInput, { target: { value: 'Al' } });
    const ageInput = screen.getByLabelText('Age');
    fireEvent.change(ageInput, { target: { value: '15' } });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('enforces integer min/max bounds', async () => {
    render(<RespondentFormPage templateId={tplId} />);
    const submitBtn = await screen.findByRole('button', { name: /submit/i });
    const nameInput = screen.getByLabelText('Name');
    const ageInput = screen.getByLabelText('Age');

    fireEvent.change(nameInput, { target: { value: 'Ali' } });
    fireEvent.change(ageInput, { target: { value: '5' } }); // below min

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    fireEvent.change(ageInput, { target: { value: '25' } }); // above max
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    fireEvent.change(ageInput, { target: { value: '12' } }); // within range
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
