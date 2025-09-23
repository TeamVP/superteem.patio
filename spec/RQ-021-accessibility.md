# RQ-021: Accessibility Improvements

Intent:
Meet WCAG AA for form rendering and authoring.

Decisions (Draft):
- Use semantic elements, ARIA where necessary (error associations, summaries).
- Focus outlines always visible; color contrast tokens validated.
- Introduce automated axe-core checks in CI.

Acceptance Criteria:
- All interactive components keyboard navigable.
- Axe audit: zero critical violations on key pages.
- Error summary links focus target fields.

Dependencies:
- RQ-012 UI component alignment.

Open Questions:
- Dynamic form sections announcements via ARIA live region.
