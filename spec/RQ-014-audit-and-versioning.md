# RQ-014: Audit and versioning

Intent:
Version templates on publish, keep immutable snapshots, and log authoring changes and submissions. [file:7]

Decisions:
- Store template_versions with diffable metadata and link responses to templateVersion. [file:7]
- Capture actor, timestamp, and change summary for edits and publishes. [file:5]

Acceptance Criteria:
- Reverting to a prior version preserves existing responses and re-renders correctly. [file:7]
- Audit log entries exist for edit, publish, submit, and export. [file:5]

Deliverables:
- Convex tables/functions and admin UI views. [file:5]

Dependencies:
- RQ-004, RQ-008. [file:7]
