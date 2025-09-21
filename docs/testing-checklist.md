# Testing Checklist (RQ-010)

## Automated
- Unit: validation engine (all rules), expression evaluator, RBAC requireRole (positive + negative).
- Component: Button, RoleGuard, (add error state stories), future question components.
- E2E: Happy path (publish + submit) TODO – current placeholder loads root.
- Coverage: Enforced thresholds (lines 70 / functions 70 / branches 60 / statements 70).

## Manual
- Create template with invalid rule -> validation error surfaced.
- Publish template increments version correctly.
- Draft save permits validation errors (server returns them).
- Submit blocks when errors present.
- RBAC: attempt restricted mutation without role (expect Forbidden) once real auth integrated.
- Dark/light theme toggle (when implemented RQ-001 integration).

## Pre-Commit Gate
Use `pnpm verify` for typecheck + lint + unit tests.
Run `pnpm test:e2e` locally before merging major UI changes.

## Future Enhancements
- Visual regression snapshots (Storybook + Chromatic / Playwright).
- Performance budget test for large templates.
- Mutation testing for validation logic.
