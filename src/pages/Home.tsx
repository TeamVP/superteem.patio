import React, { useState } from 'react';
import Button from '../components/Button';
import { useTheme } from '../hooks/useTheme';
import EnvironmentInfo from '../components/EnvironmentInfo';
import { FormField } from '../components/FormField';
import { NumberField } from '../components/NumberField';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ age?: string; name?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const e: { age?: string; name?: string } = {};
    const n = name.trim();
    if (!n) e.name = 'Name is required';
    const num = Number(age);
    if (!age) e.age = 'Age required';
    else if (Number.isNaN(num)) e.age = 'Age must be a number';
    else if (num < 1 || num > 120) e.age = 'Age must be between 1 and 120';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) {
      setSubmitted(true);
    } else {
      setSubmitted(false);
    }
  }

  const checklist = [
    'See this page at http://localhost:3000',
    'Toggle theme works',
    'Run pnpm verify passes',
    'Storybook starts (pnpm storybook)',
    'Playwright tests run (pnpm test:e2e)',
    'Coverage report generates (pnpm test:coverage)',
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Starter Project</h1>
      <p className="mt-3 text-gray-700 dark:text-gray-300">
        Your front-end environment is live. This starter project bundles React + TypeScript +
        Tailwind + Storybook + Vitest + Playwright with opinionated linting, formatting, CI,
        dependency update, and release automation.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-sm">
          Current theme: <strong>{theme}</strong>
        </span>
        <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Toggle Theme</Button>
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Initial Validation Checklist</h2>
        <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Next Steps</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Start defining your product requirements in the <code>spec/</code> directory. Add new
          components under <code>src/components</code>, create stories for them, and drive
          implementation with tests in <code>src</code> or <code>tests/</code>. Use the provided CI
          and release workflows to ensure consistency across environments.
        </p>
        <p className="mt-3 text-sm">
          Need data exports? Visit the{' '}
          <a href="/exports" className="text-blue-600 underline">
            Exports page
          </a>
          .
        </p>
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Demo Form Validation</h2>
        <p className="text-sm mt-1 mb-4 text-gray-600 dark:text-gray-300">
          Simple client-side validation example used by Playwright tests (invalid then valid
          submission flow).
        </p>
        <form onSubmit={handleSubmit} noValidate className="max-w-sm">
          <FormField label="Name" htmlFor="demo-name" error={errors.name ?? null}>
            <input
              id="demo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`border rounded px-2 py-1 w-full ${errors.name ? 'border-red-600' : 'border-gray-300'}`}
              placeholder="Enter name"
            />
          </FormField>
          <FormField label="Age" htmlFor="demo-age" error={errors.age ?? null}>
            <NumberField
              id="demo-age"
              value={age}
              onChange={setAge}
              invalid={!!errors.age}
              placeholder="e.g. 42"
            />
          </FormField>
          <div className="flex gap-3 items-center mt-2">
            <Button type="submit">Submit</Button>
            {submitted && (
              <span className="text-green-700 text-sm" role="status">
                Submitted!
              </span>
            )}
          </div>
        </form>
      </section>
      <EnvironmentInfo />
      <section className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Need a reminder? See README for scripts & conventions. Remove or customize this home page
          once your real app shell is ready.
        </p>
      </section>
    </div>
  );
}
