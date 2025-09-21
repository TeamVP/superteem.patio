# RQ-022: Performance Optimizations

Intent:
Improve runtime efficiency for large templates and complex conditional logic.

Decisions (Draft):
- Memoize parsed expressions and compiled enableIf trees.
- Incremental validation: recompute only affected questions.
- Virtualize long question lists.

Acceptance Criteria:
- Rendering 500-question template initial load < 2s (desktop dev hardware).
- Typing latency <= 50ms for typical question edits.
- Memory usage stable after repeated navigation (no leaks).

Dependencies:
- RQ-003 expression engine, RQ-006 renderer.

Open Questions:
- Web worker offloading for heavy parsing? (Future.)
