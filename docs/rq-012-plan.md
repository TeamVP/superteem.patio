# RQ-012: UI Components & Theme Integration Plan

## Goals
Unify form and interactive components under a token-driven theme (light/dark) with Storybook verification and zero hard-coded color values inside component source.

## Scope
- Core components: Button (existing), Input, Select, Toggle (theme), Alert, Badge.
- Form primitives: Field wrapper (existing FormField) updated to token classes.
- Dark mode responsiveness for each component story.
- Storybook theming: global decorator toggling theme via data attribute or class (`dark`).

## Tokens (Tailwind)
Use Tailwind config to expose semantic colors:
- `--color-bg`, `--color-bg-muted`, `--color-fg`, `--color-fg-muted`
- `--color-border`, `--color-primary`, `--color-primary-hover`, `--color-danger`
Map to Tailwind utilities via CSS variables in `globals.css` with dark overrides.

## Tasks
1. Define CSS variables for semantic tokens (light & dark) in `globals.css`.
2. Refactor existing `Button` to use semantic classes (no direct hex).
3. Implement `Input` component (text) with focus and error states.
4. Implement `Select` component.
5. Implement `Toggle` (theme switch) reusing existing theme hook for state.
6. Implement `Alert` (info, success, warning, danger variants).
7. Implement `Badge` (neutral, info, success). 
8. Update `FormField` to remove direct color classes (`text-red-600` replaced with token-driven utility if needed).
9. Storybook stories for all components in light and dark.
10. Minimal tests: render + variant snapshot/role assertions.
11. README update (UI kit section) + token reference table.

## Acceptance Criteria
- No hard-coded color classes beyond token utility mapping (e.g., `text-red-600` eliminated in favor of tokens).
- Components visually adapt when toggling theme (Storybook docs page demonstrates switch).
- Button, Input, Select, Toggle, Alert, Badge all have examples for primary/disabled/error states.

## Stretch
- Add `Skeleton` loading component.
- Add `Tooltip` using headless pattern.
- Chromatic or visual regression integration.

## Deferral Note
Token implementation and component refactors are deferred temporarily to prioritize RQ-013 (Dev Experience & CI). Current styles remain functional; refactor will proceed when theme tokens are required for broader UI expansion.
