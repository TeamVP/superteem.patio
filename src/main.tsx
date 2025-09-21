import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from '@/pages/Home';
import ReviewDashboard from '@/pages/ReviewDashboard';
import { TemplateSelector } from '@/pages/TemplateSelector';
import { ExportsPage } from './pages/ExportsPage';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DevAuthProvider } from './devAuth/DevAuthProvider';
import { ToastProvider } from '@/components/ToastProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevAuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          {globalThis.location?.pathname === '/exports' ? (
            <ExportsPage />
          ) : globalThis.location?.pathname === '/reviews' ? (
            <TemplateSelector>
              {(templateId: string) => <ReviewDashboard templateId={templateId} />}
            </TemplateSelector>
          ) : (
            <Home />
          )}
        </ErrorBoundary>
      </ToastProvider>
    </DevAuthProvider>
  </React.StrictMode>
);
