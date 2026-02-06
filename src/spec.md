# Specification

## Summary
**Goal:** Prevent feature description text from being clipped in the “Why SweetSteps?” modal carousel by increasing the height of the selected inner card only.

**Planned changes:**
- Adjust styling (e.g., height/min-height/padding/overflow) for the specific selected carousel inner card element identified by the provided XPath so it renders taller.
- Verify the change prevents text clipping across carousel slides at common mobile and desktop breakpoints without introducing internal scrollbars or altering carousel controls/behavior.

**User-visible outcome:** In the “Why SweetSteps?” modal carousel on the Landing page, all slide titles and descriptions display fully without being cut off, while the carousel looks and behaves the same aside from the taller selected card.
