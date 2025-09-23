# RQ-017: Deployment & Hosting

Intent:
Establish a production deployment pipeline (Dokploy @ Hostinger), domain, HTTPS, environment configuration, and automated rollouts.

Decisions (Initial Draft):
- Use Docker image built via CI; push to registry; Dokploy pull & deploy.
- Configure environment via `.env.production` mounted secrets (never commit secrets).
- Health check endpoint (e.g. `/healthz`) for readiness probe.

Acceptance Criteria:
- One-command deploy from main (`pnpm deploy` or GitHub Action on tag).
- SSL certificate active; domain resolves.
- Rollback procedure documented.
- Version + git SHA visible in app footer.

Dependencies:
- RQ-013 CI pipelines.

Open Questions:
- Blue/green vs rolling—start with rolling.
- Secret management: native Dokploy vs external vault.
