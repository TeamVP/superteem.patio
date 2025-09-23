import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block font-medium mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
