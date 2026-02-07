# Specification

## Summary
**Goal:** Make the Landing page “Continue with Internet Identity” button match the Weekly Mountain primary button styling and render as text-only.

**Planned changes:**
- Update only the Landing page button at `/html[1]/body[1]/div[1]/div[1]/main[1]/div[2]/button[1]` to use the same Tailwind class styling as the Weekly Mountain primary button (“View Today’s SweetSteps”) for height, typography, rounding, background, hover background, and text color.
- Remove the mountain icon from inside that same Landing button so it displays text-only, keeping the existing label states (“Continue with Internet Identity” / “Connecting...”) and current click/disabled behavior unchanged.

**User-visible outcome:** On the Landing page, the “Continue with Internet Identity” button looks identical (styling-wise) to the Weekly Mountain primary button and no longer shows a mountain icon inside it.
