# Specification

## Summary
**Goal:** Ensure user onboarding completion persists across backend canister upgrades, and remove the temporary “Test Signup Page” action from the Landing page.

**Planned changes:**
- Update backend user profile storage so `userProfiles` (including `onboardingCompleted`) is persisted in stable storage and deterministically restored on upgrade, without changing existing API signatures.
- Remove the “Test Signup Page” button/link to `/signup-test` from `frontend/src/pages/Landing.tsx`, and clean up any now-unused imports while keeping remaining Landing page actions working.

**User-visible outcome:** Returning authenticated users who completed onboarding will no longer be prompted due to backend state resets after upgrades, and the Landing page will no longer offer a “Test Signup Page” navigation option.
