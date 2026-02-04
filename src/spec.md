# Specification

## Summary
**Goal:** Update the Daily SweetSteps page UI and interactions so the header shows “Today's SweetSteps” with today’s date, the task list container is simplified, and tapping a task opens the existing TaskModal with task-specific details.

**Planned changes:**
- Change the /daily page header title to exactly “Today's SweetSteps” and add today’s date in a readable English format; remove any “Daily SweetSteps” header text.
- Remove the in-container heading “Today's SweetSteps” from the tasks list wrapper, and remove the wrapper’s border and background while keeping individual task row styling intact.
- Make each task row clickable/tappable to open the existing TaskModal, passing the selected task data to populate the modal title, a non-empty description (derived from task text if needed), and initial timer minutes from the task’s time value; ensure close/backdrop closes and completion uses the existing onComplete flow then closes.

**User-visible outcome:** On the Daily page, users see “Today's SweetSteps” with today’s date, a cleaner task list container, and can tap any task to open the TaskModal pre-filled for that task and complete it through the existing flow.
