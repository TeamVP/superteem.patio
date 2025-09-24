import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { TemplateRenderer } from '../features/responses/renderer/TemplateRenderer';
import type { Template } from '../types/template';

// Simplified slice of the SIBR template focused on occurrence gating and family validation.
const sibrTemplate: Template = {
  id: 'tpl_sibr',
  type: 'survey',
  version: '2',
  title: 'SIBR Observation (Integration)',
  body: [
    {
      id: 'patient_census',
      type: 'IntegerQuestion',
      label: 'Team patient census',
      variable: '$patient_census',
      customValidations: [
        { expression: '$patient_census <= 30', errorMessage: 'High census' },
        {
          expression: '$patient_census >= ($bedside || 0) + ($hallway || 0)',
          errorMessage: 'Patient census must be equal to or greater',
        },
      ],
    },
    {
      id: 'sibr_occurred',
      type: 'MultipleChoiceQuestion',
      label: 'Did SIBR occur?',
      variable: '$sibr_occurred',
      options: ['No', 'Yes'],
      minimumResponses: 1,
      maximumResponses: 1,
    },
    {
      id: 'sibr_details',
      type: 'CompositeQuestion',
      label: 'SIBR details',
      questions: [
        {
          id: 'bedside',
          type: 'IntegerQuestion',
          label: 'SIBRs at the bedside',
          variable: '$bedside',
          customValidations: [
            {
              expression: '!$bedside || $patient_census >= $bedside + $hallway',
              errorMessage: 'Bedside/hallway exceed census',
            },
          ],
        },
        {
          id: 'hallway',
          type: 'IntegerQuestion',
          label: 'SIBRs in the hallway',
          variable: '$hallway',
          customValidations: [
            {
              expression: '!$hallway || $patient_census >= $bedside + $hallway',
              errorMessage: 'Bedside/hallway exceed census',
            },
          ],
        },
        {
          id: 'onsite',
          type: 'IntegerQuestion',
          label: 'Families attended on-site',
          variable: '$onsite',
          customValidations: [
            {
              expression: '!$onsite || ($bedside + $hallway) >= ($onsite + $offsite)',
              errorMessage: 'Family count exceeds SIBRs',
            },
          ],
        },
        {
          id: 'offsite',
          type: 'IntegerQuestion',
          label: 'Families attended remotely',
          variable: '$offsite',
          customValidations: [
            {
              expression: '!$offsite || ($bedside + $hallway) >= ($onsite + $offsite)',
              errorMessage: 'Family count exceeds SIBRs',
            },
          ],
        },
      ],
    },
  ],
};

describe('SIBR integration (renderer + validation)', () => {
  it('validates family counts relative to SIBR totals', async () => {
    const handleSubmit = vi.fn();
    const { getByLabelText } = render(
      <TemplateRenderer template={sibrTemplate} onSubmit={handleSubmit} />
    );
    // Select "Yes" to simulate SIBR occurred (not needed for visibility now but included for realism)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(checkboxes[1]);

    // Enter counts that produce an error: bedside=1 hallway=1 family onsite=2 offsite=1 (2+1 > 1+1)
    fireEvent.change(getByLabelText('Team patient census'), { target: { value: '5' } });
    fireEvent.change(getByLabelText('SIBRs at the bedside'), { target: { value: '1' } });
    fireEvent.change(getByLabelText('SIBRs in the hallway'), { target: { value: '1' } });
    fireEvent.change(getByLabelText('Families attended on-site'), { target: { value: '2' } });
    fireEvent.change(getByLabelText('Families attended remotely'), { target: { value: '1' } });

    // Submit via synthetic event if renderer exposes a button; fallback: expect validation state text
    // We rely on inline validation message appearing (error aggregator strategy)
    await waitFor(() => {
      expect(screen.queryByText(/Resolve validation errors to enable submit/i)).not.toBeNull();
    });

    // Fix values to satisfy validation: reduce remote to 0
    fireEvent.change(getByLabelText('Families attended remotely'), { target: { value: '0' } });
    await waitFor(() => {
      expect(screen.queryByText(/Resolve validation errors to enable submit/i)).toBeNull();
    });
  });
});
