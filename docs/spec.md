# Specification-Driven Development

- `/spec` contains requirement files (e.g., `RQ-001-theme.md`).
- Each requirement has:
  - **Intent**: why it matters
  - **Acceptance Criteria**: how to verify
  - **Traceability**: linked tests and stories

The AI agent should **anchor implementation to spec**.

## Template Normalization (Raw Array -> Schema Object)

We store authoring bodies as a raw top-level array with lowercase keys. External schema expects `{ "Questions": [ ... ] }` and capitalized keys. A normalization layer (`wrapQuestions`) maps, injects defaults, and preserves additional fields like `ValueMode` until a regenerated stricter schema replaces the legacy one.

Guarantees:
- Non-destructive (original array untouched)
- Idempotent (normalizing normalized input has no diff)
- Extensible (runtime patched schema adds `ValueMode` temporarily)

See tests: `normalization.test.ts`, `schema-validation.test.ts`.
