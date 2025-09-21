applyTo:

- "typescript"
- "javascript"
  title: Convex project instructions
  summary: Guidance for Copilot/agents when modifying Convex or server-side code.
  instructions:
- Read spec/ and AGENTS.md first.
- Never output real secrets; use 'KEY_REQUIRED' placeholder.
- Add tests and a rollback plan for Convex function changes.
- Include a spec entry for behaviour changes.
