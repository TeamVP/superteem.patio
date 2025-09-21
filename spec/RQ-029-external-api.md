# RQ-029: External API Endpoints

Intent:
Expose controlled API for external systems to query templates and submit responses programmatically.

Decisions (Draft):
- REST or minimal GraphQL layer mounted behind API keys with role scopes.
- Rate limiting per key.
- Separate audit log category for external calls.

Acceptance Criteria:
- Endpoint to list published templates (metadata only).
- Endpoint to fetch template JSON by id/version.
- Endpoint to submit a response (validated, audited).
- 429 on exceeding rate limits.

Dependencies:
- RQ-008 backend, RQ-009 RBAC, RQ-014 audit.

Open Questions:
- API key rotation strategy and UI.
