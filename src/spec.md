# Specification

## Summary
**Goal:** Ensure the "Start Onboarding" button on the Onboarding Incomplete screen reliably navigates authenticated, onboarding-incomplete users to the first onboarding step at `/onboarding`.

**Planned changes:**
- Fix the "Start Onboarding" CTA so it always triggers navigation to `/onboarding`, including on repeated clicks, without being blocked by redirects, loading states, or stale navigation handlers.
- Prevent unintended redirects that send onboarding-incomplete users back to `/weekly-mountain` (or any other page) when they attempt to start onboarding.
- Add a stable `data-testid` attribute to the "Start Onboarding" button on the Onboarding Incomplete screen for test automation.

**User-visible outcome:** Authenticated users who haven’t completed onboarding can click "Start Onboarding" and consistently land on `/onboarding` at step 1 without needing to refresh, and without being redirected away.
