# RQ-009 Plan: RBAC & Clerk Integration

## Goal
Enforce role-based access across template authoring, publishing, and responding while integrating Clerk identities and preserving dev auth shim behavior locally.

## Roles (Initial Set)
- admin: Full access (manage users, templates, publish, view all responses)
- author: Create/edit templates, publish new versions
- reviewer: View submitted responses, export analytics (future RQ-011)
- responder: Submit responses only

## Data Model Additions
1. users (existing) -> augment with role(s) array (string[])
2. teams (future) and team_membership (defer if not required immediately) for scoping templates/responses.
3. templates: add createdByUserId (convex user identity subject) if not already captured; enforce only author/admin can create/publish.

## Authorization Checks
- createTemplate / publishVersion: require role in {admin, author}
- saveDraft / submitResponse: require role in {admin, responder}
- listTemplates: all authenticated roles
- listResponsesByTemplate: roles {admin, reviewer, author} (author can view for iteration)

## Clerk Integration
- Client: When not in dev auth mode, use Clerk provider (existing). Acquire Clerk JWT (with roles claim) to send to Convex.
- Server: Derive roles from user record in Convex (source of truth) rather than trusting client token roles claim.

## Migration Strategy
- Add roles field to users table (string[]). Backfill existing with ['admin'] for first local user or default ['responder'].

## Implementation Steps
1. Schema: Modify `server/schema.ts` to add roles: v.array(v.string()).
2. Utility: `server/shared/auth.ts` with helper `requireRole(ctx, allowedRoles)` reading identity + fetching user doc.
3. Update template & response functions to call `requireRole` at head.
4. Add tests (if feasible) or placeholder docs verifying role enforcement logic.
5. Update TASKS.md with subtasks & mark progress.

## Edge Cases
- Unauthenticated: Immediately reject with 401-like error.
- User without roles field: default to [] (denied) until set.

## Future Considerations
- Team scoping for templates/responses (RQ extension) using separate tables and filtering on queries.
- Granular per-template ACL if needed.

