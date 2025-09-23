import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Footer } from '@/components/Footer';
import { LegalTerms } from './LegalTerms';
import { LegalPrivacy } from './LegalPrivacy';

const meta: Meta = {
  title: 'Pages/Legal',
};
export default meta;

type Story = StoryObj;

export const TermsPage: Story = {
  render: () => (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <LegalTerms />
      <Footer />
    </div>
  ),
};

export const PrivacyPage: Story = {
  render: () => (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <LegalPrivacy />
      <Footer />
    </div>
  ),
};
