import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// RQ-008: Backend persistence for templates, versions, and responses
export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
  }),
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
  })
    .index('by_template_version', ['templateId', 'templateVersion'])
    .index('by_submitter', ['submitterId']),
});
