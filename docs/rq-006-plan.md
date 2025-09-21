# RQ-006 Runtime Plan

## State Model
- answers: Record<string, unknown> (keyed by question.variable sans leading $)
- payload: mirrors template.body recursively; list/composite produce nested objects/arrays
- visibility: derived per render pass using enableIf (default visible)

## Core Components
- TemplateRenderer: orchestrates traversal, holds answers state, exposes onChange
- Field components: StringField, IntegerField, MultipleChoiceField, UserField (stub), CompositeGroup, ListRepeater

## Expression Evaluation
- Use existing migrateExpression -> JSONLogic AST once at load time OR lazy compile
- Implement lightweight evaluator for subset in `runtime/eval.ts`
  - Supports ops: &&, ||, +, -, *, /, ==, >, <, >=, <=
  - var lookup: dotted path with optional .0 (array[0])

## Visibility Logic
- evaluate enableIf if present else true
- When a field transitions from visible -> hidden, clear:
  - its variable answer
  - nested variables for composite/list

## Clearing Strategy
- Track previous visibility map; on each evaluation pass compute diff

## Rendering Flow
1. Compile enableIf expressions to JSONLogic
2. Evaluate visibility each render (memoizing previous answers snapshot)
3. Render visible questions; for hidden ones skip

## Tests
- Toggle controlling question hides dependent -> dependent answer cleared
- Arithmetic/comparison in enableIf reflect updates

## Incremental Steps
1. Evaluator + compile helper
2. TemplateRenderer with simple linear rendering
3. Add field components
4. Visibility + clearing
5. Tests
