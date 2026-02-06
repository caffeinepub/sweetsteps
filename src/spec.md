# Specification

## Summary
**Goal:** Move the display-name prompt to occur immediately after successful authentication and before onboarding starts, and remove the non-functional close (X) button from the modal.

**Planned changes:**
- Gate the display-name prompt to show only for authenticated, new users who have not completed onboarding, and only before the first onboarding question is accessible.
- Update post-auth redirect/navigation logic (including Internet Identity callback handling and auth-page auto-redirect) to route eligible new users through the display-name step before onboarding, without causing redirect loops.
- Remove the visible close (X) control from the display-name modal while keeping Save/Skip behavior and all other UI/validation the same.

**User-visible outcome:** After signing in, new users are prompted to set (or skip) a display name before seeing the first onboarding question; returning/onboarded users are not prompted, and the display-name modal no longer shows an X button.
