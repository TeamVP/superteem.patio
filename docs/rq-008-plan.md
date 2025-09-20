# RQ-008 Plan: Convex Backend Integration

## Goals
Persist templates, template_versions, and responses with server-side validation and version linkage.

## Data Model (Convex Tables)
1. templates
   - name: string
   - latestVersion: number
   - createdBy: string
   - createdAt: number
   - type: string (survey | observation)
2. templateVersions
   - templateId: Id<"templates">
   - version: number
   - body: JSON (stored template body)
   - schemaVersion: string (for migrations)
   - createdAt: number
   - createdBy: string
3. responses
   - templateId: Id<"templates">
   - templateVersion: number
   - answers: JSON (flat answers map)
   - payload: JSON (hierarchical payload)
   - submitterId: string
   - status: string (draft|submitted)
   - createdAt: number
   - submittedAt?: number

## Server Validation Flow
- On create/update templateVersion: run AJV schema validation (template.schema.json) & ensure variable uniqueness.
- On response draft/save: validate answers against template (types & required visible fields) + custom & cross-field rules (reuse same logic as client with shared helpers or re-migrate expressions server-side).
- On submit: enforce no validation errors; set status=submitted & submittedAt.

## Functions
- templates.createTemplate(name, type)
- templates.publishVersion(templateId, body) -> increments version, stores version row, updates latestVersion
- templates.getTemplate(templateId)
- templates.getTemplateWithLatestVersion(templateId)
- responses.saveDraft(templateId, version, answers, payload, status='draft')
- responses.submit(templateId, version, answers, payload)
- responses.listByTemplate(templateId)

## Access Control (Future RQ-009)
- Placeholder checks now (TODO: integrate Clerk user + role gating later).

## Implementation Steps
1. Extend schema.ts with new tables.
2. Add validation utilities in server/shared/validation.ts (AJV compile JSON schemas).
3. Implement template functions (create, publish, get).
4. Implement response functions (saveDraft, submit, list).
5. Write minimal unit tests (if runtime harness available) or manual script for smoke (out of scope for now if Convex local dev not stable in CI).
6. Update TASKS.md marking partial RQ-008 progress.

## Open Questions
- Do we store full template JSON in template table or only per-version? (Decision: keep lightweight root record + full body in version documents.)
- Audit / version diff stored? (Future RQ-014.)

