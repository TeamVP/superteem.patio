# RQ-010: Testing & Quality Plan

## Goals
Establish consistent quality gates: type safety, lint cleanliness, unit + integration coverage, visual review (Storybook), and basic E2E flows.

## Scope
- Unit tests: validation engine edge cases, expression evaluator, RBAC enforcement negative paths.
- Component tests/stories: All question types, error states (RQ-007), dark/light theme (RQ-001 tie-in).
- E2E: Create template, publish, draft response, submit response (happy path + validation failure path).
- CI script consolidation: single `pnpm verify` command.

## Tasks
1. (Done) Ensure `pnpm verify` exists (package.json confirmed).
2. (Done) Storybook stories: RoleGuard + error state examples (FormField/NumberField).
3. (Done) RBAC negative unit tests.
4. (Done) Playwright validation blocking + placeholder happy path.
5. (Done) Coverage thresholds in Vitest config.
6. (Done) Testing checklist doc.
7. (Done) Add error state stories for validation (RQ-007 tie-in).
8. (Done) Add validation failure Playwright spec.

## Acceptance Criteria
- `pnpm verify` exits 0 locally when code passes.
- Failing RBAC access (no roles) surfaces Forbidden error in unit tests.
- Storybook shows error state stories for at least 2 representative question types.
- Playwright test suite contains at least 2 specs (happy + block) and passes.
- Coverage report generated (`/coverage`).

## Stretch
- Visual regression via Storybook snapshots.
- Mutation testing experiment.
- Performance test for large template render.
- Coverage badge generation in README.
