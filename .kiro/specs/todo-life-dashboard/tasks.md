# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a single-page, client-side dashboard using HTML, CSS, and Vanilla JS only. No build tools, no frameworks, no npm. All behaviour lives in `js/app.js` (IIFE module pattern), all styling in `css/styles.css`, and all persistence in `localStorage`. Tasks are ordered so each step integrates cleanly into the previous one — nothing is left orphaned.

---

## Tasks

- [x] 1. Create the HTML shell and file structure
  - Create `index.html` with semantic landmark elements: `<header id="greeting-widget">`, `<section id="focus-timer">`, `<section id="task-list">`, `<section id="quick-links">`
  - Add `<link rel="stylesheet" href="css/styles.css">` and `<script src="js/app.js" defer></script>`
  - Create empty `css/styles.css` and `js/app.js` placeholder files
  - Include all form markup for task input, link input, and timer controls so later JS tasks have stable DOM targets
  - Add `<div id="storage-warning" role="alert" hidden></div>` banner element for LocalStorage error messages
  - _Requirements: 6.2, 6.3_

- [x] 2. Implement CSS layout and responsive design
  - [x] 2.1 Implement desktop CSS Grid layout
    - Define `.dashboard` grid with `grid-template-areas: "greeting greeting" "timer tasks" "links links"` and `grid-template-columns: 1fr 2fr`
    - Assign `grid-area` to each widget container
    - Set `gap: 1rem` and a comfortable max-width with centred margin
    - _Requirements: 6.1, 6.4_
  - [x] 2.2 Implement mobile responsive layout
    - Add `@media (max-width: 767px)` rule that collapses the grid to a single column with stacked areas
    - _Requirements: 6.6_
  - [x] 2.3 Implement typography and base styles
    - Set body font to a system-font stack; minimum `14px` for body text
    - Style `#greeting-widget` time display to at least `24px`, greeting heading to at least `20px`
    - Style `#focus-timer` countdown display to at least `48px`
    - Style completed tasks with `text-decoration: line-through` and reduced opacity via a `.completed` class
    - Style the storage warning banner (non-blocking, top-of-page strip)
    - _Requirements: 6.4, 6.5_

