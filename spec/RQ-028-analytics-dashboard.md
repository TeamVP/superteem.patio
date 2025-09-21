# RQ-028: Analytics Dashboard

Intent:
Provide aggregate insights into response data over time.

Decisions (Draft):
- Precompute daily aggregates per template version (count, mean for numeric answers) via scheduled job.
- Visualization using lightweight chart library.

Acceptance Criteria:
- Dashboard displays submission count trend and key metric aggregates.
- CSV export for selected date range.
- Loading state and empty state defined.

Dependencies:
- RQ-011 exports/analytics foundation.

Open Questions:
- Multi-dimensional pivot (team + template)? (Later phase.)
