import React from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react-clerk'; // fallback for prod (using Clerk's auth shape)
import { useDevAuth } from './useDevAuth';

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convexClient = new ConvexReactClient(convexUrl);

export const DevAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const enabled = import.meta.env.VITE_DEV_AUTH === '1';
  if (enabled) {
    // ConvexProviderWithAuth normally imported from convex/react, but we can simulate via ConvexProviderWithAuth from react-clerk? For dev we provide custom useAuth.
    // @ts-expect-error Using custom useAuth signature compatible at runtime
    return <ConvexProviderWithAuth client={convexClient} useAuth={useDevAuth}>{children}</ConvexProviderWithAuth>;
  }
  return <ConvexProviderWithAuth client={convexClient}>{children}</ConvexProviderWithAuth>;
};
