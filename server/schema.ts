import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Expanded schema to support respondent flow (RQ-017) + teams + auth integration
export default defineSchema({
  users: defineTable({
    // External identity linkage
    clerkId: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    // Profile
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Authorization
    roles: v.array(v.string()), // global roles
    teamIds: v.optional(v.array(v.id('teams'))),
    status: v.string(), // active | disabled
    // Lifecycle
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_clerkId', ['clerkId'])
    .index('by_tokenIdentifier', ['tokenIdentifier']),
  teams: defineTable({
    slug: v.string(),
    name: v.string(),
    status: v.string(),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),
  users_teams: defineTable({
    userId: v.id('users'),
    teamId: v.id('teams'),
    roles: v.array(v.string()), // team-scoped roles
    joinedAt: v.number(),
    invitedBy: v.optional(v.id('users')),
    status: v.string(),
  })
    .index('by_user_team', ['userId', 'teamId'])
    .index('by_team', ['teamId'])
    .index('by_user', ['userId']),
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
