import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Home from '@/pages/Home';
import { LegalTerms } from '@/pages/LegalTerms';
import { LegalPrivacy } from '@/pages/LegalPrivacy';
import { AdminAnalyticsPage } from '@/pages/AdminAnalytics';
import { Footer } from '@/components/Footer';
import { RespondentTemplatesPage } from '@/pages/RespondentTemplatesPage';
import { RespondentFormPage } from '@/pages/RespondentFormPage';
import ReviewDashboard from '@/pages/ReviewDashboard';
import { PublishedTemplatesPage } from '@/pages/PublishedTemplatesPage';
import { TemplateDetailPage } from '@/pages/TemplateDetailPage';
import { NewTemplatePage } from '@/pages/NewTemplatePage';
import { TopBar } from '@/components/TopBar';
import { AccountPage } from '@/pages/AccountPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TemplateSelector } from './pages/TemplateSelector';
import { ExportsPage } from './pages/ExportsPage';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DevAuthProvider } from './devAuth/DevAuthProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { ClerkProvider, useUser, useSession } from '@clerk/clerk-react';
import { consumePostAuthRedirect } from '@/auth/postAuthRedirect';
import { ConvexReactClient, ConvexProvider } from 'convex/react';
import { api } from '../convex/_generated/api';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

function AppShell({ clerkEnabled }: { clerkEnabled: boolean }) {
  function getRespondentTemplateId():
    | import('../convex/_generated/dataModel').Id<'templates'>
    | undefined {
    const path = globalThis.location?.pathname || '';
    if (!path.startsWith('/respondent/')) return undefined;
    const parts = path.split('/');
    if (parts.length >= 3 && parts[2]) {
      return parts[2] as import('../convex/_generated/dataModel').Id<'templates'>;
    }
    return undefined;
  }
  const respondentTemplateId = getRespondentTemplateId();
  const path = globalThis.location?.pathname || '';
  return (
    <ToastProvider>
      <ErrorBoundary>
        <TopBar />
        {path === '/legal/terms' ? (
          <LegalTerms />
        ) : path === '/legal/privacy' ? (
          <LegalPrivacy />
        ) : path === '/admin' ? (
          <AdminAnalyticsPage />
        ) : path.startsWith('/sign-in') ? (
          clerkEnabled ? (
            <React.Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
              {/** Dynamic import keeps component tree small */}
              <SignInLazy />
            </React.Suspense>
          ) : (
            <AuthConfigWarning />
          )
        ) : path.startsWith('/sign-up') ? (
          clerkEnabled ? (
            <React.Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
              <SignUpLazy />
            </React.Suspense>
          ) : (
            <AuthConfigWarning />
          )
        ) : path === '/exports' ? (
          <ExportsPage />
        ) : path === '/account' ? (
          <AccountPage />
        ) : path === '/reviews' ? (
          <TemplateSelector>
            {(templateId: string) => <ReviewDashboard templateId={templateId} />}
          </TemplateSelector>
        ) : path === '/profile' ? (
          <ProfilePage />
        ) : path === '/respondent' ? (
          <RespondentTemplatesPage />
        ) : path === '/templates' ? (
          <PublishedTemplatesPage />
        ) : path === '/templates/new' ? (
          <NewTemplatePage />
        ) : path.startsWith('/templates/') ? (
          <TemplateDetailPage slug={path.split('/')[2] || ''} />
        ) : respondentTemplateId ? (
          <RespondentFormPage templateId={respondentTemplateId} />
        ) : (
          <Home />
        )}
        <Footer />
      </ErrorBoundary>
    </ToastProvider>
  );
}

function ClerkUpsertBridge() {
  const { isSignedIn, user } = useUser();
  const { session } = useSession();
  useEffect(() => {
    if (!isSignedIn || !user) return;
    const tokenIdentifier = session?.id ? `clerk_session:${session.id}` : undefined;
    void convex.mutation(api.users.upsertFromClerk, {
      clerkId: user.id,
      tokenIdentifier,
      email: user.primaryEmailAddress?.emailAddress,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      imageUrl: user.imageUrl,
    });
    // Apply post-auth redirect once user established.
    const redirect = consumePostAuthRedirect();
    if (redirect) {
      globalThis.location.replace(redirect);
    }
  }, [isSignedIn, user, session]);
  return null;
}

const SignInLazy = React.lazy(() =>
  import('@/pages/SignInPage').then((m) => ({ default: m.SignInPage }))
);
const SignUpLazy = React.lazy(() =>
  import('@/pages/SignUpPage').then((m) => ({ default: m.SignUpPage }))
);

function AuthConfigWarning() {
  return (
    <div className="max-w-md mx-auto p-6 text-sm space-y-4" data-analytics="auth-misconfig">
      <h1 className="text-lg font-semibold">Authentication Not Configured</h1>
      <p>
        Clerk publishable key is missing or development auth mode is enabled.{' '}
        <code>VITE_CLERK_PUBLISHABLE_KEY</code> to <code>.env.local</code> and restart the dev
        server (remove <code>VITE_DEV_AUTH</code>) to enable the hosted sign-in experience.
      </p>
    </div>
  );
}

function Root() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const devAuth = import.meta.env.VITE_DEV_AUTH === '1';
  if (!publishableKey || devAuth) {
    return (
      <DevAuthProvider>
        <AppShell clerkEnabled={false} />
      </DevAuthProvider>
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <ClerkUpsertBridge />
      <AppShell clerkEnabled={true} />
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <Root />
    </ConvexProvider>
  </React.StrictMode>
);
