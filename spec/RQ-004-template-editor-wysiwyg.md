# RQ-004: Template editor (WYSIWYG)

Intent:
Provide an authoring UI with Editor and JSON tabs to create and maintain templates, including variables, enableIf, and custom validations. [file:7]

Decisions:
- Editor tab offers question palette, variable badge, details/advanced/validation panes, and drag-and-drop ordering. [file:7]
- JSON tab allows copy/paste overwrite with schema validation and a confirmation diff before applying changes. [file:7]

Acceptance Criteria:
- Authors can reconstruct the SIBR observation structure, including Composite, List of User, and Integer fields, using the Editor tab alone. [file:7]
- Pasting the provided SIBR JSON produces an identical structure after validation, with stable ids generated if missing. [file:7]

Deliverables:
- React screens and components under src/features/templates/editor with Storybook stories. [file:7]

Dependencies:
- RQ-002 Schema and types, RQ-003 Expression engine. [file:7]
