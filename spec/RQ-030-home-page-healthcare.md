# RQ-030: Healthcare Survey SaaS Home Page

Intent:
Provide a production-ready landing + application home page for a healthcare-focused survey SaaS that (a) clearly communicates product value (clinical quality + operational improvement via structured surveys & observations), (b) lists available surveys a signed-in user can start/continue, and (c) exposes authentication (login / signup) that morphs into a compact user profile/account area once authenticated.

Problem / Rationale:
Current `Home` page is a starter scaffold with demo validation. It does not:

- Convey domain value (care quality, readiness, regulatory compliance, patient experience, staff observation workflows).
- Surface available surveys directly (requires respondent route knowledge).
- Offer obvious auth entry (Clerk or DevAuth) and post-login identity context / navigation.
- Provide quick resume of in-progress (draft) responses.
  Missing these reduces credibility for pilot users and slows user testing feedback loops.

Scope:
In-scope:

- Replace existing starter content in `Home.tsx` with new layout.
- Public (unauthenticated) view: marketing-style hero + key value bullets + CTA (Sign up / Log in) + public listing (or teaser) of a subset of published surveys (title + short description + start button which triggers auth if not signed in).
- Authenticated view: dashboard-style panel showing:
  - Available Surveys (all published templates listing, sorted by recently updated or curated order).
  - My Drafts (responses in draft state with last updated timestamp; click to resume form).
  - Recently Submitted (last 5 submissions with status / submitted date).
  - Profile dropdown / panel (name, email, sign out, link to manage profile if Clerk provides portal).
- Unified survey start flow: If not signed in and user clicks Start, prompt auth then redirect back to selected survey form.
- Mobile responsive layout (stacked sections) and desktop layout (2-column or cards grid).
- Light/dark theme compatibility (leveraging existing theming RQ-001).
- Accessibility (headers, nav landmarks, focus states) baseline per RQ-021.
- Analytics hooks placeholders (data attributes or function calls) for future RQ-011 tracking.

Out-of-scope (future RQs or existing ones):

- Advanced personalization (recommendations).
- Role-based admin widgets (belongs to review/analytics dashboards).
- Deep theming beyond existing design tokens.
- Localization (RQ-023 will extend).

User Stories:

1. As an unauthenticated clinician, I see a clear product value statement and can start sign-up.
2. As an authenticated respondent, I can view all available surveys and begin one immediately.
3. As a returning respondent, I can resume an in-progress draft from the home page in ≤2 clicks.
4. As a respondent, I can verify my identity context (name/email/avatar) and sign out easily.
5. As a product owner, I can validate that hero messaging and survey list render without backend errors in environments with 0, 1, or many templates.
6. As an accessibility reviewer, I can navigate the page with a keyboard and screen reader landmarks.

Acceptance Criteria:

- Home page auto-detects auth state via ClerkProvider or DevAuth and conditionally renders the correct variant without flicker.
- Public variant shows: hero (headline + subtext), 3–5 value bullets, primary CTA button, and either a curated list (max 5) of published surveys or a message if none exist.
- Authenticated variant shows three sections: Available Surveys, My Drafts (only if ≥1), Recently Submitted (only if ≥1). Empty states use concise informative copy.
- Clicking Start on a survey navigates to `/respondent/:id` (post-auth redirect supported if login required).
- Draft list entries navigate to existing respondent form restoring stored answers.
- All interactive elements have visible focus styles and accessible names.
- Page passes existing linting, type checks, and basic AXE scan (manual or placeholder TODO comment if automation not yet integrated).
- Unit test or integration test asserts conditional rendering of public vs authenticated variants and presence of survey titles from mock query hook.

Technical Design Notes:

- Introduce a `useHomeData` hook aggregating:
  - `templates.listForRespondent` (published templates)
  - `responses.listDraftsForUser` (NEW lightweight query returning {\_id, templateId, updatedAt, templateTitle})
  - `responses.listRecentSubmissionsForUser` (NEW query returning last N submitted responses with { \_id, templateId, submittedAt, templateTitle })
- Add two Convex queries (drafts + recent submissions) with appropriate indices (by userId, updatedAt / submittedAt desc).
- Extend existing responses schema if indexes missing.
- Add route-preserving login: when unauthenticated Start clicked, store intended templateId (e.g. in sessionStorage `intendedTemplate`) and after auth & upsert bridge, redirect to `/respondent/:id` if present.
- Component Structure:
  - `HomePagePublic` (hero + teaser list)
  - `HomePageDashboard` (sections as cards)
  - `SurveyList` shared (grid/list responsive)
  - `DraftList`, `RecentSubmissionsList`
  - `ProfileMenu` (Clerk user button if available; fallback minimal dropdown in DevAuth)
- Styling: reuse Tailwind utilities; ensure dark class variants.
- Testing: Vitest + React Testing Library for conditional render + Start button redirect logic (mock auth context, mock data hooks).

Dependencies:

- RQ-001 (theming), RQ-008 (responses API baseline), RQ-009 (auth), RQ-025 (autosave drafts), RQ-021 (accessibility), RQ-011 (analytics placeholders), RQ-017 respondent flow.

Risks / Mitigations:

- No drafts or submissions: Provide graceful empty states ("You have no in-progress surveys" etc.).
- Large template list: Paginate or clamp to first 25 with TODO marker for pagination RQ.
- Flicker on auth detection: Use skeleton placeholders until auth state resolved.

Instrumentation Placeholders:

- data-attr: `data-analytics="home-hero-cta|start-survey|resume-draft|open-profile"` for future tracking.

Definition of Done:

- Spec merged (this file).
- Backend queries implemented & indexed.
- Frontend components implemented with tests passing.
- Lint/type check clean.
- Manual smoke: public → login → redirected to survey works.

Open Questions (leave TODOs if deferred):

- Should we include organization/team selector on home? (Defer until RBAC + teams RQ.)
- Should Recently Submitted show status badges (accepted/rejected)? (Defer until response review workflow matures.)
