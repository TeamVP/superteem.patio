import React from 'react';

export function LegalPrivacy() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p>This preview environment stores minimal user profile and survey response data.</p>
      <ul className="list-disc ml-5 space-y-2">
        <li>Collection: Account identifiers and survey responses you submit.</li>
        <li>Usage: Operate core survey workflows and improve reliability.</li>
        <li>Storage: Data persisted in our managed backend (Convex) in a single region.</li>
        <li>Deletion: Contact an administrator to request data purge during beta.</li>
        <li>Security: Transport encrypted via HTTPS; do not enter real PHI.</li>
      </ul>
      <p className="text-gray-500">Updated: {new Date().toLocaleDateString()}</p>
    </div>
  );
}
