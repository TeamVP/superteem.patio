import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { TemplateRenderer } from '../features/responses/renderer/TemplateRenderer';
import type { Template } from '../types/template';

// Template slice focusing on original expression: $sibr_occurred && $sibr_occurred[0] === 1
// valueMode: 'index' ensures answers store numeric indices so [0] resolves to first selected index numeric value
const tpl: Template = {
  id: 'tpl_branch_idx',
  type: 'survey',
  version: '1',
  body: [
    {
      id: 'sibr_occurred',
      type: 'MultipleChoiceQuestion',
      label: 'Did SIBR occur?',
      variable: '$sibr_occurred',
      options: ['No', 'Yes'],
      minimumResponses: 1,
      maximumResponses: 1,
      valueMode: 'index',
    },
    {
      id: 'details',
      type: 'CompositeQuestion',
      label: 'SIBR Details',
      enableIf: '$sibr_occurred && $sibr_occurred[0] === 1',
      questions: [
        {
          id: 'bedside',
          type: 'IntegerQuestion',
          label: 'Bedside count',
          variable: '$bedside',
        },
      ],
    },
  ],
};

describe('Branching UI with index mode', () => {
  it('hides details until Yes selected (index=1)', () => {
    render(<TemplateRenderer template={tpl} showDebug={false} />);
  // Initially only the occurrence question is visible (assert via first checkbox label text fallback)
  const allCheckboxes = screen.getAllByRole('checkbox');
  expect(allCheckboxes.length).toBeGreaterThan(0);
  expect(screen.queryByText('SIBR Details')).toBeNull();
  // Select "No" (index 0) -> still hidden
  const noCheckbox = allCheckboxes[0];
    fireEvent.click(noCheckbox);
    expect(screen.queryByText('SIBR Details')).toBeNull();

    // Switch to "Yes" (index 1)
  const yesCheckbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(yesCheckbox); // select Yes
    // unselect No if still selected (single-select enforced by maxResponses but defensive)
    if (noCheckbox.checked) fireEvent.click(noCheckbox);

    expect(screen.getByText('SIBR Details')).toBeInTheDocument();
    expect(screen.getByLabelText('Bedside count')).toBeInTheDocument();
  });
});
