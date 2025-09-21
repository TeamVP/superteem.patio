# RQ-016: Review UI for Submitted Responses

Intent:
Provide clinicians a workspace to view submitted responses, add internal review comments, and mark a response as reviewed.

Decisions (Initial Draft):
- Add `reviewStatus` (unreviewed|in_review|reviewed) and optional `reviewNotes` array to responses or a separate `responseReviews` table to preserve audit history.
- Display chronological answer view with highlight for validation flags.
- Inline comment threads per question (future iteration) vs single overall note (MVP).

Acceptance Criteria (MVP):
- List of submitted responses filterable by template and date range.
- Detail view shows answers with timestamps and submitter.
- Reviewer can add a note and set status to reviewed.
- Audit log entry created on status change.

Dependencies:
- RQ-008 Responses backend.
- RQ-014 Audit logging.

Open Questions:
- Should comments be immutable (append-only) for compliance? (Leaning yes.)
- Access control: restrict to team members with reviewer or admin role.
