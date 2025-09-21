import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// RQ-008: Backend persistence for templates, versions, and responses
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
    // RQ-009: RBAC roles assigned to user (e.g. admin, author, reviewer, responder)
    roles: v.array(v.string()),
  }).index('by_email', ['email']),
  templates: defineTable({
    name: v.string(),
    type: v.string(), // survey | observation | other categories
    latestVersion: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index('by_name', ['name']),
  templateVersions: defineTable({
    templateId: v.id('templates'),
    version: v.number(),
    body: v.any(), // full template JSON (validated client + server)
    schemaVersion: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index('by_template_version', ['templateId', 'version'])
    .index('by_template', ['templateId']),
  responses: defineTable({
    templateId: v.id('templates'),
    templateVersion: v.number(),
    answers: v.any(), // flat answers map
    payload: v.any(), // hierarchical payload
    submitterId: v.string(),
    status: v.string(), // draft | submitted
    createdAt: v.number(),
    submittedAt: v.optional(v.number()),
    // RQ-016 review denormalized fields
    reviewStatus: v.optional(v.string()), // unreviewed | in_review | reviewed
    lastReviewedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.string()),
    reviewNoteCount: v.optional(v.number()),
  })
    .index('by_template_version', ['templateId', 'templateVersion'])
    .index('by_submitter', ['submitterId'])
    .index('by_template_created', ['templateId', 'createdAt'])
    .index('by_template_reviewStatus', ['templateId', 'reviewStatus', 'createdAt']),
  responseReviews: defineTable({
    responseId: v.id('responses'),
    createdAt: v.number(),
    createdBy: v.string(),
    note: v.optional(v.string()),
    statusAfter: v.optional(v.string()), // unreviewed | in_review | reviewed
  }).index('by_response', ['responseId', 'createdAt']),
  // RQ-014: Audit log entries for template edits, publishes, submissions, exports
  auditLogs: defineTable({
    entityType: v.string(), // template | response | export
    entityId: v.string(),
    action: v.string(), // edit | publish | submit | export
    actorId: v.string(),
    timestamp: v.number(),
    version: v.optional(v.number()),
    summary: v.string(),
  })
    .index('by_entity', ['entityType', 'entityId', 'timestamp'])
    .index('by_actor', ['actorId', 'timestamp'])
    .index('recent', ['timestamp']),
});
