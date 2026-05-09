# Requirements Document

## Introduction

The To-Do Life Dashboard is a standalone, client-side web application that serves as a personal homepage-style dashboard. It helps users organize their day by presenting the current time and date with a contextual greeting, a Pomodoro-style focus timer, a persistent to-do list, and a set of quick-access links — all in a single, clean, minimal interface. All data is stored in the browser's LocalStorage with no backend or external dependencies required.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component displaying the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The UI component implementing a 25-minute countdown timer with start, stop, and reset controls.
- **Task_List**: The UI component managing the user's to-do items.
- **Task**: A single to-do item with a text description and a completion state.
- **Quick_Links**: The UI component managing a collection of user-defined shortcut buttons that open URLs.
- **Link**: A single quick-access entry consisting of a label and a URL.
- **LocalStorage**: The browser's built-in key-value storage API used for all persistent data.
- **Timer_Session**: A single run of the Focus_Timer from start until it is stopped or reaches zero.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a greeting based on the time of day, so that I have immediate context when I open the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM format, updated every second.
2. THE Greeting_Widget SHALL display the current date in a human-readable format (e.g., "Monday, 14 July 2025").
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good afternoon".
5. WHEN the local hour is between 18:00 and 21:59, THE Greeting_Widget SHALL display the greeting "Good evening".
6. WHEN the local hour is between 22:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good night".
7. THE Greeting_Widget SHALL update the greeting automatically when the local hour crosses a boundary without requiring a page reload.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can use the Pomodoro technique to manage focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise to a duration of 25 minutes (1500 seconds) on page load.
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down in one-second intervals.
3. WHILE a Timer_Session is active, THE Focus_Timer SHALL display the remaining time in MM:SS format.
4. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visual indicator that the session has ended.
7. WHILE a Timer_Session is active, THE Focus_Timer SHALL disable the start control and enable the stop control.
8. WHILE no Timer_Session is active, THE Focus_Timer SHALL enable the start control and disable the stop control.
9. IF the browser tab loses focus during an active Timer_Session, THE Focus_Timer SHALL continue counting down accurately using the system clock as the reference.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks that persist across browser sessions, so that I can track my daily responsibilities without losing them on page reload.

#### Acceptance Criteria

1. THE Task_List SHALL load all previously saved Tasks from LocalStorage on page load.
2. WHEN the user submits a non-empty task description, THE Task_List SHALL add a new Task with a completion state of incomplete and save the updated list to LocalStorage.
3. IF the user submits an empty or whitespace-only task description, THEN THE Task_List SHALL reject the submission and display an inline validation message.
4. WHEN the user activates the edit control for a Task, THE Task_List SHALL present the task description in an editable field pre-populated with the current description.
5. WHEN the user confirms an edit with a non-empty description, THE Task_List SHALL update the Task description and save the updated list to LocalStorage.
6. IF the user confirms an edit with an empty or whitespace-only description, THEN THE Task_List SHALL reject the update and retain the original description.
7. WHEN the user activates the completion toggle for an incomplete Task, THE Task_List SHALL mark the Task as complete, apply a visual distinction (e.g., strikethrough), and save the updated list to LocalStorage.
8. WHEN the user activates the completion toggle for a complete Task, THE Task_List SHALL mark the Task as incomplete, remove the visual distinction, and save the updated list to LocalStorage.
9. WHEN the user activates the delete control for a Task, THE Task_List SHALL remove the Task from the list and save the updated list to LocalStorage.
10. THE Task_List SHALL display completed Tasks visually distinct from incomplete Tasks at all times.
11. THE Task_List SHALL persist all Task data (description and completion state) in LocalStorage so that data survives a page reload.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to add, manage, and use shortcut buttons that open my favourite websites, so that I can navigate to frequently visited pages directly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL load all previously saved Links from LocalStorage on page load.
2. WHEN the user submits a new Link with a non-empty label and a valid URL, THE Quick_Links SHALL add a button for that Link and save the updated list to LocalStorage.
3. IF the user submits a new Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission and display an inline validation message identifying the missing field.
4. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Quick_Links SHALL prepend "https://" to the URL before saving.
5. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
6. WHEN the user activates the delete control for a Link, THE Quick_Links SHALL remove the Link button and save the updated list to LocalStorage.
7. THE Quick_Links SHALL persist all Link data (label and URL) in LocalStorage so that data survives a page reload.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want all my tasks and quick links to be automatically saved, so that I never lose my data between browser sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL use the browser LocalStorage API as the sole persistence mechanism for all Task and Link data.
2. WHEN any Task or Link is created, updated, or deleted, THE Dashboard SHALL write the complete updated dataset to LocalStorage within 100ms of the user action.
3. IF LocalStorage is unavailable or throws an error during a write operation, THEN THE Dashboard SHALL display a non-blocking warning message informing the user that data could not be saved.
4. THE Dashboard SHALL store Task data under a single, consistent LocalStorage key dedicated to tasks.
5. THE Dashboard SHALL store Link data under a single, consistent LocalStorage key dedicated to links.

---

### Requirement 6: Layout and Visual Design

**User Story:** As a user, I want a clean, minimal, and visually consistent interface, so that the dashboard is easy to read and use without distraction.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets (Greeting_Widget, Focus_Timer, Task_List, Quick_Links) on a single page without requiring scrolling on a viewport of 1280×800 pixels or larger.
2. THE Dashboard SHALL use a single CSS file for all styling.
3. THE Dashboard SHALL use a single JavaScript file for all behaviour.
4. THE Dashboard SHALL apply a clear visual hierarchy so that the Greeting_Widget is the most prominent element on the page.
5. THE Dashboard SHALL use a legible font size of at least 14px for all body text and at least 24px for the time display.
6. WHEN the viewport width is below 768px, THE Dashboard SHALL reflow the layout so that all widgets stack vertically and remain fully usable.
7. THE Dashboard SHALL render without errors or layout breakage on the latest stable versions of Chrome, Firefox, Edge, and Safari.
