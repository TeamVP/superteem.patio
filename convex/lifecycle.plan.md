# Backend Lifecycle Function Plan (Templates & Responses)

Covers RQ-008 (backend integration), RQ-009 (RBAC), RQ-014 (audit/versioning) alignment.

## Templates
- createTemplate (mutation)
  Input: { teamId?: Id<'teams'>, slug, title, type, body }
  Auth: require user (and team membership if teamId) with role: editor|publisher|admin
  Action: insert draft template (latestVersion=0, status='draft'), write auditLogs(create)

- saveTemplateDraft (mutation)
  Input: { templateId, body, title?, type? }
  Auth: editor|publisher|admin (team scope) and template.status != 'archived'
  Action: patch template, updatedAt=now, auditLogs(edit)

- publishTemplateVersion (mutation)
  Input: { templateId }
  Preconditions: template exists, status in ['draft','published']
  Auth: publisher|admin
  Flow:
    1. Fetch template
    2. version = template.latestVersion + 1
    3. Insert templateVersions { templateId, version, body: template.body, schemaVersion: 'v1', createdAt, createdBy, publishedAt: now, status:'published' }
    4. Patch template { latestVersion: version, status:'published', updatedAt: now }
    5. Audit log (publish)
    6. Return { version }

- revertTemplateVersion (mutation)
  Input: { templateId, version }
  Auth: publisher|admin
  Flow:
    1. Get snapshot by templateId/version
    2. Patch template.body = snapshot.body, updatedAt=now
    3. Audit log (revert, include fromVersion)

- listTemplateVersions (query)
  Input: { templateId }
  Auth: membership or global view role (respondent allowed if published)
  Return versions sorted desc

## Responses
- saveResponseDraft (mutation)
  Input: { templateId, templateVersion (optional - if draft, use latestVersion), answers, payload, context }
  Auth: respondent|editor|publisher|admin
  Flow: upsert (by submitterId + templateId + status='draft'); patch answers/payload/context; audit(log: 'edit-draft') (optional)

- submitResponse (mutation)
  Input: { templateId, answers, payload, context }
  Flow:
    1. Load template (must be published)
    2. Use latestVersion for submission
    3. Server-side validation (reuse validators / JSONLogic)
    4. Insert response (status='submitted', submittedAt=now)
    5. Audit log (submit)

- listResponsesByTemplateVersion (query)
  Input: { templateId, version? }
  Auth: editor|publisher|admin for team; respondent may list only their own (future variant)
  Return filtered by version if provided; default latestVersion.

## Audit Logging Helper
- logAudit(ctx, { entityType, entityId, action, actorId, summary, version?, meta? })
  Insert into auditLogs; consider truncating summary to <= 256 chars.

## RBAC Helpers
- getViewer(ctx) -> user row
- assertTeamRole(ctx, teamId, roles[])
- assertTemplateRole(ctx, templateId, roles[])

## Validation Strategy (Server)
- Mirror frontend validation engine for submitResponse
- Accept answers/payload; compile template.body rules; re-run deterministic validators
- On failure: throw error with structured { fieldErrors: Record<string,string[]> }

## Index Usage
- templateVersions.by_template_version for direct lookup
- responses.by_template_version for listing
- auditLogs.by_entity for chronological actions

## Open Questions / Future
- Soft delete vs archive semantics (currently status fields)
- Partial response autosave (throttle & conflict resolution)
- Schema evolution: schemaVersion bump strategy

---
Generated plan stub; implement mutations/queries in separate files (templates.ts, responses.ts, audit.ts) next.
