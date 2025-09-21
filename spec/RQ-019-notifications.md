# RQ-019: Notifications & Reminders

Intent:
Notify stakeholders of new submissions and remind incomplete draft responders.

Decisions (Draft):
- Use webhooks/email provider (e.g. Resend or alternative) abstracted via a server action.
- Notification preferences per team (frequency / types).
- Daily digest for drafts older than threshold.

Acceptance Criteria:
- Email sent on new submitted response (team scoped) with link.
- Daily digest includes count + links (if enabled).
- Opt-out setting stored per user or team.

Dependencies:
- RQ-008 responses data.
- RQ-017 deployment (for production email domain).

Open Questions:
- Per-question flagged changes in notifications? (Later.)
- SMS support? (Defer.)
