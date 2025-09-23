import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Unified Convex schema (RQ-008, RQ-009, RQ-014, RQ-016)
// Authoritative data layer for users, teams, templates, versions, responses, reviews & audit logs.

export default defineSchema({
  users: defineTable({
    clerkId: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    roles: v.array(v.string()),
    status: v.string(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    teamIds: v.optional(v.array(v.id('teams'))),
  })
    .index('by_email', ['email'])
    .index('by_clerkId', ['clerkId'])
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_status', ['status']),

  teams: defineTable({
    slug: v.string(),
    name: v.string(),
    status: v.string(),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_status', ['status']),

  users_teams: defineTable({
    userId: v.id('users'),
    teamId: v.id('teams'),
    roles: v.array(v.string()),
    joinedAt: v.number(),
    invitedBy: v.optional(v.id('users')),
    status: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_team', ['teamId'])
    .index('by_user_team', ['userId', 'teamId']),

  templates: defineTable({
    teamId: v.optional(v.id('teams')),
    slug: v.string(),
    title: v.string(),
    type: v.string(),
    body: v.any(),
    latestVersion: v.number(),
    status: v.string(),
    createdBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team_slug', ['teamId', 'slug'])
    .index('by_team', ['teamId'])
    .index('by_status', ['status'])
    .index('by_slug', ['slug']),

  templateVersions: defineTable({
    templateId: v.id('templates'),
    version: v.number(),
    body: v.any(),
    schemaVersion: v.string(),
    createdAt: v.number(),
    createdBy: v.optional(v.id('users')),
    publishedAt: v.optional(v.number()),
    status: v.string(),
  })
    .index('by_template_version', ['templateId', 'version'])
    .index('by_template', ['templateId'])
    .index('by_status', ['status']),

  responses: defineTable({
    templateId: v.id('templates'),
    templateVersion: v.number(),
    teamId: v.optional(v.id('teams')),
    submitterId: v.optional(v.id('users')),
    status: v.string(),
    answers: v.any(),
    payload: v.any(),
    context: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.optional(v.number()),
    // RQ-016 review denormalized fields
    reviewStatus: v.optional(v.string()), // unreviewed | in_review | reviewed
    lastReviewedAt: v.optional(v.number()),
    lastReviewedBy: v.optional(v.id('users')),
    reviewNoteCount: v.optional(v.number()),
  })
    .index('by_template_version', ['templateId', 'templateVersion'])
    .index('by_submitter', ['submitterId'])
    .index('by_submitter_updated', ['submitterId', 'updatedAt'])
    .index('by_submitter_submitted', ['submitterId', 'submittedAt'])
    .index('by_team', ['teamId'])
    .index('by_template_created', ['templateId', 'createdAt'])
    .index('by_template_reviewStatus', ['templateId', 'reviewStatus', 'createdAt']),

  responseReviews: defineTable({
    responseId: v.id('responses'),
    createdAt: v.number(),
    createdBy: v.optional(v.id('users')),
    note: v.optional(v.string()),
    statusAfter: v.optional(v.string()), // unreviewed | in_review | reviewed
  }).index('by_response', ['responseId', 'createdAt']),

  auditLogs: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    actorId: v.optional(v.id('users')),
    timestamp: v.number(),
    version: v.optional(v.number()),
    summary: v.string(),
    meta: v.optional(v.any()),
  })
    .index('by_entity', ['entityType', 'entityId', 'timestamp'])
    .index('by_actor', ['actorId', 'timestamp'])
    .index('recent', ['timestamp']),
});
