import type { Meta, StoryObj } from '@storybook/react';
import { TemplateEditor } from './TemplateEditor';

const meta: Meta<typeof TemplateEditor> = {
  title: 'Templates/TemplateEditor',
  component: TemplateEditor,
};

export default meta;

type Story = StoryObj<typeof TemplateEditor>;

export const Empty: Story = {
  args: {},
};

export const WithInitial: Story = {
  args: {
    initial: {
      id: 'demo-1',
      type: 'survey',
      title: 'Demo Template',
      version: '1.0.0',
      body: [],
    },
  },
};
