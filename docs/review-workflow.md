# Review Workflow (RQ-016)

This document describes the response review workflow, data model changes, allowed status transitions, RBAC rules, and audit log mappings.

## Overview
Clinicians (users with `reviewer` or `admin` role for the template's team) can:
- View lists of responses filtered by `reviewStatus`.
- Add review notes (append-only) optionally changing status.
- Change review status directly.

Statuses:
- `unreviewed`: Default when a response is first submitted.
- `in_review`: Intermediate state while being actively triaged.
- `reviewed`: Final state signifying completion.

Allowed transitions:
- `unreviewed -> in_review`
- `unreviewed -> reviewed`
- `in_review -> reviewed`
(No backward transitions; notes may still be added without changing status.)

## Data Model Additions
`responses` table fields:
- `reviewStatus: 'unreviewed' | 'in_review' | 'reviewed'`
- `lastReviewedAt?: number`
- `lastReviewedBy?: Id<'users'>`
- `reviewNoteCount: number`

`responseReviews` table (append-only thread):
- `responseId: Id<'responses'>`
- `createdAt: number`
- `createdBy: Id<'users'>`
- `note?: string`
- `statusAfter?: ReviewStatus`
Index: `by_response` (responseId)

Additional index on `responses`: `by_template_reviewStatus` (templateId, reviewStatus) for filtered lists.

## Functions
- `addResponseReviewNote(responseId, note?, statusAfter?)`
  - Validates optional status transition, inserts review note row, patches counters & denormalized fields, writes audit log.
- `setResponseReviewStatus(responseId, status)`
  - Direct status change (with validation), inserts status change note row, patches denormalized fields, audit log.
- `listReviewedResponses(templateId, status?, limit?)`
  - Lists responses by template + status (default `unreviewed`).
- `getResponseWithReviews(responseId)`
  - Returns response and full ordered note thread.

## RBAC
Reviewer capabilities require one of: `admin`, `reviewer` on the template's team membership (or platform roles if global). Read-only list/detail also allows `publisher` and `editor` but only `admin|reviewer` may mutate.

## Audit Logging
Each mutation emits an audit log via `internal.audit.logAudit`:
- Action `review_note_add`: Adding a note without status change. Meta: `{ noteLength }`.
- Action `review_status_change`: Status transition (with or without note). Summary includes `status prev -> next`.

These records enable chronological traceability and later analytics.

## Frontend Components
Implemented components:
- `ReviewStatusBadge` – Visual status indicator.
- `ResponseReviewList` – Displays a selectable list of responses with status + metadata.
- `ResponseReviewDetail` – Shows response meta, notes thread, add-note + status change form.

## Storybook Coverage
Stories included:
- Status badge variations.
- List state with multiple statuses.
- Detail panel with mock notes.

## Testing (Backend)
Covered separately (transition validation, forbidden access, audit emission). Frontend story interactions remain manual until Playwright scenarios are added.

## Future Enhancements
- Inline diff of answer changes between review notes.
- Reviewer assignment / ownership.
- Notifications on status change.
- Filtering by reviewer or date range.

## User Testing Prep Additions (2025-09-21)

### Template Selection
Review dashboard now wrapped in a template selector (`TemplateSelector`) allowing switching templates without reload.

### Demo Data Seeding
Action: `templates.seedDemoData` creates sample templates and responses across all statuses with at least one note for reviewed items.

### Pagination & Filtering
New query: `reviews.listResponsesPaginated` (preferred over legacy `listReviewedResponses`).
Args: `templateId`, optional `status`, optional `cursor` (createdAt timestamp), `limit` (default 20, capped 100). Returns `{ items, nextCursor, hasMore }`.
Hook `useResponseList` implements accumulation + `loadMore` and distinguishes `isLoading` vs `isLoadingMore`.

### UI States & Feedback
- Initial skeleton placeholders replace plain "Loading" text.
- Empty response list shows clear message.
- "Load more" button for pagination.
- Toast notifications (via `ToastProvider`) on mutation errors.

### Role Switcher (Dev Only)
`DevAuthProvider` exposes a role dropdown (admin/reviewer/author/responder) to simulate RBAC scenarios locally. Server still validates for reviewer/admin on mutations.

### Transition Tests
`useReviews.transitions.test.ts` covers allowed/blocked status transitions referencing `canTransition` helper.

### Next Steps Post-Testing
- Enforce real user role membership server-side.
- Advanced filters (date ranges, submitter, reviewer).
- Search across notes.
- Export pipelines for reviewed responses.

