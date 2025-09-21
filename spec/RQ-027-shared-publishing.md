# RQ-027: Shared Template Publishing

Intent:
Allow templates to be published and shared between teams with permission controls.

Decisions (Draft):
- Introduce `sharedTemplates` mapping table (templateId -> consumingTeamId, permission level).
- Only published versions eligible for sharing.

Acceptance Criteria:
- Owner team can share a template with another team (read-only) or grant clone rights.
- Consuming team can list shared templates distinctly.
- Audit log entries for share/unshare events.

Dependencies:
- RQ-008 template/version backend.
- RQ-009 RBAC roles (add share privilege to publisher/admin).

Open Questions:
- Version sync or manual pull updates? (Start manual.)
