import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RoleGuard } from './RoleGuard';

const meta: Meta<typeof RoleGuard> = {
  title: 'Auth/RoleGuard',
  component: RoleGuard,
};
export default meta;

type Story = StoryObj<typeof RoleGuard>;

export const Allowed: Story = {
  render: () => (
    <RoleGuard roles={['admin']}>You would see this if roles matched (stub always true)</RoleGuard>
  ),
};

export const Fallback: Story = {
  render: () => (
    <RoleGuard roles={['admin']} fallback={<span>Fallback content</span>}>
      Hidden content when roles fail (stub always true now)
    </RoleGuard>
  ),
};
