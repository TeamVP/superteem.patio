# RQ-002: Template schema and types

Intent:
Define a single, universal Template schema and corresponding TypeScript types for surveys and observations, plus Response and SubmissionContext, with JSON Schema $id under https://patio.superteem.com. [file:7][file:3][file:8]

Decisions:

- Use discriminated unions for question types: MultipleChoice, String, Integer, Composite, List, User. [file:7]
- Maintain variables like $patient_census with a strict pattern and use them in enableIf and customValidations fields. [file:7]
- Publish JSON Schemas at https://patio.superteem.com/schema/{template|response|submission-context}.schema.json. [file:7]

Acceptance Criteria:

- AJV validates all three provided templates without modification when placed under spec/examples/templates. [file:7][file:3][file:8]
- TypeScript definitions live at src/types/template.ts and align 1:1 with the JSON Schemas. [file:7]
- VS Code associates template files in spec/examples/templates with the Template schema for inline diagnostics. [file:7]

Deliverables:

- spec/schema/template.schema.json, spec/schema/response.schema.json, spec/schema/submission-context.schema.json. [file:7]
- src/types/template.ts generated or hand-authored to match the schema. [file:7]

Dependencies:

- RQ-003 Expression engine and migration. [file:7]
