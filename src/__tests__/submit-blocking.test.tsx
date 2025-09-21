import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TemplateRenderer } from '../features/responses/renderer/TemplateRenderer';
import type { Template } from '../types/template';

const template: Template = {
  id: 'submit-demo',
  type: 'survey',
  version: '1',
  title: 'Submit Blocking',
  body: [
    {
      id: 'name',
      type: 'StringQuestion',
      label: 'Name (required, min 3)',
      variable: '$name',
      required: true,
      minimumLength: 3,
    },
    {
      id: 'age',
      type: 'IntegerQuestion',
      label: 'Age (>= 18)',
      variable: '$age',
      minimum: 18,
    },
  ],
};

describe('TemplateRenderer submit blocking', () => {
  it('disables submit until validation passes', () => {
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText } = render(
      <TemplateRenderer template={template} onSubmit={onSubmit} />
    );
    const btn = getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true); // required + min length failing
    const nameInput = getByLabelText('Name (required, min 3)');
    fireEvent.change(nameInput, { target: { value: 'Al' } });
    // still failing (min length)
    expect(btn.disabled).toBe(true);
    fireEvent.change(nameInput, { target: { value: 'Alex' } });
    const ageInput = getByLabelText('Age (>= 18)');
    fireEvent.change(ageInput, { target: { value: '17' } });
    expect(btn.disabled).toBe(true); // age rule failing
    fireEvent.change(ageInput, { target: { value: '18' } });
    // all validations satisfied
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
