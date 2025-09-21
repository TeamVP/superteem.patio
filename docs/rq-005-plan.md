# RQ-005 Implementation Plan

## Objectives
Provide a JSON tab experience with:
- Read (current template) / Edit (pasted JSON)
- Schema validation using existing AJV validators
- Canonicalization (variable name normalization)
- Diff preview + confirm
- Variable reference safety (cannot remove question defining variable still referenced)

## Components / Structure
- `src/features/templates/json/JsonEditorPane.tsx`
  - Props: `template`, `onApply(Template)`
  - Internal state: raw text, parsedTemplate, validationErrors, diff, phase ('idle' | 'edited' | 'validated' | 'confirm')
- `src/features/templates/json/useTemplateDiff.ts`
  - Pure function returning structural diff summary: counts added/removed/changed questions (by id or variable), changed metadata (title, tags, version)

## Supporting Utilities
- `canonicalizeVariables(template: Template): Template`
  - Lowercase variable names (strip leading $, then re-add standardized `$` prefix)
  - Deduplicate by adjusting trailing numeric suffix if conflict
- `collectVariableProviders(template: Template): Map<string, string /*questionId*/>`
- `collectVariableReferences(template: Template): Set<string>` (from enableIf + customValidations)
- `validateVariableIntegrity(before, after)` returns list of orphaned refs

## Flow
1. User pastes JSON -> parse attempt
2. If parse OK -> run schema validation -> display issues (stay in edited phase if errors)
3. If valid -> canonicalize variables -> compute diff vs current -> show diff summary & orphan warnings (if any) -> require confirm
4. Confirm -> apply -> return to idle with updated baseline

## Diff Summary Model
```ts
interface TemplateDiffSummary {
  addedQuestions: number;
  removedQuestions: number;
  changedQuestions: number; // label/type/options modifications
  metadataChanges: string[]; // e.g., ['title','version']
  orphanedVariables: string[]; // blocking condition
}
```

## Blocking Rules
- If orphanedVariables length > 0, disable confirm

## Warnings & Notes
- If variable renamed (provider removed + new provider added), count as changed not orphaned
- Provide raw AJV errors list (path, message)

## Tests (to add later)
- Valid paste identical -> zero diff
- Invalid JSON -> parse error
- Schema invalid -> AJV errors surfaced
- Variable orphan detection
- Variable canonicalization (case & duplicate)
- Added/removed counts

## Incremental Delivery Order
1. Scaffold JsonEditorPane with parse + validation
2. Add diff util and summary display
3. Integrate variable canonicalization & orphan detection
4. Confirm flow + disabled confirm state
5. Tests

