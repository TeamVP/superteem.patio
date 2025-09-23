# RQ-020: Mobile Optimization

Intent:
Ensure authoring and response submission experiences are usable and performant on mobile devices.

Decisions (Draft):
- Apply responsive layout breakpoints to editor panels (collapse sidebars into accordions).
- Increase tap targets and font sizes per accessibility guidelines.
- Minimize blocking scripts; defer heavy evaluation.

Acceptance Criteria:
- Core flows (list templates, edit template, fill response) pass manual QA on iPhone SE and Pixel 5 viewports.
- Lighthouse mobile performance score >= 85.
- No horizontal scrolling on standard pages.

Dependencies:
- RQ-004 editor, RQ-006 renderer.

Open Questions:
- Offline draft support? (Out of scope here.)
