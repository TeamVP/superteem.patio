# RQ-009: Auth and RBAC

Intent:
Integrate Clerk and enforce roles for authoring, publishing, and responding, with team-scoped access. [file:5]

Decisions:
- Roles: Admin, Publisher, Editor, Respondent mapped to Clerk claims and teams. [file:5]
- Enforce role checks in UI and on Convex functions. [file:5]

Acceptance Criteria:
- Only Editors and Publishers can modify or publish templates; Respondents can submit observations for permitted teams. [file:5]
- Unauthorized operations return clear error messages. [file:5]

Deliverables:
- Auth context provider and server guards. [file:5]

Dependencies:
- RQ-008 Responses API. [file:5]
