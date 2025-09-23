# Survey Platform: Spec + Schemas

This workspace contains the canonical Survey and Observation Template and Response JSON Schemas, TypeScript interfaces, and CLI scripts aligned to the observation and surveys.

## Commands (pnpm)

pnpm install

# Validate templates (AJV)

pnpm run validate

# Migrate legacy expressions (demo adapter)

pnpm run migrate

# Create a distributable archive of the spec

pnpm run zip

---

# DEPRECATED:React Starter Project

This is a minimal opinionated frontend starter using Vite, React, TypeScript, Tailwind, Storybook, Vitest and Playwright. It's designed to be forked and used as the base for a new app.

Quickstart

- Install Node.js 18 LTS (or use the version in `.nvmrc`).
- Install `pnpm` globally: `npm install -g pnpm`.
- Install dependencies: `pnpm install`.
- Start dev server: `pnpm dev` and visit `http://localhost:3000`.

Common scripts

```
pnpm dev             # Start Vite dev server
pnpm build           # Build for production
pnpm verify          # Typecheck, lint, and run unit tests
pnpm test            # Run unit tests
pnpm test:coverage   # Run tests and generate coverage
pnpm test:e2e        # Run Playwright end-to-end tests
pnpm storybook       # Start Storybook
```

What you get

- Pre-configured Vite + React + TypeScript setup.
- Tailwind CSS with dark mode (class strategy).
- Storybook for component-driven development.
- Vitest for unit tests and Playwright for e2e.
- CI workflows, dependabot, and release drafting pre-configured.

How to use this starter

1. Fork this repository and rename the repo for your project.
2. Update `package.json` name and `README.md` to match your project.
3. Replace this home page at `src/pages/Home.tsx` with your app shell.
4. Remove any example or starter-only files (e.g., `.local-dev.json`).

---

## RBAC (Roles Based Access Control)

Role enforcement (RQ-009) is implemented on the Convex server:

- Templates: creation & publishing require `admin` or `author`.
- Responses: drafting & submission require `admin`, `author`, or `responder`.
- Admin utilities (role bootstrap) require `admin`.

User documents now include `roles: string[]` with a `by_email` index. A helper `requireRole` in `server/shared/auth.ts` enforces allowed roles inside mutations/queries.

To bootstrap roles in development run the `bootstrapRoles` mutation (see `docs/rbac.md` for example usage). Frontend gating hook `useHasRole` is currently a stub (always true) pending integration with the real auth provider.

See `docs/rbac.md` for full details and next-step enhancements.

---

## Analytics & Exports (RQ-011)

Convex functions provide raw and aggregated exports for submitted responses:

- `exports:getRawResponses` → `{ header: string[], rows: any[][] }`
- `exports:getAggregates` → summary object (numeric + choice stats)
- `exports:downloadCsv` (mode `raw|aggregate`) → CSV string

Arguments: `templateId`, optional `from`/`to` (epoch ms). Role required: `admin` or `author`.

CSV format: stable header (`responseId,templateId,templateVersion,submittedAt,...variables`) with variables sorted. Values quoted per RFC4180 when needed.

Example (client pseudo-code):
```ts
const csv = await convex.mutation('exports:downloadCsv', { templateId, mode: 'raw' });
downloadFile(csv, 'responses.csv');
```

See `docs/rq-011-plan.md` for design details.

---

## Developer Experience & CI (RQ-013)

Status: Initial pass implemented (pre-commit, validate script, CI + release workflow skeleton).

Badges (to add after first CI run):
```
![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/ORG/REPO/actions/workflows/release.yml/badge.svg)
```

Key scripts:
```
pnpm validate      # Typecheck, lint, unit tests (gate in CI)
pnpm typecheck     # Fast TS only (used in pre-commit)
pnpm lint          # ESLint across src
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # Playwright end-to-end tests
```

Pre-commit hook runs:
1. `lint-staged` (ESLint --fix + Prettier on staged files)
2. `pnpm typecheck` (fast noEmit)

