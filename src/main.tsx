import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from '@/pages/Home';
import ReviewDashboard from '@/pages/ReviewDashboard';
import { TemplateSelector } from '@/pages/TemplateSelector';
import { ExportsPage } from './pages/ExportsPage';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DevAuthProvider } from './devAuth/DevAuthProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevAuthProvider>
      <ErrorBoundary>
        {globalThis.location?.pathname === '/exports' ? (
          <ExportsPage />
        ) : globalThis.location?.pathname === '/reviews' ? (
          <TemplateSelector>
            {(templateId) => <ReviewDashboard templateId={templateId} />}
          </TemplateSelector>
        ) : (
          <Home />
        )}
      </ErrorBoundary>
    </DevAuthProvider>
  </React.StrictMode>
);
