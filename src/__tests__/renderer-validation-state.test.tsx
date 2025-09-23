import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TemplateRenderer } from '../features/responses/renderer/TemplateRenderer';
import type { Template } from '../types/template';

const tpl: Template = {
  id: 'val-demo',
  type: 'survey',
  version: '1',
  title: 'Validation State',
  body: [
    {
      id: 'shortName',
      type: 'StringQuestion',
      label: 'Name (>=3)',
      variable: '$name',
      minimumLength: 3,
    },
    {
      id: 'underAge',
      type: 'IntegerQuestion',
      label: 'Age (>=18)',
      variable: '$age',
      minimum: 18,
    },
  ],
};

describe('TemplateRenderer validation state', () => {
  it('renders field validation errors for invalid initialAnswers (built-ins)', async () => {
    render(<TemplateRenderer template={tpl} initialAnswers={{ name: 'Al', age: 15 }} />);
    expect(await screen.findByText('Minimum length is 3')).toBeInTheDocument();
    expect(await screen.findByText('Minimum value is 18')).toBeInTheDocument();
  });
});
