# RQ-025: Autosave Draft Responses

Intent:
Prevent data loss during long form completion sessions.

Decisions (Draft):
- Debounced client mutation (e.g. 2s idle) to save partial answers.
- Local buffering when offline with retry queue.

Acceptance Criteria:
- No more than 2s of typing lost on refresh.
- Visual "Saved" indicator updates after debounce.
- Offline changes persist and sync when online.

Dependencies:
- RQ-006 renderer, RQ-008 backend responses.

Open Questions:
- Conflict resolution if same draft edited on two devices.
