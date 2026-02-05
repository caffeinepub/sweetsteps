# Specification

## Summary
**Goal:** Eliminate long post-Internet-Identity “Validating…” stalls, prevent the onboarding React crash, and ensure each explicit Login click always prompts the Internet Identity account chooser.

**Planned changes:**
- Add explicit post-Internet-Identity step handling in Signup/Login so the UI reflects the actual blocking step (e.g., backend/actor readiness, account/onboarding checks) instead of staying on a generic “Validating…” state.
- Add timeouts/guards for post-II steps to prevent multi-minute hangs; transition to a clear, retryable error state with actionable guidance when steps exceed the timeout.
- Ensure Retry reliably clears auth UI state and re-runs the auth pipeline without requiring a full page refresh.
- Update Login flow to force Internet Identity account selection on every user-initiated Login click (avoid silently reusing an existing II session and avoid “Already Logged In” dead-ends); handle popup-blocked scenarios by returning quickly to a retryable state with guidance.
- Fix onboarding plan preview rendering to never attempt to directly render objects/arrays (e.g., {deadline, name, progress, reason}); safely format or fallback-render unexpected AI response shapes and show user-friendly errors instead of crashing.

**User-visible outcome:** After authorizing with Internet Identity, users are no longer stuck on “Validating identity…” for minutes; they either proceed promptly or see a clear error with Retry. Onboarding completes without a React crash, and clicking Login always opens the Internet Identity chooser to allow account switching.
