# RQ-015: Seed templates and fixtures

Intent:
Ship the three provided templates as canonical fixtures to exercise editor, renderer, and validations. [file:7][file:3][file:8]

Decisions:
- Keep files under spec/examples/templates unchanged to remain authoritative. [file:7]
- Use them for Storybook stories, unit tests, and E2E runs. [file:7]

Acceptance Criteria:
- All fixtures validate against Template schema and render successfully in the app. [file:7][file:3][file:8]
- Playwright flows complete at least one full SIBR Yes path and one No path. [file:7]

Deliverables:
- Fixture loader and Storybook stories referencing these templates. [file:7]

Dependencies:
- RQ-002, RQ-006, RQ-010. [file:7]
