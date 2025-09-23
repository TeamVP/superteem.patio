# RQ-005: Template JSON tab

Intent:
Enable safe view and edit of the full Template JSON with syntax highlighting, validation, and safe overwrite. [file:7]

Decisions:

- Use AJV on the client for preflight validation and present a diff before applying. [file:7]
- On paste, canonicalize variable names and block changes that orphan referenced variables. [file:7]

Acceptance Criteria:

- Copy JSON reproduces the current state; Paste JSON rejects if schema invalid or variables referenced by rules are missing. [file:7]
- All three example templates validate cleanly. [file:7][file:3][file:8]

Deliverables:

- JSON editor pane under src/features/templates/json with validation and diff view. [file:7]

Dependencies:

- RQ-002 Schema and types. [file:7]
