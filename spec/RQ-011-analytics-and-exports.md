# RQ-011: Analytics and exports

Intent:
Enable CSV/JSON exports and simple aggregations (counts, distributions) on canonical answers. [file:7]

Decisions:
- Build parameterized queries by variable name and date range; export raw and aggregated datasets. [file:7]
- Provide download from UI and Convex function. [file:5]

Acceptance Criteria:
- Export of SIBR observation responses includes census and per-section metrics for analysis. [file:7]
- CSV opens cleanly in spreadsheets with stable headers. [file:7]

Deliverables:
- Convex export functions and a small UI in the admin area. [file:5]

Dependencies:
- RQ-008 Responses API. [file:5]
