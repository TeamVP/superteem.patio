import React from 'react';

export function LegalTerms() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p>These provisional terms govern preview usage of the platform.</p>
      <ol className="list-decimal ml-5 space-y-2">
        <li>Beta Status: Features are experimental and may change.</li>
        <li>Data: Do not upload real protected health information (PHI) in this preview.</li>
        <li>Availability: Service may be interrupted for maintenance without notice.</li>
        <li>IP: You retain rights to your survey content; you grant us a license to host it.</li>
        <li>Termination: We may revoke access to safeguard stability or security.</li>
      </ol>
      <p className="text-gray-500">Updated: {new Date().toLocaleDateString()}</p>
    </div>
  );
}
