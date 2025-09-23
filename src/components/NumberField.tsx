import React from 'react';

interface NumberFieldProps {
  value: string;
  onChange: (v: string) => void;
  id: string;
  invalid?: boolean;
  placeholder?: string;
}

export function NumberField({ value, onChange, id, invalid, placeholder }: NumberFieldProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={`border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        invalid
          ? 'border-red-600 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 dark:border-gray-600'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
