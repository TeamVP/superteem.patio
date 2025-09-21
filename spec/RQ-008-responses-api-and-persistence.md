# RQ-008: Responses API and persistence

Intent:
Persist responses with submission context, canonical answers, and payload, with version pinning to a published template. [file:7]

Decisions:
- Use Convex backend for data and server-side validation against the published template version. [file:5]
- Index key variables for analytics and auditing. [file:7]

Acceptance Criteria:
- Create, patch, and submit flows succeed for the SIBR observation with context fields (unit, team, reporter, occurredAt). [file:7]
- Server rejects submissions failing validation and returns structured errors. [file:7]

Deliverables:
- Convex functions for templates, template_versions, and responses plus tests. [file:5]

Dependencies:
- RQ-002 Schema and types, RQ-007 Validation UX. [file:7]
