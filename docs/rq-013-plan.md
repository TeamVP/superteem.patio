# RQ-013: Developer Experience & CI Plan

## Goals
Reliable, fast feedback loops (pre-commit, local scripts) and CI pipelines enforcing schema validity, tests, linting, and producing release artifacts.

## Scope
- pnpm scripts consolidation (`validate` combining schema + type + unit tests)
- Husky pre-commit hook: lint + typecheck fast path
- CI workflow: install deps (pnpm), run validate, run e2e (Playwright), collect coverage
- Release automation: version tagging, CHANGELOG update (placeholder logic until semantic release integration)

## Tasks
1. Ensure `pnpm validate` script exists (if not, add) -> run schema validation + unit tests.
2. Add `scripts/validate-response.ts` invocation to validate sample responses (future extension).
3. Add Husky & lint-staged config (if not already) for formatting + lint + typecheck on staged files.
4. Create/update GitHub Actions workflow `.github/workflows/ci.yml` with: checkout, setup pnpm cache, install, validate, test:e2e, upload coverage artifact.
5. Add placeholder release workflow `.github/workflows/release.yml` triggered on tag creation.
6. Add simple CHANGELOG append script (if not already maintained) or note manual step.
7. Update README with CI badges (placeholder) and dev workflow summary.

## Acceptance Criteria
- PR fails if schema invalid or tests fail.
- Pre-commit prevents committing lint errors.
- Coverage artifact visible in CI run.
- Tag push triggers release workflow skeleton.

## Stretch
- Add semantic-release for automated versioning.
- Cache Playwright browsers.
- Add Danger.js or similar PR linting.
