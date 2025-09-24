import type { Meta, StoryObj } from '@storybook/react';
import { TemplateRenderer } from './TemplateRenderer';
import type { Template } from '../../../types/template';
// Import example templates (treated as raw JSON Template objects)
import interdisciplinaryQs from '../../../../spec/examples/templates/interdisciplinary-care-survey.json';
import observationQs from '../../../../spec/examples/templates/sibr-observation.json';
import readinessQs from '../../../../spec/examples/templates/sibr-readiness-survey.json';
import ahpeqsQs from '../../../../spec/examples/templates/ahpeqs-survey.json';

function wrap(id: string, title: string, body: unknown[]): Template {
  return { id, type: 'survey', version: '1', title, body } as Template;
}

// Imported JSON arrays contain question objects; we trust external spec fixtures.
const interdisciplinary = wrap(
  'fixture-interdisciplinary',
  'Interdisciplinary Care Survey',
  interdisciplinaryQs as unknown[]
);
const observation = wrap('fixture-observation', 'SIBR Observation', observationQs as unknown[]);
const readiness = wrap('fixture-readiness', 'SIBR Readiness Survey', readinessQs as unknown[]);
const ahpeqs = wrap('fixture-ahpeqs', 'AHPEQS Survey', ahpeqsQs as unknown[]);

const meta: Meta<typeof TemplateRenderer> = {
  title: 'Runtime/TemplateRenderer',
  component: TemplateRenderer,
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof TemplateRenderer>;

export const InterdisciplinaryCare: Story = {
  name: 'Interdisciplinary Care Survey',
  args: { template: interdisciplinary },
};

export const SibrObservation: Story = {
  name: 'SIBR Observation',
  args: { template: observation },
};

export const SibrReadiness: Story = {
  name: 'SIBR Readiness Survey',
  args: { template: readiness },
};

export const Ahpeqs: Story = {
  name: 'AHPEQS Survey',
  args: { template: ahpeqs },
};
