# Specification

## Summary
**Goal:** Add in-app Logout and Delete Account flows to support Internet Identity testing by clearing local session/state and optionally deleting the user’s stored backend profile.

**Planned changes:**
- Backend: add a canister method that deletes the currently authenticated caller’s stored user data (at minimum the `userProfiles` entry keyed by `caller`), handling missing records safely and preserving existing authorization rules.
- Frontend: add a globally accessible in-app Logout action that calls `useInternetIdentity().clear()`, clears client-side persisted onboarding and weekly mountain cache state (including `OnboardingResultContext` storage and relevant `localStorage` keys), then routes to `/` or `/login`.
- Frontend: add an in-app Delete Account action (clearly destructive) with confirmation; on confirm, call the new backend delete method via the authenticated actor, then perform the same logout/state reset and navigation; show a clear English error if deletion fails.
- Ensure Logout/Delete Account controls are reachable from the main authenticated experience (e.g., header/menu on primary authenticated pages) and behave consistently across routes, without modifying immutable UI library files under `frontend/src/components/ui`.

**User-visible outcome:** Signed-in users can log out from within the app to return to the landing/login screen with all local cached state cleared, and can delete their account data (with confirmation) so that the next login behaves like a fresh user; failures to delete are reported clearly.
