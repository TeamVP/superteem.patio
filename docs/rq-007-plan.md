# RQ-007 Plan: Validation UX & Rules

## Scope
Add client-side validation covering:
- Field constraints: required, string length min/max, integer min/max, multi-choice min/max selection counts.
- Custom validation rules (template-provided) using existing expression migration/evaluator pipeline.
- Cross-field rule: census >= bedside + hallway (example from spec) with errors on all implicated fields + summary.

## Architecture
1. Validation Engine
   - Input: template `Question[]`, current `answers` map.
   - Output: `{ fieldErrors: Record<questionId, string[]>, formErrors: string[] }`.
   - Evaluate per-field built-ins first, then custom rules, then cross-field aggregates.
   - Use migrated JSONLogic AST for custom expressions; compile once similarly to enableIf.

2. Integration in `TemplateRenderer`
   - Maintain `errors` state keyed by question id.
   - Re-run validation on answer change & on explicit `validateAll()` (submit attempt).
   - Inline error rendering under each field.
   - Summary panel at top listing distinct messages (dedupe by message string).

3. Storybook
   - Stories: String length violation, Multi-choice min/max, Cross-field census failure, Custom rule failure.

4. Tests (Vitest)
   - Unit: length boundaries, numeric min/max, multi-choice selection counts.
   - Custom rule expression (e.g., `$a + $b == 10`).
   - Cross-field rule distributing identical message to all contributing questions.
   - Visibility interaction: hidden questions should not produce errors (unless previously visible & required? -> decision: ignore hidden in validation pass).

## Detailed Tasks
1. Add `validation` module: `src/features/responses/runtime/validate.ts`.
2. Define type: `ValidationResult` & per-field rule evaluation helpers.
3. Implement built-in validators for each question type.
4. Migrate & cache custom validation expressions on mount (mirroring enableIf compile pass).
5. Add cross-field rule implementation (hard-coded for now based on variable names? Provide utility placeholder for future config).
6. Update `TemplateRenderer` to invoke validator and display errors.
7. Add CSS utility classes (Tailwind) for error states (border-red-500 text-red-600).
8. Storybook stories.
9. Tests.
10. Update `TASKS.md` marking subtasks as complete as we proceed.

## Open Questions / Assumptions
- Required semantics: treat empty string, null, undefined as missing.
- Hidden required field: skip validation (common UX pattern) until visible.
- Multi-choice counts: if selection length < minimumResponses -> error, > maximumResponses -> error.
- Integer parsing: ensure numeric coerce already done; if NaN treat as missing.

## Future Enhancements (Out of Scope Now)
- Localized error messages.
- Async/server-side validation merge.
- Validation performance optimization via memoizing per-question results.

## Acceptance Mapping
- Field-level length/choice/range => Criteria 2.
- Cross-field census rule => Criteria 1.
- Summary + inline errors => Criteria (clear inline error messages + summary region).
- Reuse existing expression evaluator => decision alignment.

