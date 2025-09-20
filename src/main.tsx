import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from '@/pages/Home';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DevAuthProvider } from './devAuth/DevAuthProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DevAuthProvider>
      <ErrorBoundary>
        <Home />
      </ErrorBoundary>
    </DevAuthProvider>
  </React.StrictMode>
);
