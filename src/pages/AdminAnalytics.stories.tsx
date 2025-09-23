import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AdminAnalyticsPage } from './AdminAnalytics';

const meta: Meta<typeof AdminAnalyticsPage> = {
  title: 'Pages/AdminAnalytics',
  component: AdminAnalyticsPage,
  parameters: {
    docs: {
      description: {
        component:
          'Placeholder story for the Admin Analytics page. In Storybook, Clerk context is absent; component will typically show an access denied state unless augmented by decorators.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof AdminAnalyticsPage>;

export const Default: Story = {
  render: () => <AdminAnalyticsPage />,
};
