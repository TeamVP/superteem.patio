# RQ-017: Respondent Login & Submission Flow

Intent:
Enable real users to authenticate via Clerk + Convex, view a list of published templates (surveys/observations) they are authorized to complete, fill out a runtime form, save a draft, and submit a response that is version‑pinned and reviewable.

Why New RQ:
Existing RQs (008, 009, 006, 015, 016) cover fragments (persistence, auth intent, renderer intent, seeding, review) but do not stitch an end-to-end respondent experience required to start generating real data.

Scope (MVP):

- User authentication (Clerk) wired to Convex identity; user record upsert on first visit.
- Role + team resolution for the authenticated user (respondent role sufficient for submission; others may also submit if allowed).
- Listing endpoint + UI: fetch all published templates the user may submit (team-scoped or global) with basic metadata (title, type, last published version, team name).
- Runtime renderer invocation for selected template (uses RQ-006 mechanisms once implemented): shows fields, handles conditional logic, maintains answers + payload state.
- Draft save (create or patch) and final submit mutation (RQ-008) using proper templateVersion + validation; drafts limited to one active per template per user.
- Submission success leads to confirmation state and triggers audit log entry.
- Basic error surfaces: validation errors (field-level), auth/permission errors (banner), network & unknown errors (toast).

Out of Scope (Future):

- Multi-team selection UI, advanced filtering, localization, attachments, offline mode, complex enableIf expressions beyond current engine, analytics dashboards.

Decisions:

- Introduce `listPublishedTemplatesForUser` Convex query leveraging template status index and optional team membership join table.
- Upsert user on auth callback using Clerk identity fields (clerkId, email, name, imageUrl); maintain `lastSeenAt` timestamp.
- Respondent authorization rule: template is either team-less (global) or user is member of template.teamId via `users_teams` with any role (role gating for respondents may refine later).
- Keep renderer container minimal: optimistic local draft state; only persist on explicit Save Draft or Submit.
- Draft auto-create: first Save triggers `saveResponseDraft`; subsequent saves patch via that same mutation (already implemented idempotent upsert logic by template/version/submitter).
- Use existing `submitResponse` with structured INVALID_RESPONSE errors for field mapping.
- Provide simple in-memory form state; no Redux/Zustand needed for MVP.

Acceptance Criteria:

- An authenticated respondent sees a list with at least the seeded SIBR Observation + two surveys (when published) and can open one.
- Saving draft creates a response row with status=draft and updating the same template reuses it.
- Submitting a valid form creates a status=submitted response with templateVersion pinned; subsequent visits show no draft (unless new draft started).
- Invalid submission returns structured field errors displayed inline.
- Audit log entries exist for submission events.
- Unauthorized access (e.g., template from a team user not part of) yields error and hides template from list.

Dependencies:

- RQ-008 (responses mutations) – already partial.
- RQ-009 (auth & RBAC) – implement concrete wiring to Clerk now.
- RQ-006 (renderer) – form UI components.
- RQ-015 (seed templates) – ensure templates published for list.

Open Questions:

- Should drafts auto-save debounced vs manual? (MVP: manual button.)
- Need per-user rate limiting or spam protection? (Future.)
- Should we surface last submitted timestamp per template? (Future enhancement.)

Deliverables:

- New Convex functions: `users.upsertFromClerk`, `templates.listForRespondent` (alias of listPublishedTemplatesForUser), possibly `responses.getDraft` for prefill.
- Frontend: AuthProvider integration with Clerk, TemplateList page (respondent mode), FormPage (renderer + draft/save/submit controls), hooks for new queries.
- Seed script updates: create sample users (with respondent role), publish seeded templates.
- Tests: unit test listForRespondent filtering logic, submission draft-reuse; E2E path: login -> list -> draft save -> submit.

Risks / Mitigations:

- Missing renderer implementation blocks full submission: create temporary placeholder form (simple JSON-driven fields) if RQ-006 lags.
- Auth race (user record not yet created): upsert function must be idempotent and awaited before queries relying on user roles.
- Template publication state: ensure seed publishes at least one version; show empty state if none.

Verification Checklist:

- [ ] User record created on first authenticated load (inspect Convex dashboard / query).
- [ ] listForRespondent excludes templates from other teams.
- [ ] Draft save then submit produces exactly one submitted response (no duplicate drafts).
- [ ] Field error from forced invalid submission displays inline.
- [ ] Audit log row for submission appears.