- [x] 3. Implement the Storage module in `js/app.js`
  - [x] 3.1 Write the `Storage` IIFE module
    - Expose `Storage.get(key)` — wraps `JSON.parse(localStorage.getItem(key))` in a `try/catch`; returns `null` on failure
    - Expose `Storage.set(key, value)` — wraps `JSON.stringify` + `localStorage.setItem` in a `try/catch`; returns `{ ok: true }` on success or `{ ok: false, error }` on failure
    - Define `Storage.KEYS = { TASKS: 'tld_tasks', LINKS: 'tld_links' }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.2 Write property test for Storage serialisation round-trip
    - **Property 14: Storage serialisation round-trip**
    - **Validates: Requirements 5.1, 5.4, 5.5**
    - Use `fc.array(fc.record({ id: fc.uuid(), description: fc.string(), completed: fc.boolean(), createdAt: fc.integer() }))` as generator
    - Assert deep equality after `Storage.set` then `Storage.get`

- [x] 4. Implement the GreetingWidget module
  - [x] 4.1 Write `GreetingWidget._getGreeting(hour)` and `GreetingWidget._formatTime(date)` and `GreetingWidget._formatDate(date)`
    - `_getGreeting`: map hour 5–11 → "Good morning", 12–17 → "Good afternoon", 18–21 → "Good evening", 22–23 and 0–4 → "Good night"
    - `_formatTime`: return `HH:MM` zero-padded string from a `Date` object
    - `_formatDate`: return human-readable string e.g. "Monday, 14 July 2025" using `toLocaleDateString` with `{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 4.2 Write property test for greeting boundary coverage
    - **Property 1: Greeting boundary coverage**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - Use `fc.integer({ min: 0, max: 23 })` as generator; assert result is one of the four greeting strings and all 24 hours produce a non-null value
  - [ ]* 4.3 Write property test for time format invariant
    - **Property 2: Time format invariant**
    - **Validates: Requirements 1.1**
    - Use `fc.date()` as generator; assert output matches `/^\d{2}:\d{2}$/`
  - [x] 4.4 Write `GreetingWidget.init()`
    - Query `#greeting-widget` DOM elements for time, date, and greeting text nodes
    - Call `_formatTime`, `_formatDate`, `_getGreeting` immediately on load to populate the display
    - Start a `setInterval` at 1000 ms; on each tick update time display and re-evaluate greeting (update only if greeting text has changed)
    - _Requirements: 1.1, 1.2, 1.7_

- [x] 5. Implement the FocusTimer module
  - [x] 5.1 Write `FocusTimer._formatCountdown(seconds)`
    - Convert integer seconds to `MM:SS` zero-padded string
    - _Requirements: 2.3_
  - [ ]* 5.2 Write property test for countdown format invariant
    - **Property 3: Countdown format invariant**
    - **Validates: Requirements 2.3**
    - Use `fc.integer({ min: 0, max: 1500 })` as generator; assert output matches `/^\d{2}:\d{2}$/` and decoded value equals input
  - [ ]* 5.3 Write property test for timer accuracy under elapsed time
    - **Property 4: Timer accuracy under elapsed time**
    - **Validates: Requirements 2.9**
    - Use `fc.integer({ min: 0, max: 1500 })` (elapsed seconds) as generator; mock `Date.now()` to return `startTime + elapsed * 1000`; assert remaining time equals `Math.max(0, 1500 - elapsed)`
  - [x] 5.4 Write `FocusTimer.init()` with full state machine
    - Initialise closure variables: `state = 'IDLE'`, `endTime = null`, `remaining = 1500`, `intervalId = null`
    - Wire start button: record `endTime = Date.now() + remaining * 1000`, start 500 ms interval, set `state = 'RUNNING'`, update control enable/disable per the state table
    - Wire stop button: clear interval, compute `remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000))`, set `state = 'PAUSED'`, update controls
    - Wire reset button: clear interval, set `remaining = 1500`, `state = 'IDLE'`, update display and controls
    - On each interval tick: compute remaining from `endTime`; if ≤ 0 transition to `DONE` state, clear interval, show visual "session ended" indicator; otherwise update display
    - Apply control enable/disable rules from the design's state table for all four states (IDLE, RUNNING, PAUSED, DONE)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 6. Checkpoint — verify layout and timer before building data widgets
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in a browser; confirm the grid layout renders, the clock ticks, and the timer counts down and transitions through all states correctly.

- [x] 7. Implement the TaskList module
  - [x] 7.1 Write `TaskList._validateDescription(description)`
    - Return `{ valid: false, message: '...' }` for empty or whitespace-only strings; `{ valid: true }` otherwise
    - _Requirements: 3.3, 3.6_
  - [ ]* 7.2 Write property test for whitespace task rejection
    - **Property 6: Whitespace task rejection**
    - **Validates: Requirements 3.3, 3.6**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` as generator; assert `_validateDescription` returns `{ valid: false }` and task list is unchanged
  - [x] 7.3 Write `TaskList._addTask(description)`, `TaskList._editTask(id, newDescription)`, `TaskList._toggleTask(id)`, `TaskList._deleteTask(id)`
    - `_addTask`: trim description, validate, generate ID via `crypto.randomUUID()` with fallback, push `{ id, description, completed: false, createdAt: Date.now() }` to in-memory array, call `_save()` and `_render()`
    - `_editTask`: find task by id, validate new description, update `description` to trimmed value, call `_save()` and `_render()`
    - `_toggleTask`: find task by id, flip `completed`, call `_save()` and `_render()`
    - `_deleteTask`: filter out task by id, call `_save()` and `_render()`
    - _Requirements: 3.2, 3.4, 3.5, 3.7, 3.8, 3.9, 3.11_
  - [ ]* 7.4 Write property test for task addition round-trip
    - **Property 5: Task addition round-trip**
    - **Validates: Requirements 3.2, 3.11, 5.1**
    - Use `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` as generator; assert storage contains entry with matching trimmed description and `completed: false`
  - [ ]* 7.5 Write property test for task completion toggle round-trip
    - **Property 7: Task completion toggle round-trip**
    - **Validates: Requirements 3.7, 3.8**
    - Use `fc.boolean()` as initial state generator; assert two toggles restore original `completed` value and list length is unchanged
  - [ ]* 7.6 Write property test for task edit preserves identity
    - **Property 8: Task edit preserves identity**
    - **Validates: Requirements 3.5**
    - Use `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` as new description generator; assert `description` updated, `completed` unchanged, list length unchanged
  - [ ]* 7.7 Write property test for task deletion reduces list by one
    - **Property 9: Task deletion reduces list by one**
    - **Validates: Requirements 3.9**
    - Use `fc.array(taskArb, { minLength: 1 })` as generator; assert list length decreases by 1 and deleted id is absent
  - [x] 7.8 Write `TaskList._render()` and `TaskList._save()`
    - `_save()`: call `Storage.set(Storage.KEYS.TASKS, tasks)`; if result is `{ ok: false }`, show the storage warning banner
    - `_render()`: clear the task container, iterate the in-memory array, create an `<li>` per task with toggle checkbox, description `<span>`, edit button, and delete button; apply `.completed` CSS class when `task.completed` is true
    - _Requirements: 3.10, 5.2, 5.3_
  - [ ]* 7.9 Write property test for completed task visual distinction
    - **Property 10: Completed task visual distinction**
    - **Validates: Requirements 3.10**
    - Use `fc.array(taskArb)` with random `completed` states as generator; assert each rendered element has/lacks `.completed` class matching its state
  - [x] 7.10 Write `TaskList.init()` with event delegation and inline edit flow
    - Load tasks from `Storage.get(Storage.KEYS.TASKS)` inside a `try/catch`; fall back to `[]` on parse failure
    - Call `_render()` to populate the DOM
    - Attach a single delegated `click` listener on the task container; dispatch to `_toggleTask`, `_editTask`, or `_deleteTask` based on `event.target` data attributes
    - Handle the add-task form `submit` event: validate, call `_addTask`, show inline validation message on failure
    - Implement inline edit: on edit click replace the task `<li>` content with a pre-filled `<input>`; on Enter confirm via `_editTask`; on Escape cancel and restore original text; show inline validation message if confirmed with empty input
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 8. Implement the QuickLinks module
  - [x] 8.1 Write `QuickLinks._normalizeUrl(url)` and `QuickLinks._validateLink(label, url)`
    - `_normalizeUrl`: if url does not start with `http://` or `https://`, prepend `https://`; return url unchanged otherwise
    - `_validateLink`: return `{ valid: false, message }` if label is empty/whitespace or url is empty/whitespace; `{ valid: true }` otherwise
    - _Requirements: 4.3, 4.4_
  - [ ]* 8.2 Write property test for URL normalisation idempotence
    - **Property 11: URL normalisation idempotence**
    - **Validates: Requirements 4.4**
    - Use `fc.webUrl()` and `fc.string()` as generators; assert already-schemed URLs are returned unchanged; assert applying `_normalizeUrl` twice produces the same result as applying it once
  - [x] 8.3 Write `QuickLinks._addLink(label, url)` and `QuickLinks._deleteLink(id)`
    - `_addLink`: trim label, validate, normalise url, generate ID, push `{ id, label, url }` to in-memory array, call `_save()` and `_render()`
    - `_deleteLink`: filter out link by id, call `_save()` and `_render()`
    - _Requirements: 4.2, 4.4, 4.6_
  - [ ]* 8.4 Write property test for link addition round-trip
    - **Property 12: Link addition round-trip**
    - **Validates: Requirements 4.2, 4.7, 5.1**
    - Use `fc.string({ minLength: 1 })` (label) and `fc.webUrl()` (url) as generators; assert storage contains entry with matching label and url
  - [ ]* 8.5 Write property test for link deletion reduces list by one
    - **Property 13: Link deletion reduces list by one**
    - **Validates: Requirements 4.6**
    - Use `fc.array(linkArb, { minLength: 1 })` as generator; assert list length decreases by 1 and deleted id is absent
  - [x] 8.6 Write `QuickLinks._render()` and `QuickLinks._save()`
    - `_save()`: call `Storage.set(Storage.KEYS.LINKS, links)`; show storage warning banner on failure
    - `_render()`: clear the links container, create an `<a>` or `<button>` per link with `target="_blank" rel="noopener noreferrer"`, and a delete button with a data-id attribute
    - _Requirements: 4.5, 5.2, 5.3_
  - [x] 8.7 Write `QuickLinks.init()` with event delegation
    - Load links from `Storage.get(Storage.KEYS.LINKS)` inside a `try/catch`; fall back to `[]` on parse failure
    - Call `_render()` to populate the DOM
    - Attach a single delegated `click` listener on the links container; dispatch to `_deleteLink` based on `event.target` data attributes
    - Handle the add-link form `submit` event: validate both fields, call `_addLink`, show inline validation messages (using `<span role="alert">`) identifying the missing field on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_

- [x] 9. Wire all modules together in `DOMContentLoaded`
  - [x] 9.1 Add the `DOMContentLoaded` bootstrap block at the bottom of `app.js`
    - Call `Storage.init()` (validate localStorage availability), then `GreetingWidget.init()`, `FocusTimer.init()`, `TaskList.init()`, `QuickLinks.init()` in sequence
    - _Requirements: 5.1_
  - [x] 9.2 Implement the storage warning banner behaviour
    - Write a shared `showStorageWarning(message)` helper that un-hides `#storage-warning`, sets its text, and auto-dismisses after 5 seconds or on click
    - Ensure all `Storage.set` failure paths in TaskList and QuickLinks call this helper
    - _Requirements: 5.3_

- [x] 10. Final checkpoint — full integration pass
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in Chrome, Firefox, Edge, and Safari; verify all four widgets render without console errors, data persists across reloads, the timer counts down accurately after a tab switch, and the layout stacks correctly below 768px.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests (Properties 1–14) are defined in the design document's Correctness Properties section; each `*` sub-task maps to exactly one property
- The `fast-check` library for property tests is loaded via CDN `<script>` tag in a standalone test HTML file — no npm or build step required
- Checkpoints at tasks 6 and 10 ensure incremental validation before adding complexity
