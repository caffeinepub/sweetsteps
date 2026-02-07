# Specification

## Summary
**Goal:** Fix identity confirmation card clipping/overflow issues on small screens and move account actions into a hamburger menu in the authenticated header.

**Planned changes:**
- Update the identity confirmation card styling to use fully content-driven (auto) height, slightly reduce internal padding where needed, and ensure long text (e.g., principal) wraps/breaks to avoid horizontal overflow.
- Reduce the top/bottom padding of the parent container that wraps the card to prevent vertical overflow while keeping reasonable left/right padding.
- Replace direct Logout and Delete Account header buttons with a hamburger menu in `AuthenticatedHeader` containing both actions, preserving existing delete confirmation dialog and current disabled/loading/error behaviors.

**User-visible outcome:** The identity confirmation card content is no longer cut off on small screens, the page no longer overflows due to excessive padding, and Logout/Delete Account are accessed via a hamburger menu while behaving the same as before.
