# RQ-006: Form renderer (runtime)

Intent:
Render published templates into interactive forms, maintaining answers map and hierarchical payload, with reactive enableIf logic. [file:7]

Decisions:

- Maintain two synchronized states: answers map keyed by variable and payload shaped like the template tree. [file:7]
- Clear hidden dependent answers when enableIf turns false to avoid stale submission. [file:7]

Acceptance Criteria:

- Renders the SIBR observation and both surveys with live conditional reveal when "Did SIBR occur?" changes. [file:7][file:3][file:8]
- Matches the runtime flow shown in screenshots for initial and expanded states. [file:7]

Deliverables:

- src/features/responses/renderer with atomic field components and container handling. [file:7]

Dependencies:

- RQ-003 Expression engine. [file:7]
