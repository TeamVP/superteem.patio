# RQ-024: Legal Pages

Intent:
Add Terms of Service and Privacy Policy pages to satisfy compliance and user trust requirements.

Decisions (Draft):
- Static markdown pages rendered via simple route components.
- Versioned documents with commit history as audit trail.

Acceptance Criteria:
- Footer links to /terms and /privacy accessible publicly.
- Last updated date displayed.
- Build process fails if pages missing mandatory headings.

Dependencies:
- None.

Open Questions:
- Need for region-specific privacy variants? (Later.)
