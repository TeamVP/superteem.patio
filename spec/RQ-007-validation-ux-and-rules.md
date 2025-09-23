# RQ-007: Validation UX and rules

Intent:
Provide field-level and cross-field validation with clear inline error messages, mirroring the observation template rules. [file:7]

Decisions:
- Evaluate rules on change and on submit; surface errors on implicated fields and at a summary region. [file:7]
- Reuse server and client validators to prevent drift. [file:7]

Acceptance Criteria:
- Census must be >= bedside + hallway; errors appear on census and contributing integer fields exactly as shown in red states. [file:7]
- String lengths and multiple-choice min/max are enforced with helpful messages. [file:3][file:8]

Deliverables:
- Validation module and React error components with Storybook stories and Vitest tests. [file:7]

Dependencies:
- RQ-006 Renderer runtime. [file:7]
