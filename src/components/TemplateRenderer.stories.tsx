import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TemplateRenderer, ValidationErrorMap } from './TemplateRenderer';
import { Template } from '../types/template';

const meta: Meta<typeof TemplateRenderer> = {
  title: 'Template/RendererValidation',
  component: TemplateRenderer,
};
export default meta;

type Story = StoryObj<typeof TemplateRenderer>;

const builtInTemplate: Template = {
  id: 't1',
  type: 'survey',
  version: '1',
  body: [
    { id: 'name', type: 'StringQuestion', label: 'Name', required: true, minimumLength: 3 },
    { id: 'age', type: 'IntegerQuestion', label: 'Age', minimum: 1, maximum: 120 },
  ],
};

function builtInValidate(answers: Record<string, unknown>): ValidationErrorMap {
  const errors: ValidationErrorMap = {};
  const name = (answers['name'] as string) || '';
  if (name.length < 3) errors['name'] = ['Name must be at least 3 characters'];
  const age = answers['age'];
  if (age != null) {
    const n = Number(age);
    if (Number.isNaN(n) || n < 1 || n > 120) {
      errors['age'] = ['Age must be between 1 and 120'];
    }
  }
  return errors;
}

export const BuiltInErrors: Story = {
  render: () => (
    <TemplateRenderer
      template={builtInTemplate}
      validate={builtInValidate}
      initialAnswers={{ name: 'Al', age: 200 }}
    />
  ),
};

const crossFieldTemplate: Template = {
  id: 't2',
  type: 'survey',
  version: '1',
  body: [
    { id: 'census', type: 'IntegerQuestion', label: 'Census' },
    { id: 'bedside', type: 'IntegerQuestion', label: 'Bedside' },
    { id: 'hallway', type: 'IntegerQuestion', label: 'Hallway' },
  ],
};

function crossFieldValidate(answers: Record<string, unknown>): ValidationErrorMap {
  const errors: ValidationErrorMap = {};
  const census = Number(answers['census'] ?? 0);
  const bedside = Number(answers['bedside'] ?? 0);
  const hallway = Number(answers['hallway'] ?? 0);
  if (census < bedside + hallway) {
    const msg = 'Census must be ≥ bedside + hallway';
    errors['census'] = [msg];
    errors['bedside'] = [msg];
    errors['hallway'] = [msg];
  }
  return errors;
}

export const CrossFieldErrors: Story = {
  render: () => (
    <TemplateRenderer
      template={crossFieldTemplate}
      validate={crossFieldValidate}
      initialAnswers={{ census: 5, bedside: 4, hallway: 3 }}
    />
  ),
};
