# RQ-026: Branching Logic

Intent:
Enable conditional navigation and skipping sections based on prior answers.

Decisions (Draft):
- Extend enableIf to section-level gating.
- Introduce jump logic: question metadata `nextId` expression (optional) evaluating to next question id.

Acceptance Criteria:
- Author can define branch causing a mid-form skip.
- Renderer executes branch without rendering skipped questions.
- Skipped answers removed from submission payload.

Dependencies:
- RQ-003 expression engine, RQ-006 renderer.

Open Questions:
- Back navigation and preserving hidden answers? (Likely clear.)
