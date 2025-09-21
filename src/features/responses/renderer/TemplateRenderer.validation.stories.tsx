import type { Meta, StoryObj } from '@storybook/react';
import { TemplateRenderer } from './TemplateRenderer';
import type { Template } from '../../../types/template';

const validationTemplate: Template = {
  id: 'validation-demo',
  type: 'survey',
  version: '1',
  title: 'Validation Demo',
  body: [
    {
      id: 'name',
      type: 'StringQuestion',
      label: 'Name (min 3)',
      variable: '$name',
      customValidations: [
        { expression: '$name && $name.length < 3', errorMessage: 'Name must be at least 3 chars' },
      ],
    },
    {
      id: 'age',
      type: 'IntegerQuestion',
      label: 'Age (>= 18)',
      variable: '$age',
      customValidations: [{ expression: '$age && $age < 18', errorMessage: 'Must be 18 or older' }],
    },
    {
      id: 'role',
      type: 'MultipleChoiceQuestion',
      label: 'Roles (select <=2)',
      variable: '$roles',
      options: ['Doctor', 'Nurse', 'Therapist', 'Admin'],
      maximumResponses: 2,
      minimumResponses: 1,
    },
    {
      id: 'total',
      type: 'IntegerQuestion',
      label: 'Total >= age + 5',
      variable: '$total',
      customValidations: [
        {
          expression: '$total && $age && $total < ($age + 5)',
          errorMessage: 'Total must be >= Age + 5',
        },
      ],
    },
  ],
};

const visibilityTemplate: Template = {
  id: 'visibility-demo',
  type: 'survey',
  version: '1',
  title: 'Visibility Demo',
  body: [
    { id: 'toggle', type: 'StringQuestion', label: 'Toggle', variable: '$toggle' },
    {
      id: 'child1',
      type: 'StringQuestion',
      label: 'Child A',
      variable: '$a',
      enableIf: '$toggle == "a"',
    },
    {
      id: 'child2',
      type: 'StringQuestion',
      label: 'Child B',
      variable: '$b',
      enableIf: '$toggle == "b"',
    },
    {
      id: 'childBoth',
      type: 'IntegerQuestion',
      label: 'Number when A',
      variable: '$num',
      enableIf: '$toggle == "a"',
    },
    {
      id: 'group',
      type: 'CompositeQuestion',
      label: 'Group Visible on B',
      enableIf: '$toggle == "b"',
      questions: [
        { id: 'inside1', type: 'StringQuestion', label: 'Inside 1', variable: '$inside1' },
        { id: 'inside2', type: 'IntegerQuestion', label: 'Inside 2', variable: '$inside2' },
      ],
    },
  ],
};

const meta: Meta<typeof TemplateRenderer> = {
  title: 'Runtime/TemplateRenderer/Scenarios',
  component: TemplateRenderer,
};
export default meta;

type Story = StoryObj<typeof TemplateRenderer>;

export const ValidationErrors: Story = {
  name: 'Validation States',
  args: {
    template: validationTemplate,
    initialAnswers: { name: 'Al', age: 15, roles: ['Doctor', 'Nurse', 'Admin'], total: 18 },
  },
};

export const VisibilityToggle: Story = {
  name: 'Visibility Toggle',
  args: {
    template: visibilityTemplate,
    initialAnswers: { toggle: '' },
  },
};

// Cross-field census >= bedside + hallway scenario
const crossFieldTemplate: Template = {
  id: 'cross-field-demo',
  type: 'survey',
  version: '1',
  title: 'Cross-field Validation Demo',
  body: [
    { id: 'census', type: 'IntegerQuestion', label: 'Census', variable: '$census' },
    { id: 'bedside', type: 'IntegerQuestion', label: 'Bedside', variable: '$bedside' },
    { id: 'hallway', type: 'IntegerQuestion', label: 'Hallway', variable: '$hallway' },
  ],
};

export const CrossFieldCensusRule: Story = {
  name: 'Cross-field Census Rule',
  args: {
    template: crossFieldTemplate,
    // Failing state: census (5) < bedside (3) + hallway (3) = 6
    initialAnswers: { census: 5, bedside: 3, hallway: 3 },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates domain rule: Census must be >= bedside + hallway. Adjust numbers in the canvas to clear the error (e.g. increase census to 6).',
      },
    },
  },
};

// Per-question focused error scenarios (one failing case per built-in rule)
const perQuestionTemplate: Template = {
  id: 'per-question-demo',
  type: 'survey',
  version: '1',
  title: 'Per-Question Error States',
  body: [
    {
      id: 'shortName',
      type: 'StringQuestion',
      label: 'Name (min length 3)',
      variable: '$shortName',
      minimumLength: 3,
    },
    {
      id: 'tooYoung',
      type: 'IntegerQuestion',
      label: 'Age (>= 18)',
      variable: '$tooYoung',
      minimum: 18,
    },
    {
      id: 'notEnoughRoles',
      type: 'MultipleChoiceQuestion',
      label: 'Select at least 2 roles (min 2)',
      variable: '$notEnoughRoles',
      options: ['A', 'B', 'C'],
      minimumResponses: 2,
    },
    {
      id: 'tooManyRoles',
      type: 'MultipleChoiceQuestion',
      label: 'Select at most 1 role (max 1)',
      variable: '$tooManyRoles',
      options: ['X', 'Y'],
      maximumResponses: 1,
    },
    {
      id: 'requiredField',
      type: 'StringQuestion',
      label: 'Required Field',
      variable: '$requiredField',
      required: true,
    },
  ],
};

export const PerQuestionErrors: Story = {
  name: 'Per-Question Error States',
  args: {
    template: perQuestionTemplate,
    // Provide failing initial answers for each rule:
    // shortName '' (violates min length), tooYoung 16 (<18), notEnoughRoles ['A'] (needs 2),
    // tooManyRoles ['X','Y'] (exceeds max 1), requiredField missing/undefined.
    initialAnswers: {
      shortName: '',
      tooYoung: 16,
      notEnoughRoles: ['A'],
      tooManyRoles: ['X', 'Y'],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows each core built-in validation rule failing simultaneously. Edit values to watch individual errors clear. Required field left blank to trigger required error.',
      },
    },
  },
};
