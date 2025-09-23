# Backend Test Strategy (Convex)

Scope: Templates lifecycle, Responses submission, RBAC, Audit logging.

## Layers
1. Unit (Pure helpers)
   - Validation rule compilation & evaluation with sample templates.
   - Slug generation / normalization.
   - Audit summary formatting.

2. Convex Function Unit-ish (Using Convex testing harness / mocks)
   - publishTemplateVersion: creates version row, bumps template.latestVersion, writes audit log.
   - revertTemplateVersion: restores body, writes audit log.
   - submitResponse: rejects invalid answers (field + cross-field), persists submitted status.
   - RBAC: assertTemplateRole denies unauthorized roles.

3. Integration (Optional / gated by RUN_HEAVY)
   - Full flow: createTemplate -> saveTemplateDraft -> publishTemplateVersion -> submitResponse -> listResponsesByTemplateVersion -> audit log sequence assertions.
   - Revert flow: publish v1, edit draft, publish v2, revert to v1, ensure template.body matches snapshot.

## Test Data Fixtures
- Minimal template with 2 required fields.
- Cross-field rule template (census >= sum of sub counts).
- Observation template for branching (future).

## Tooling
- Vitest + in-memory mocks for rule evaluation.
- Potential Convex local test harness (if added) else simulate via calling functions with stub ctx (wrap db operations using a lightweight adapter or use convex browser client against dev deployment with ephemeral data — flagged as HEAVY).

## Naming Conventions
- File per function group: `templates.test.ts`, `responses.test.ts`, `rbac.test.ts`, `audit.test.ts`.
- Heavy flows: `flows.heavy.test.ts` (skip unless RUN_HEAVY env is truthy).

## Assertions
- Structural: presence of inserted rows, index sortable order.
- RBAC: expect throws with message 'Forbidden' or 'Unauthenticated'.
- Validation: error object includes fieldErrors keys.
- Idempotency: publishing twice increments version sequentially.

## CI Considerations
- Default pipeline: run unit + function tests only.
- Optional job: heavy integration (cron nightly or manual dispatch).
- Coverage thresholds introduced after performance review.

## Open Items
- Need a light wrapper to fabricate ctx.auth + ctx.db for isolated function tests.
- Decide on snapshot retention policy for large bodies (maybe hash comparisons later).

---
Generated initial strategy; refine after first implementation of lifecycle functions.