CI Workflow (.github/workflows/ci.yml):
- Triggers on push/PR to `main`.
- Installs deps (`pnpm install --frozen-lockfile`).
- Runs `pnpm validate` then coverage + Playwright e2e.
- Uploads coverage artifact.

Release Workflow (.github/workflows/release.yml):
- Triggered by pushing a tag `v*`.
- Builds project and generates placeholder release notes.
- Publishes a GitHub Release (future: integrate semantic-release for automated versioning & changelog generation).

Next Improvements (planned):
- Semantic-release integration.
- Coverage badge generation.
- Danger or similar PR metadata checks.
- Caching Playwright browsers between runs.

See `docs/rq-013-plan.md` for full plan & acceptance criteria.

---

## Audit & Versioning (RQ-014)

Implemented immutable template version snapshots and audit logging.

Data additions:
- `templateVersions` already stores versioned bodies; new `auditLogs` table records actions.
- `auditLogs` fields: `entityType`, `entityId`, `action`, `actorId`, `timestamp`, `version?`, `summary`.

Actions logged:
- `publish` (initial + subsequent publishes, including reverts)
- `edit` (draft save - metadata only)
- `submit` (placeholder: to be integrated in response submission flow later)
- `export` (CSV exports raw/aggregate)

Functions added:
- Template: `templates:saveDraft`, `templates:publish`, `templates:revertToVersion`.
- Audit queries: `audit:getByEntity`, `audit:getRecent`.
- Exports now log `export` actions.

Revert flow:
- Creates a new version copied from prior body (`revert from vX -> vY`).
- Historic responses preserve original `templateVersion` links.

Future enhancements (not in scope now):
- Inline diffs between versions.
- UI listing & filtering full audit history.
- Response submission logging hook.

---

## Seed Fixtures (RQ-015)

Three canonical example templates (surveys/observation) live under `spec/examples/templates`. They are treated as source-of-truth JSON question arrays (some lack full template envelope).

Seeding inserts them (if missing) into the Convex `templates` table:

```
pnpm seed            # calls seeds:ensureExamples mutation
```

Behavior:
- Wraps bare question arrays into a template `{ title, type: 'survey', version: '1', body }`.
- Skips any whose `title` already exists (idempotent).
- Performs lightweight structural validation (array + each question has a `type`).

Next (optional) enhancements:
- Full AJV validation against `template.schema.json` before insert.
- Hash-based change detection & version bump automation.

Storybook integration: fixture-based runtime rendering stories live in `TemplateRenderer.stories.tsx`.

---

## Testing & Stories Expansion (RQ-010 / RQ-007 synergy)

Current coverage:
- Unit: expression migration, validation engine (rules + cross-field), runtime visibility, hook behaviors.
- Runtime Renderer: visibility + answer clearing tests.
- Stories: Template editor (basic), runtime renderer (fixtures, validation states, visibility toggle).

Planned RQ-010 increments:
- Add Storybook stories for every question type with error states (invalid required, length, numeric range, multi-choice min/max).
- Add cross-field validation scenario story (census >= bedside + hallway) with failing & passing toggles.
- Playwright flows: Yes/No path through SIBR template; export CSV smoke.
- Snapshot (or DOM assertion) tests derived from stories for critical states (optionally via Storybook test runner).
- Heavy test gating (`RUN_HEAVY=1`) already implemented for legacy placeholders; extend to long-running Playwright flows in CI matrix.

Command matrix (updated):
```
pnpm test:fast   # Core unit subset (NO_COVERAGE)
pnpm test:ci     # Full unit set (single worker, memory safe)
pnpm test:heavy  # Includes heavy-gated legacy / longer scenarios
pnpm storybook  # Storybook dev
pnpm seed       # Insert example templates into Convex
```

Quality gates roadmap:
- Enforce zero skipped tests (except RUN_HEAVY gated) before release tagging.
- Add coverage thresholds after performance tuning.

