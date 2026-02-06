# Specification

## Summary
**Goal:** Fix the Internet Identity authentication flow on Signup (and keep Login consistent) to prevent double Internet Identity invocation and the false “Waiting for authentication…” / popup-blocked error when the user is already authenticated or returns from Internet Identity.

**Planned changes:**
- Update Signup page auth attempt guards/state so that if `sweetsteps_user_initiated_auth` is set and a valid Internet Identity (`iiIdentity`) is present after return/remount, the page immediately continues post-auth handling and routes to `/onboarding`.
- Prevent Signup from showing or getting stuck in “Waiting for authentication…” / popup-blocked error UI when authentication has already succeeded (including immediate return because the user is already authenticated).
- Adjust Signup Retry behavior: if already authenticated, do not trigger a second Internet Identity login; instead complete validation + navigation using the existing identity.
- Align Login page behavior with the fixed semantics for “already authenticated” and “return-from-II/remount” scenarios so it resumes post-auth flow without requiring Retry or showing a false waiting/error state.

**User-visible outcome:** After signing up (or logging in) with Internet Identity, users who successfully authenticate—including those already authenticated—are automatically taken to the appropriate next page (Signup → `/onboarding`; Login → normal redirect) without a false “Waiting for authentication…” error and without needing to press Retry.
