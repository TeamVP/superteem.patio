# RQ-014: Audit & Versioning Plan

## Goals
- Immutable template snapshots per publish.
- Audit trail for template edit, publish, response submit, export actions.
- Ability to revert (create new version from prior snapshot) without mutating historic versions.

## Data Model Additions
- `auditLogs` table:
  - `entityType`: 'template' | 'response' | 'export'
  - `entityId`: string (templateId or responseId or templateId for export)
  - `action`: 'edit' | 'publish' | 'submit' | 'export'
  - `actorId`: string
  - `timestamp`: number (ms epoch)
  - `version`: optional number (template version when relevant)
  - `summary`: short text (<= 200 chars)
  - Indexes: by_entity (`entityType`,`entityId`,`timestamp` desc), by_actor (`actorId`,`timestamp` desc), recent (`timestamp` desc)

## Functions
- Template authoring:
  - `templates:saveDraft` (update template draft state + log 'edit')
  - `templates:publish` (increment version, write templateVersions row, update templates.latestVersion, log 'publish')
  - `templates:revertToVersion` (copy body from templateVersions target, increment version, log 'publish' with summary 'revert from X')
- Responses:
  - On submit (existing function) append audit log 'submit'.
- Exports:
  - Wrap existing export call to log 'export'.
- Audit queries:
  - `audit:getByEntity({entityType, entityId, limit?})`
  - `audit:getRecent({limit?})`

## UI (minimal for now)
- Exports page: append small panel listing last 5 audit entries for the template (if templateId context available later) — deferred (doc placeholder only).

## Acceptance Criteria
- Publishing creates new templateVersions row with monotonically increasing version.
- Reverting creates a new version whose body matches the selected prior version.
- Audit entries appear for edit, publish, submit, export actions.
- Responses still linked to original templateVersion used at submission.

## Non-Goals (now)
- Full diff generation UI.
- Pagination UI for audit logs.

## Tasks
1. Schema: add auditLogs table + indexes.
2. Utility: auditLog() helper.
3. Implement templates:saveDraft.
4. Implement templates:publish (reuse validation before snapshot).
5. Implement templates:revertToVersion.
6. Patch responses submit to log 'submit'.
7. Patch export functions to log 'export'.
8. Add audit queries.
9. README section update.
10. Validate + adjust tests (skip heavy UI tests until reinstated later).

## Risks / Mitigation
- Race on version increment: perform in a single server-side transaction (Convex mutation sequentiality suffices if done in single mutation call).
- Log volume: Keep summary short; future archiving out of scope.

