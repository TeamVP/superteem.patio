# RQ-012: UI components and theme integration

Intent:
Align field components and form chrome with the theme system from RQ-001 using Tailwind and shadcn. [file:6]

Decisions:
- Reuse Button, Input, Select, Toggle, and Alert patterns; expose tokens via Tailwind config. [file:6]
- Provide dark/light toggling at app root with persistence. [file:6]

Acceptance Criteria:
- Buttons and form controls adopt theme colors and respond to dark mode, verified in Storybook. [file:6]
- No inline colors in components; all derive from tokens. [file:6]

Deliverables:
- Shared UI kit under src/components with stories and tests. [file:6]

Dependencies:
- RQ-001 Theme. [file:6]
