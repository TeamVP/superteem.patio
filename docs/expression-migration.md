# Expression Migration

This document describes the supported JS-like expression subset and how it is migrated to JSONLogic.

## Supported Syntax
- Variables: `$identifier` (letters, digits, underscore) -> `{ var: 'identifier' }`
- Numeric literals: integers and decimals.
- Parentheses for grouping.
- Array zero index: `$var[0]` -> `{ var: 'var.0' }` (only index 0 supported).
- Operators:
  - Logical: `&&`, `||` (associative flattening applies)
  - Comparison: `==`, `===` (downgraded to `==` with warning), `>`, `<`, `>=`, `<=`
  - Arithmetic: `+`, `-`, `*`, `/` (associative flattening for `+`, `*`)

## Not Yet Supported
- Unary operators (`!`, unary `-`), ternary `?:`, string literals, boolean literals, function calls, non-zero indexes, object/array literals, nullish coalescing (`??`).

## Warnings
- `operator=== downgraded to ==` when `===` encountered.
- `fallback_pattern` (planned) when pattern like `($foo || 0)` is detected for potential nullish fallback.

## Failure Reasons
| Reason | When Triggered | Additional Issues Data |
|--------|-----------------|------------------------|
| `parse_error` | Generic parsing failure | none |
| `trailing_tokens` | Extra tokens after successful parse | none |
| `unsupported_operator` | Operator outside allowed set | one issue entry |
| `unsupported_index` | Any index other than `[0]` | one issue entry (pos) |
| `unexpected_character` | Character not matched by any token regex | one issue entry (pos) |

Each structured failure (non-`parse_error`) includes an `issues` array with `code`, `message`, and optional `pos`.

## Associative Flattening
`a && b && c` -> `{ "&&": [A, B, C] }` (same for `||`, `+`, `*`).

## Example
Input:
```
$patient_census >= ($bedside || 0) + ($hallway || 0)
```
Current Output:
```json
{
  "ok": true,
  "source": "$patient_census >= ($bedside || 0) + ($hallway || 0)",
  "ast": {
    ">=": [
      { "var": "patient_census" },
      { "+": [
        { "||": [{ "var": "bedside" }, 0] },
        { "||": [{ "var": "hallway" }, 0] }
      ] }
    ]
  },
  "warnings": []
}
```

A future normalization may replace `|| 0` fallback with a domain-specific handling or a different operator.

## CLI Usage
Run one or more expressions:
```bash
pnpm ts-node scripts/migrate-expressions.ts '$a + $b * $c'
```

## Testing
See `src/__tests__/expression-migration.test.ts` and `src/__tests__/expression-manual-review.test.ts`.
