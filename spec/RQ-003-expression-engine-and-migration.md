# RQ-003: Expression engine and migration

Intent:
Adopt a sandboxed expression engine (JSONLogic) for enableIf and customValidations, and provide a migration tool for existing JS-like expressions. [file:7]

Decisions:

- Do not eval raw JS; compile or transform to JSONLogic at publish-time and validate server-side and client-side with the same rules. [file:7]
- Provide a minimal migration CLI that flags manual review when patterns exceed the supported subset. [file:7]

Acceptance Criteria:

- Expressions like "$sibr_occurred && $sibr_occurred[0] === 1" and "$patient_census >= ($bedside || 0) + ($hallway || 0)" are converted and evaluated deterministically. [file:7]
- Unit tests cover array indexing, numeric comparisons, boolean conjunctions, and arithmetic across variables. [file:7]

Deliverables:

- scripts/migrate-expressions.ts with tests and documentation. [file:7]

Dependencies:

- RQ-002 Schema and types. [file:7]
