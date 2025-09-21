# RQ-011: Analytics & Exports Plan

## Goals
Provide raw and aggregated exports (CSV + JSON) for responses of a given template over a date range, enabling simple analysis without external ETL.

## Minimal Aggregations
- Total submitted responses
- Per multiple-choice variable: option counts + percentage
- Per integer variable: min, max, average, count
- Census-style composite (if variables prefixed e.g. `$census_`): sum per variable

## Functions (Convex)
- `exports:getRawResponses` (args: templateId, from?: number, to?: number) -> array of normalized rows
- `exports:getAggregates` (args: templateId, from?: number, to?: number) -> summary object
- `exports:downloadCsv` (args: templateId, from?: number, to?: number, mode: 'raw' | 'aggregate') -> string CSV

## Row Normalization
Each response becomes one row with columns:
`responseId, templateId, templateVersion, submittedAt, <variable columns...>`
Variables missing in a response are blank.

## CSV Rules
- RFC4180 style: comma separator, double-quote wrap when value contains comma/quote/newline, embedded quotes doubled.
- Header stable ordering: fixed leading columns followed by sorted variable names.

## Permissions
Reuse RBAC: require role `admin` or `author` (and later perhaps reviewer) for exports.

## Schema / Index Review
Existing `responses` table indexed by: `by_template_version (templateId, templateVersion)` and `by_submitter`.
Add index: `by_template_created (templateId, createdAt)` for ranged scans.

## UI
Simple admin panel area (placeholder) with form: templateId + date range → download buttons (CSV raw / CSV aggregate / JSON raw / JSON aggregate).

## Out of Scope
- Advanced filtering (team, user) now—can extend later.
- Streaming large exports (batching)—initial in-memory acceptable.

## Acceptance Criteria
- CSV opens cleanly in spreadsheet (stable headers, no malformed quoting).
- Aggregates reflect counts/averages for test dataset.
- Role gating enforced (forbidden if responder only).

## Next Steps
1. Add index.
2. Implement raw query + normalization.
3. Implement aggregates.
4. CSV util.
5. Download function (CSV) + reuse raw/agg.
6. UI + docs.
