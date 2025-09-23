import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TemplateRenderer } from '../features/responses/renderer/TemplateRenderer';
import type { Template } from '../types/template';

const baseTemplate = (enableChild: string): Template => ({
  id: 't1',
  type: 'survey',
  version: '1',
  title: 'Runtime Visibility',
  body: [
    {
      id: 'q1',
      type: 'StringQuestion',
      label: 'Toggle',
      variable: '$toggle',
    },
    {
      id: 'q2',
      type: 'StringQuestion',
      label: 'Child',
      variable: '$child',
      enableIf: enableChild,
    },
    {
      id: 'grp',
      type: 'CompositeQuestion',
      label: 'Group',
      questions: [
        {
          id: 'g1',
          type: 'IntegerQuestion',
          label: 'Inside Number',
          variable: '$inside',
          enableIf: '$toggle == "show"',
        },
      ],
    },
    {
      id: 'list1',
      type: 'ListQuestion',
      label: 'List Wrapper',
      question: {
        id: 'lq1',
        type: 'StringQuestion',
        label: 'List Inner',
        variable: '$inner',
        enableIf: '$toggle == "show"',
      },
    },
  ],
});

describe('TemplateRenderer runtime visibility', () => {
  it('shows and hides simple dependent question', () => {
    const tpl = baseTemplate('$toggle == "show"');
    const { getByLabelText, queryByLabelText } = render(<TemplateRenderer template={tpl} />);
    expect(queryByLabelText('Child')).toBeNull();
    const toggleInput = getByLabelText('Toggle');
    fireEvent.change(toggleInput, { target: { value: 'show' } });
    expect(queryByLabelText('Child')).not.toBeNull();
    const childInput = getByLabelText('Child');
    fireEvent.change(childInput, { target: { value: 'abc' } });
    fireEvent.change(toggleInput, { target: { value: 'hide' } });
    expect(queryByLabelText('Child')).toBeNull();
  });

  it('clears nested composite and list answers when hidden', () => {
    const tpl = baseTemplate('$toggle == "show"');
    const { getByLabelText, queryByLabelText } = render(<TemplateRenderer template={tpl} />);
    const toggleInput = getByLabelText('Toggle');
    fireEvent.change(toggleInput, { target: { value: 'show' } });
    const insideInput = getByLabelText('Inside Number');
    const innerInput = getByLabelText('List Inner');
    fireEvent.change(insideInput, { target: { value: '42' } });
    fireEvent.change(innerInput, { target: { value: 'z' } });
    // hide
    fireEvent.change(toggleInput, { target: { value: 'hide' } });
    expect(queryByLabelText('Inside Number')).toBeNull();
    expect(queryByLabelText('List Inner')).toBeNull();
  });
});
