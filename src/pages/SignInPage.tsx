import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center p-6"
      data-analytics="sign-in-page"
    >
      <div className="max-w-sm w-full">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" />
      </div>
    </div>
  );
}
