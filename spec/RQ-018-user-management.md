# RQ-018: Admin User & Role Management UI

Intent:
Provide an admin console to view users, assign roles, and manage team membership leveraging Clerk data + application roles.

Decisions (Draft):
- Read users from Clerk API + local Convex roles array.
- Mutations to update roles/team linkage with audit entries.
- Bulk role assignment for onboarding.

Acceptance Criteria:
- List users with roles + teams.
- Edit panel to adjust roles and team membership.
- Change persists to Convex and audit log recorded.
- Role changes reflected in gated UI without reload.

Dependencies:
- RQ-009 RBAC base.
- RQ-014 Audit logging.

Open Questions:
- Pagination strategy for large directories.
- Invite flow vs auto-provision.
