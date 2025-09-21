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
      className={`border rounded px-2 py-1 w-full ${invalid ? 'border-red-600' : 'border-gray-300'}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
