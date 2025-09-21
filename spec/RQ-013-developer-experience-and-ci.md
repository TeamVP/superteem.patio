# RQ-013: Developer experience and CI

Intent:
Wire pnpm scripts, linting, formatting, schema validation, and release automation into the existing starter. [image:1]

Decisions:
- Add validate and migrate scripts, and pre-commit hooks for schema and type checks. [image:1]
- Ensure Playwright and Vitest run headless in CI with artifacts. [image:1]

Acceptance Criteria:
- pnpm run validate passes locally and in CI, and PRs block on schema/test failures. [image:1]
- Release workflow tags versions and publishes a changelog. [image:1]

Deliverables:
- Updated package.json scripts and CI workflow steps referencing pnpm. [image:1]

Dependencies:
- RQ-002, RQ-010. [image:1]
