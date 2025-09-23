# RQ-023: Localization Support

Intent:
Enable multi-language templates and responses.

Decisions (Draft):
- Store translatable fields (label, note) as keyed objects: { en: string, es?: string }.
- Fallback to default locale if translation missing.
- Locale switch stored per user preference.

Acceptance Criteria:
- Renderer shows selected locale strings.
- Missing translation surfaces fallback indicator (optional icon).
- Export includes language metadata.

Dependencies:
- RQ-004 editor changes for multi-locale input.

Open Questions:
- Translation workflow integration (crowd vs professional).
