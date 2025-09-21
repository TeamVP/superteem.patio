# RBAC Overview (RQ-009)

## Roles
- admin: Full access; can manage roles and all data.
- author: Create and publish templates; submit responses.
- reviewer: (Future) Read templates and submitted responses for QA / review.
- responder: Submit responses only.

## Storage
User roles stored in `users.roles: string[]` (Convex `users` table) with `by_email` index.

## Enforcement Points
- Templates: `createTemplate`, `publishVersion` require `admin|author`.
- Responses: `saveDraft`, `submitResponse` require `admin|author|responder`.
- Admin Utilities: `bootstrapRoles` mutation requires `admin`.

## Helper
`server/shared/auth.ts` exports:
- `requireRole(ctx, allowedRoles)` throws `Error('Forbidden')` when disallowed.
- `getUserWithRoles(db, email)` fetches user by email.
- `optionalUser(ctx)` returns user doc or null.

## Bootstrapping Roles
Use the `bootstrapRoles` mutation to seed/update user roles during development.
Example call (via Convex client or dashboard):
```ts
await convex.mutation('admin:bootstrapRoles', {
  assignments: [
    { email: 'alice@example.com', roles: ['admin'] },
    { email: 'bob@example.com', roles: ['author'] },
    { email: 'cara@example.com', roles: ['responder'] },
  ],
});
```
If a user doc does not exist it will be created with `name` derived from the email local-part.

## Frontend Gating
Temporary hook `useHasRole` always returns true in dev; will integrate real auth provider to hide UI for unauthorized actions (create/publish, response submission flows remain server-enforced).

## Next Steps
- Integrate Clerk-provided roles or team-based claims.
- Add reviewer read-only gating.
- Expand tests for negative (forbidden) scenarios.
- Replace loose types with generated Convex types.
