# Specification

## Summary
**Goal:** Add a fully self-contained `TaskModal` React component for Daily SweetSteps that provides an adjustable countdown timer flow and completion confirmation, triggering callbacks.

**Planned changes:**
- Add a new single-file React component `TaskModal` (TypeScript + JSX + hooks) with props: `isOpen`, `task`, `onClose`, `onComplete`.
- Implement a centered modal overlay (dark translucent backdrop + styled card) showing task details, estimated minutes, a 5–60 minute slider, and timer controls (start/pause/resume/cancel) using a 1-second `setInterval` countdown in `mm:ss`.
- Add a completion confirmation step when the timer hits 0 (YES calls `onComplete()` then `onClose()`; NO resets to initial timer setup state).
- Ensure closing the modal and cancelling both reset all internal state and clear any active interval; return `null` when `isOpen` is false.

**User-visible outcome:** When integrated by the app later, opening the modal for a task will let users set and run a countdown timer, pause/resume or cancel it, and confirm completion to trigger the provided callbacks.
