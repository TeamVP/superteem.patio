import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FormField } from './FormField';
import { NumberField } from './NumberField';

const meta: Meta<typeof FormField> = {
  title: 'Form/FormField',
  component: FormField,
};
export default meta;

type Story = StoryObj<typeof FormField>;

export const TextError: Story = {
  name: 'Number with error',
  render: () => (
    <FormField label="Age" htmlFor="age" error="Age must be a number between 1 and 120">
      <NumberField id="age" value={''} onChange={() => {}} invalid placeholder="Enter age" />
    </FormField>
  ),
};

export const TextNormal: Story = {
  name: 'Number normal',
  render: () => (
    <FormField label="Age" htmlFor="age" error={null}>
      <NumberField id="age" value={'42'} onChange={() => {}} placeholder="Enter age" />
    </FormField>
  ),
};
