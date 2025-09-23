import React from 'react';

export function Footer() {
  return (
    <footer className="mt-16 border-t py-6 text-center text-[10px] text-gray-500 dark:text-gray-400">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <a href="/legal/terms" className="hover:underline">
          Terms
        </a>
        <a href="/legal/privacy" className="hover:underline">
          Privacy
        </a>
        <span>&copy; {new Date().getFullYear()} SuperTeem (Preview)</span>
      </div>
    </footer>
  );
}
