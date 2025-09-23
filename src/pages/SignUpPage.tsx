import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center p-6"
      data-analytics="sign-up-page"
    >
      <div className="max-w-sm w-full">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" />
      </div>
    </div>
  );
}
