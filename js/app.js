/* To-Do Life Dashboard — app.js
   All behaviour lives here (Requirement 6.3). */

/**
 * Storage — thin wrapper around window.localStorage.
 *
 * Provides a consistent interface for all read/write operations across the
 * application. Catches QuotaExceededError and other storage exceptions and
 * surfaces them as structured error objects so callers can react without
 * crashing.
 *
 * References: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
const Storage = (() => {
  // Internal flag set by init() when localStorage is confirmed unavailable.
  let _unavailable = false;

  /**
   * KEYS — fixed localStorage key names for each data type.
   * Frozen so no module can accidentally mutate them.
   */
  const KEYS = Object.freeze({
    TASKS: 'tld_tasks',
    LINKS: 'tld_links',
  });

  /**
   * init() — probe localStorage availability.
   *
   * Attempts a test write, read, and delete. If any step throws (e.g. storage
   * blocked in private browsing, or storage quota already full), the internal
   * _unavailable flag is set so that subsequent get/set calls can short-circuit
   * gracefully.
   *
   * @returns {{ available: boolean }}
   */
  function init() {
    const probe = '__tld_probe__';
    try {
      window.localStorage.setItem(probe, '1');
      const val = window.localStorage.getItem(probe);
      window.localStorage.removeItem(probe);
      // Confirm the round-trip actually worked.
      if (val !== '1') {
        throw new Error('localStorage probe read returned unexpected value');
      }
      _unavailable = false;
      return { available: true };
    } catch (e) {
      _unavailable = true;
      return { available: false };
    }
  }

  /**
   * get(key) — read and deserialise a value from localStorage.
   *
   * Returns null when:
   *  - localStorage is unavailable
   *  - the key does not exist
   *  - the stored value cannot be parsed as JSON
   *
   * @param {string} key
   * @returns {any|null}
   */
  function get(key) {
    if (_unavailable) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      // Covers SyntaxError from malformed JSON and any unexpected exceptions.
      return null;
    }
  }

  /**
   * set(key, value) — serialise and write a value to localStorage.
   *
   * Returns { ok: true } on success.
   * Returns { ok: false, error: string } when:
   *  - localStorage is unavailable
   *  - JSON.stringify throws (e.g. circular reference)
   *  - localStorage.setItem throws (e.g. QuotaExceededError)
   *
   * @param {string} key
   * @param {any} value
   * @returns {{ ok: boolean, error?: string }}
   */
  function set(key, value) {
    if (_unavailable) {
      return { ok: false, error: 'localStorage is unavailable' };
    }
    try {
      const serialised = JSON.stringify(value);
      window.localStorage.setItem(key, serialised);
      return { ok: true };
    } catch (e) {
      // Catches QuotaExceededError, circular-reference TypeError, etc.
      return { ok: false, error: e.message };
    }
  }

  // Public API
  return { init, get, set, KEYS };
})();

/**
 * GreetingWidget — live clock, date, and time-of-day greeting.
 *
 * Owns the #greeting-widget DOM section. Runs a setInterval every 1000 ms to
 * update the clock display. Checks the hour on each tick and updates the
 * greeting text only when the hour boundary has been crossed.
 *
 * References: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
const GreetingWidget = (() => {
  let _timeEl     = null;
  let _dateEl     = null;
  let _greetingEl = null;
  let _currentGreeting = '';
  let _name = '';

  const NAME_KEY = 'tld_username';
  const NAME_MAX = 30;

  function _getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 17) return 'Good afternoon';
    if (hour >= 18 && hour <= 21) return 'Good evening';
    return 'Good night';
  }

  function _formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function _formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function _buildGreeting(base) {
    return _name ? `${base}, ${_name}` : base;
  }

  function _tick() {
    const now = new Date();
    if (_timeEl) _timeEl.textContent = _formatTime(now);
    if (_dateEl) _dateEl.textContent = _formatDate(now);

    const base = _getGreeting(now.getHours());
    const full = _buildGreeting(base);
    if (full !== _greetingEl.textContent) {
      _currentGreeting = base;
      _greetingEl.textContent = full;
    }
  }

  function _saveName(name) {
    try { window.localStorage.setItem(NAME_KEY, name); } catch (e) { /* cosmetic */ }
  }

  function init() {
    _timeEl     = document.getElementById('greeting-time');
    _dateEl     = document.getElementById('greeting-date');
    _greetingEl = document.getElementById('greeting-text');

    const editBtn    = document.getElementById('greeting-edit-btn');
    const panel      = document.getElementById('greeting-name-panel');
    const nameInput  = document.getElementById('greeting-name-input');
    const saveBtn    = document.getElementById('greeting-name-save');
    const cancelBtn  = document.getElementById('greeting-name-cancel');

    // Load saved name.
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      _name = saved ? saved.trim().slice(0, NAME_MAX) : '';
    } catch (e) { _name = ''; }

    // Populate immediately.
    _tick();
    setInterval(_tick, 1000);

    // ── Edit button — show panel ─────────────────────────────────────────
    editBtn.addEventListener('click', () => {
      nameInput.value = _name;
      panel.hidden = false;
      nameInput.focus();
      nameInput.select();
    });

    // ── Save ─────────────────────────────────────────────────────────────
    function save() {
      const trimmed = nameInput.value.trim().slice(0, NAME_MAX);
      _name = trimmed;
      _saveName(trimmed);
      _greetingEl.textContent = _buildGreeting(_currentGreeting);
      panel.hidden = true;
    }

    saveBtn.addEventListener('click', save);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); save(); }
      if (e.key === 'Escape') { e.preventDefault(); panel.hidden = true; }
    });

    // ── Cancel ────────────────────────────────────────────────────────────
    cancelBtn.addEventListener('click', () => { panel.hidden = true; });
  }

  return { init, _getGreeting, _formatTime, _formatDate };
})();

/**
 * FocusTimer — 25-minute Pomodoro countdown with start / stop / reset.
 *
 * Uses Date.now() to record an absolute endTime when the timer starts so that
 * background-tab CPU throttling does not cause drift (Requirement 2.9). A
 * setInterval at 500 ms polls the remaining time and updates the display.
 *
 * State machine:
 *   IDLE ──[start]──► RUNNING ──[stop]──► PAUSED ──[start]──► RUNNING
 *     ▲                  │                                        │
 *     └──────[reset]─────┘                                        │
 *     ▲                                                           │
 *     └──────────────────[reset]─────────────────────────────────┘
 *     ▲                  │
 *     └──────[reach 00:00]────────────────────────────────────► DONE
 *
 * Control enable/disable rules:
 *   State    | Start | Stop | Reset
 *   ---------|-------|------|------
 *   IDLE     |  ✓    |  ✗   |  ✗
 *   RUNNING  |  ✗    |  ✓   |  ✓
 *   PAUSED   |  ✓    |  ✗   |  ✓
 *   DONE     |  ✗    |  ✗   |  ✓
 *
 * References: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */
const FocusTimer = (() => {
  // ── Closure state ──────────────────────────────────────────────────────────
  let _state = 'IDLE';       // 'IDLE' | 'RUNNING' | 'PAUSED' | 'DONE'
  let _endTime = null;       // absolute ms timestamp when the session will end
  let _duration = 1500;      // total session duration in seconds (default 25 min)
  let _remaining = 1500;     // seconds remaining (used when paused / idle)
  let _intervalId = null;    // handle returned by setInterval

  // ── DOM references (set in init) ───────────────────────────────────────────
  let _displayEl = null;
  let _startBtn = null;
  let _stopBtn = null;
  let _resetBtn = null;
  let _doneMsg = null;
  let _durationInput = null;
  let _durationSetBtn = null;
  let _durationErrorEl = null;

  // ── Pure helper ────────────────────────────────────────────────────────────

  /**
   * _formatCountdown(seconds) — convert integer seconds to a zero-padded
   * MM:SS string.
   *
   * Examples:
   *   0    → "00:00"
   *   90   → "01:30"
   *   1500 → "25:00"
   *
   * @param {number} seconds — non-negative integer
   * @returns {string}
   */
  function _formatCountdown(seconds) {
    const totalSecs = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const ss = String(totalSecs % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * _updateDisplay(seconds) — write the formatted countdown to the DOM.
   *
   * @param {number} seconds
   */
  function _updateDisplay(seconds) {
    if (_displayEl) {
      _displayEl.textContent = _formatCountdown(seconds);
    }
  }

  /**
   * _applyControlState() — enable/disable buttons according to the current
   * state machine state.
   */
  function _applyControlState() {
    switch (_state) {
      case 'IDLE':
        _startBtn.disabled = false;
        _stopBtn.disabled  = true;
        _resetBtn.disabled = true;
        break;
      case 'RUNNING':
        _startBtn.disabled = true;
        _stopBtn.disabled  = false;
        _resetBtn.disabled = false;
        break;
      case 'PAUSED':
        _startBtn.disabled = false;
        _stopBtn.disabled  = true;
        _resetBtn.disabled = false;
        break;
      case 'DONE':
        _startBtn.disabled = true;
        _stopBtn.disabled  = true;
        _resetBtn.disabled = false;
        break;
    }
  }

  /**
   * _clearInterval() — safely clear the polling interval if one is running.
   */
  function _clearInterval() {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }

  /**
   * _tick() — called every 500 ms while the timer is RUNNING.
   *
   * Computes remaining time from the absolute endTime so that background-tab
   * throttling does not cause drift. Transitions to DONE when time runs out.
   */
  function _tick() {
    const remaining = Math.max(0, Math.round((_endTime - Date.now()) / 1000));
    _updateDisplay(remaining);

    if (remaining <= 0) {
      // Transition to DONE state.
      _clearInterval();
      _state = 'DONE';
      _remaining = 0;
      _applyControlState();

      // Show the "session ended" visual indicator (Requirement 2.6).
      if (_doneMsg) {
        _doneMsg.hidden = false;
      }
    }
  }

  // ── Button handlers ────────────────────────────────────────────────────────

  /**
   * _onStart() — begin or resume the countdown.
   *
   * Records an absolute endTime based on the current remaining seconds so
   * that the timer is accurate even if the tab is backgrounded.
   */
  function _onStart() {
    if (_state !== 'IDLE' && _state !== 'PAUSED') return;

    _endTime = Date.now() + _remaining * 1000;
    _state = 'RUNNING';

    // Hide any previous "session ended" message.
    if (_doneMsg) {
      _doneMsg.hidden = true;
    }

    _applyControlState();

    // Poll at 500 ms for a responsive display without excessive CPU use.
    _intervalId = setInterval(_tick, 500);
  }

  /**
   * _onStop() — pause the countdown and capture the remaining time.
   */
  function _onStop() {
    if (_state !== 'RUNNING') return;

    _clearInterval();
    _remaining = Math.max(0, Math.round((_endTime - Date.now()) / 1000));
    _state = 'PAUSED';
    _updateDisplay(_remaining);
    _applyControlState();
  }

  /**
   * _onReset() — stop any active countdown and restore the timer to the
   * current duration.
   */
  function _onReset() {
    if (_state === 'IDLE') return;

    _clearInterval();
    _remaining = _duration;
    _endTime = null;
    _state = 'IDLE';

    // Hide the "session ended" message if it was visible.
    if (_doneMsg) {
      _doneMsg.hidden = true;
    }

    _updateDisplay(_remaining);
    _applyControlState();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * _getState() — return the current state machine state (for testing).
   *
   * @returns {'IDLE'|'RUNNING'|'PAUSED'|'DONE'}
   */
  function _getState() {
    return _state;
  }

  /**
   * init() — query DOM elements, set initial display, and wire up controls.
   *
   * @returns {void}
   */
  function init() {
    _displayEl = document.getElementById('timer-display');
    _startBtn  = document.getElementById('timer-start');
    _stopBtn   = document.getElementById('timer-stop');
    _resetBtn  = document.getElementById('timer-reset');
    _doneMsg   = document.getElementById('timer-done-message');
    _durationInput   = document.getElementById('timer-duration-input');
    _durationSetBtn  = document.getElementById('timer-duration-set');
    _durationErrorEl = document.getElementById('timer-duration-error');

    // Render the initial display.
    _updateDisplay(_remaining);

    // Apply the initial IDLE control state.
    _applyControlState();

    // Wire up timer controls.
    _startBtn.addEventListener('click', _onStart);
    _stopBtn.addEventListener('click', _onStop);
    _resetBtn.addEventListener('click', _onReset);

    // ── Set duration ──────────────────────────────────────────────────────
    _durationSetBtn.addEventListener('click', () => {
      const mins = parseInt(_durationInput.value, 10);

      if (isNaN(mins) || mins < 1 || mins > 180) {
        _durationErrorEl.textContent = 'Please enter a value between 1 and 180 minutes.';
        _durationErrorEl.hidden = false;
        return;
      }

      _durationErrorEl.hidden = true;

      if (_state === 'RUNNING' || _state === 'PAUSED') {
        _durationErrorEl.textContent = 'Stop or reset the timer before changing duration.';
        _durationErrorEl.hidden = false;
        return;
      }

      _duration  = mins * 60;
      _remaining = _duration;
      _state = 'IDLE';
      _endTime = null;
      if (_doneMsg) _doneMsg.hidden = true;
      _updateDisplay(_remaining);
      _applyControlState();
    });
  }

  return { init, _formatCountdown, _getState };
})();

/**
 * TaskList — persistent to-do list with add, edit, complete, and delete.
 *
 * Owns the #task-list DOM section. Uses event delegation on the container to
 * handle toggle, edit, and delete actions. Maintains an in-memory array of
 * Task objects as the single source of truth; the DOM is always derived from
 * this array via a full re-render on any mutation.
 *
 * References: Requirements 3.1–3.11, 5.2, 5.3
 */
const TaskList = (() => {
  // ── Closure state ──────────────────────────────────────────────────────────
  let _tasks = [];           // in-memory array of Task objects
  let _sortMode = 'none';    // 'none' | 'alpha' | 'status'

  // ── DOM references (set in init) ───────────────────────────────────────────
  let _containerEl = null;   // <ul id="task-container">
  let _formEl = null;        // <form id="task-form">
  let _inputEl = null;       // <input id="task-input">
  let _errorEl = null;       // <span id="task-input-error">

  // ── Pure helpers ───────────────────────────────────────────────────────────

  /**
   * _validateDescription(description) — check that a task description is
   * non-empty after trimming.
   *
   * Returns { valid: false, message: '...' } for empty or whitespace-only
   * strings; { valid: true } otherwise.
   *
   * References: Requirements 3.3, 3.6
   *
   * @param {string} description
   * @returns {{ valid: boolean, message?: string }}
   */
  function _validateDescription(description) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      return { valid: false, message: 'Task description cannot be empty.' };
    }
    return { valid: true };
  }

  // ── ID generation ──────────────────────────────────────────────────────────

  /**
   * _generateId() — produce a unique string ID.
   *
   * Uses crypto.randomUUID() where available; falls back to a timestamp +
   * random suffix combination.
   *
   * @returns {string}
   */
  function _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ── Storage warning helper ─────────────────────────────────────────────────

  /**
   * _showStorageWarning(message) — display the storage warning banner.
   *
   * Delegates to the shared showStorageWarning helper if available, otherwise
   * falls back to a direct DOM manipulation.
   *
   * @param {string} message
   */
  function _showStorageWarning(message) {
    if (typeof showStorageWarning === 'function') {
      showStorageWarning(message);
    } else {
      const banner = document.getElementById('storage-warning');
      if (banner) {
        banner.textContent = message;
        banner.hidden = false;
      }
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * _save() — write the current in-memory task array to localStorage.
   *
   * If Storage.set returns { ok: false }, the storage warning banner is shown.
   *
   * References: Requirements 5.2, 5.3
   */
  function _save() {
    const result = Storage.set(Storage.KEYS.TASKS, _tasks);
    if (result && result.ok === false) {
      _showStorageWarning(
        'Could not save tasks: ' + (result.error || 'storage unavailable') +
        '. Click to dismiss.'
      );
    }
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  /**
   * _getSortedTasks() — return a sorted copy of _tasks based on _sortMode.
   *
   * 'alpha'  — alphabetical by description (case-insensitive), regardless of
   *            completion state.
   * 'status' — incomplete tasks first, completed tasks last; within each
   *            group the original insertion order is preserved.
   * 'none'   — original insertion order (no sort).
   *
   * The source _tasks array is never mutated.
   *
   * @returns {Task[]}
   */
  function _getSortedTasks() {
    const copy = _tasks.slice();
    if (_sortMode === 'alpha') {
      copy.sort((a, b) =>
        a.description.localeCompare(b.description, undefined, { sensitivity: 'base' })
      );
    } else if (_sortMode === 'status') {
      copy.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1; // incomplete (false) before complete (true)
      });
    }
    return copy;
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  /**
   * _render() — clear the task container and rebuild it from the sorted view
   * of the in-memory array.
   */
  function _render() {
    if (!_containerEl) return;

    _containerEl.innerHTML = '';

    _getSortedTasks().forEach((task) => {
      const li = document.createElement('li');
      if (task.completed) {
        li.classList.add('completed');
      }

      // Toggle checkbox.
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Toggle completion for: ' + task.description);
      checkbox.dataset.action = 'toggle';
      checkbox.dataset.taskId = task.id;

      // Description span.
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Edit button.
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);
      editBtn.dataset.action = 'edit';
      editBtn.dataset.taskId = task.id;

      // Delete button.
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = '🗑️';
      deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.description);
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.taskId = task.id;

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      _containerEl.appendChild(li);
    });
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * _addTask(description) — validate, create, and persist a new task.
   *
   * Trims the description, validates it, generates a UUID, pushes the new
   * Task object to the in-memory array, then calls _save() and _render().
   *
   * References: Requirements 3.2, 3.3, 3.11
   *
   * @param {string} description
   * @returns {{ ok: boolean, message?: string }}
   */
  function _addTask(description) {
    const trimmed = (description || '').trim();
    const validation = _validateDescription(trimmed);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }

    // Duplicate check — case-insensitive comparison against existing descriptions.
    const isDuplicate = _tasks.some(
      (t) => t.description.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return { ok: false, message: `"${trimmed}" already exists in your task list.` };
    }

    const task = {
      id: _generateId(),
      description: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    _tasks.push(task);
    _save();
    _render();
    return { ok: true };
  }

  /**
   * _editTask(id, newDescription) — validate and update an existing task's
   * description.
   *
   * Finds the task by id, validates the new description, updates the
   * description to the trimmed value, then calls _save() and _render().
   *
   * References: Requirements 3.5, 3.6
   *
   * @param {string} id
   * @param {string} newDescription
   * @returns {{ ok: boolean, message?: string }}
   */
  function _editTask(id, newDescription) {
    const trimmed = (newDescription || '').trim();
    const validation = _validateDescription(trimmed);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }

    const task = _tasks.find((t) => t.id === id);
    if (!task) {
      return { ok: false, message: 'Task not found.' };
    }

    task.description = trimmed;
    _save();
    _render();
    return { ok: true };
  }

  /**
   * _toggleTask(id) — flip the completed state of a task.
   *
   * Finds the task by id, inverts its completed boolean, then calls _save()
   * and _render().
   *
   * References: Requirements 3.7, 3.8
   *
   * @param {string} id
   */
  function _toggleTask(id) {
    const task = _tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    _save();
    _render();
  }

  /**
   * _deleteTask(id) — remove a task from the in-memory array.
   *
   * Filters out the task with the given id, then calls _save() and _render().
   *
   * References: Requirements 3.9
   *
   * @param {string} id
   */
  function _deleteTask(id) {
    _tasks = _tasks.filter((t) => t.id !== id);
    _save();
    _render();
  }

  // ── Inline edit helpers ────────────────────────────────────────────────────

  /**
   * _startInlineEdit(li, taskId, currentDescription) — replace the <li>
   * content with an inline edit input.
   *
   * On Enter: confirm via _editTask; show inline error if validation fails.
   * On Escape: cancel and restore original content via _render().
   *
   * @param {HTMLLIElement} li
   * @param {string} taskId
   * @param {string} currentDescription
   */
  function _startInlineEdit(li, taskId, currentDescription) {
    // Preserve the original children so we can restore on Escape.
    const originalHTML = li.innerHTML;

    // Build the inline edit UI.
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentDescription;
    input.className = 'task-edit-input';
    input.setAttribute('aria-label', 'Edit task description');

    const errorSpan = document.createElement('span');
    errorSpan.role = 'alert';
    errorSpan.className = 'task-edit-error';
    errorSpan.style.color = '#dc2626';
    errorSpan.style.fontSize = '13px';
    errorSpan.hidden = true;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = '✔';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '✖';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');

    li.innerHTML = '';
    li.appendChild(input);
    li.appendChild(errorSpan);
    li.appendChild(confirmBtn);
    li.appendChild(cancelBtn);

    input.focus();
    input.select();

    function confirm() {
      const result = _editTask(taskId, input.value);
      if (!result.ok) {
        errorSpan.textContent = result.message || 'Description cannot be empty.';
        errorSpan.hidden = false;
        input.focus();
      }
      // On success _render() has already been called, replacing the <li>.
    }

    function cancel() {
      // Restore original content without mutating state.
      li.innerHTML = originalHTML;
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });

    confirmBtn.addEventListener('click', confirm);
    cancelBtn.addEventListener('click', cancel);
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * init() — load persisted tasks, render the list, and wire up event
   * listeners.
   *
   * Uses a single delegated click listener on the task container to handle
   * toggle, edit, and delete actions. Handles the add-task form submit event
   * separately.
   *
   * References: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   *
   * @returns {void}
   */
  function init() {
    // Query DOM references.
    _containerEl = document.getElementById('task-container');
    _formEl      = document.getElementById('task-form');
    _inputEl     = document.getElementById('task-input');
    _errorEl     = document.getElementById('task-input-error');

    // Load persisted tasks; fall back to [] on any failure.
    try {
      const stored = Storage.get(Storage.KEYS.TASKS);
      _tasks = Array.isArray(stored) ? stored : [];
    } catch (e) {
      _tasks = [];
    }

    // Populate the DOM from the loaded data.
    _render();

    // ── Delegated click listener on the task container ─────────────────────
    if (_containerEl) {
      _containerEl.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const taskId = target.dataset.taskId;

        if (!action || !taskId) return;

        if (action === 'toggle') {
          _toggleTask(taskId);
        } else if (action === 'delete') {
          _deleteTask(taskId);
        } else if (action === 'edit') {
          // Find the task and its current description.
          const task = _tasks.find((t) => t.id === taskId);
          if (!task) return;
          // Find the parent <li> of the clicked button.
          const li = target.closest('li');
          if (!li) return;
          _startInlineEdit(li, taskId, task.description);
        }
      });
    }

    // ── Add-task form submit ───────────────────────────────────────────────
    if (_formEl) {
      _formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = _inputEl ? _inputEl.value : '';
        const result = _addTask(description);

        if (result.ok) {
          // Clear the input and hide any previous error.
          if (_inputEl) _inputEl.value = '';
          if (_errorEl) {
            _errorEl.textContent = '';
            _errorEl.hidden = true;
          }
        } else {
          // Show inline validation message.
          if (_errorEl) {
            _errorEl.textContent = result.message || 'Task description cannot be empty.';
            _errorEl.hidden = false;
          }
        }
      });
    }

    // ── Sort buttons ───────────────────────────────────────────────────────
    const sortBtns = document.querySelectorAll('#task-list .sort-btn');
    sortBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        _sortMode = btn.dataset.sort;
        // Update active state on task sort buttons only.
        sortBtns.forEach((b) => b.classList.toggle('sort-btn--active', b === btn));
        _render();
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    _validateDescription,
    _addTask,
    _editTask,
    _toggleTask,
    _deleteTask,
    _render,
    _save,
  };
})();

/**
 * QuickLinks — persistent shortcut buttons that open URLs in a new tab.
 *
 * Owns the #quick-links DOM section. Uses event delegation on the links
 * container to handle delete actions. Maintains an in-memory array of Link
 * objects as the single source of truth; the DOM is always derived from this
 * array via a full re-render on any mutation.
 *
 * References: Requirements 4.1–4.7, 5.2, 5.3
 */
const QuickLinks = (() => {
  // ── Closure state ──────────────────────────────────────────────────────────
  let _links = [];             // in-memory array of Link objects
  let _linkSortMode = 'none';  // 'none' | 'alpha'

  // ── DOM references (set in init) ───────────────────────────────────────────
  let _containerEl = null;   // <div id="links-container">
  let _formEl = null;        // <form id="link-form">
  let _labelInputEl = null;  // <input id="link-label-input">
  let _urlInputEl = null;    // <input id="link-url-input">
  let _labelErrorEl = null;  // <span id="link-label-error">
  let _urlErrorEl = null;    // <span id="link-url-error">

  // ── Pure helpers ───────────────────────────────────────────────────────────

  /**
   * _normalizeUrl(url) — ensure a URL has a scheme.
   *
   * If the url does not start with "http://" or "https://", prepend "https://".
   * Returns the url unchanged if it already has a recognised scheme.
   *
   * This function is idempotent: applying it twice produces the same result as
   * applying it once (Property 11).
   *
   * References: Requirements 4.4
   *
   * @param {string} url
   * @returns {string}
   */
  function _normalizeUrl(url) {
    const trimmed = (url || '').trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return 'https://' + trimmed;
  }

  /**
   * _validateLink(label, url) — check that both label and url are non-empty.
   *
   * Returns { valid: false, message, field } when either field is empty or
   * whitespace-only; { valid: true } otherwise.
   *
   * References: Requirements 4.3
   *
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: boolean, message?: string, field?: 'label'|'url' }}
   */
  function _validateLink(label, url) {
    if (typeof label !== 'string' || label.trim().length === 0) {
      return { valid: false, message: 'Label cannot be empty.', field: 'label' };
    }
    if (typeof url !== 'string' || url.trim().length === 0) {
      return { valid: false, message: 'URL cannot be empty.', field: 'url' };
    }
    return { valid: true };
  }

  // ── ID generation ──────────────────────────────────────────────────────────

  /**
   * _generateId() — produce a unique string ID.
   *
   * Uses crypto.randomUUID() where available; falls back to a timestamp +
   * random suffix combination.
   *
   * @returns {string}
   */
  function _generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ── Storage warning helper ─────────────────────────────────────────────────

  /**
   * _showStorageWarning(message) — display the storage warning banner.
   *
   * Delegates to the shared showStorageWarning helper if available, otherwise
   * falls back to direct DOM manipulation.
   *
   * @param {string} message
   */
  function _showStorageWarning(message) {
    if (typeof showStorageWarning === 'function') {
      showStorageWarning(message);
    } else {
      const banner = document.getElementById('storage-warning');
      if (banner) {
        banner.textContent = message;
        banner.hidden = false;
      }
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * _save() — write the current in-memory links array to localStorage.
   *
   * If Storage.set returns { ok: false }, the storage warning banner is shown.
   *
   * References: Requirements 5.2, 5.3
   */
  function _save() {
    const result = Storage.set(Storage.KEYS.LINKS, _links);
    if (result && result.ok === false) {
      _showStorageWarning(
        'Could not save links: ' + (result.error || 'storage unavailable') +
        '. Click to dismiss.'
      );
    }
  }

  // ── Sorting ────────────────────────────────────────────────────────────────

  /**
   * _getSortedLinks() — return a view of _links based on _linkSortMode.
   *
   * 'alpha' — A–Z by label (case-insensitive), left to right.
   * 'none'  — insertion order, newest at the end (right).
   *
   * The source _links array is never mutated.
   *
   * @returns {Link[]}
   */
  function _getSortedLinks() {
    const copy = _links.slice();
    if (_linkSortMode === 'alpha') {
      copy.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      );
    }
    // 'none' — already in insertion order, newest last (rightmost).
    return copy;
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function _render() {
    if (!_containerEl) return;

    _containerEl.innerHTML = '';

    _getSortedLinks().forEach((link) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'quick-link-item';

      // Link anchor — opens in a new tab.
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'quick-link-anchor';

      // Delete button.
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = '🗑️';
      deleteBtn.setAttribute('aria-label', 'Delete link: ' + link.label);
      deleteBtn.dataset.action = 'delete-link';
      deleteBtn.dataset.linkId = link.id;

      wrapper.appendChild(anchor);
      wrapper.appendChild(deleteBtn);
      _containerEl.appendChild(wrapper);
    });
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  /**
   * _addLink(label, url) — validate, normalise, create, and persist a new link.
   *
   * Trims the label, validates both fields, normalises the URL, generates a
   * UUID, pushes the new Link object to the in-memory array, then calls
   * _save() and _render().
   *
   * References: Requirements 4.2, 4.4, 4.6
   *
   * @param {string} label
   * @param {string} url
   * @returns {{ ok: boolean, message?: string, field?: 'label'|'url' }}
   */
  function _addLink(label, url) {
    const trimmedLabel = (label || '').trim();
    const trimmedUrl   = (url   || '').trim();

    const validation = _validateLink(trimmedLabel, trimmedUrl);
    if (!validation.valid) {
      return { ok: false, message: validation.message, field: validation.field };
    }

    const link = {
      id:    _generateId(),
      label: trimmedLabel,
      url:   _normalizeUrl(trimmedUrl),
    };

    _links.push(link);
    _save();
    _render();
    return { ok: true };
  }

  /**
   * _deleteLink(id) — remove a link from the in-memory array.
   *
   * Filters out the link with the given id, then calls _save() and _render().
   *
   * References: Requirements 4.6
   *
   * @param {string} id
   */
  function _deleteLink(id) {
    _links = _links.filter((l) => l.id !== id);
    _save();
    _render();
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * init() — load persisted links, render the list, and wire up event
   * listeners.
   *
   * Uses a single delegated click listener on the links container to handle
   * delete actions. Handles the add-link form submit event separately.
   *
   * References: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 4.7
   *
   * @returns {void}
   */
  function init() {
    // Query DOM references.
    _containerEl  = document.getElementById('links-container');
    _formEl       = document.getElementById('link-form');
    _labelInputEl = document.getElementById('link-label-input');
    _urlInputEl   = document.getElementById('link-url-input');
    _labelErrorEl = document.getElementById('link-label-error');
    _urlErrorEl   = document.getElementById('link-url-error');

    // Load persisted links; fall back to [] on any failure.
    try {
      const stored = Storage.get(Storage.KEYS.LINKS);
      _links = Array.isArray(stored) ? stored : [];
    } catch (e) {
      _links = [];
    }

    // Populate the DOM from the loaded data.
    _render();

    // ── Delegated click listener on the links container ────────────────────
    if (_containerEl) {
      _containerEl.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const linkId = target.dataset.linkId;

        if (action === 'delete-link' && linkId) {
          _deleteLink(linkId);
        }
      });
    }

    // ── Add-link form submit ───────────────────────────────────────────────
    if (_formEl) {
      _formEl.addEventListener('submit', (e) => {
        e.preventDefault();

        const label = _labelInputEl ? _labelInputEl.value : '';
        const url   = _urlInputEl   ? _urlInputEl.value   : '';

        // Clear previous error messages.
        if (_labelErrorEl) { _labelErrorEl.textContent = ''; _labelErrorEl.hidden = true; }
        if (_urlErrorEl)   { _urlErrorEl.textContent   = ''; _urlErrorEl.hidden   = true; }

        const result = _addLink(label, url);

        if (result.ok) {
          // Clear inputs on success.
          if (_labelInputEl) _labelInputEl.value = '';
          if (_urlInputEl)   _urlInputEl.value   = '';
        } else {
          // Show inline validation message on the appropriate field.
          if (result.field === 'label' && _labelErrorEl) {
            _labelErrorEl.textContent = result.message;
            _labelErrorEl.hidden = false;
          } else if (result.field === 'url' && _urlErrorEl) {
            _urlErrorEl.textContent = result.message;
            _urlErrorEl.hidden = false;
          }
        }
      });
    }

    // ── Link sort buttons ──────────────────────────────────────────────────
    const linkSortBtns = document.querySelectorAll('#quick-links .link-sort-btn');
    linkSortBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        _linkSortMode = btn.dataset.sort;
        linkSortBtns.forEach((b) =>
          b.classList.toggle('sort-btn--active', b === btn)
        );
        _render();
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    _normalizeUrl,
    _validateLink,
    _addLink,
    _deleteLink,
    _render,
    _save,
  };
})();

// ── Shared storage warning helper ─────────────────────────────────────────

/**
 * showStorageWarning(message) — display the storage warning banner.
 *
 * Un-hides #storage-warning, sets its text content to message, and
 * auto-dismisses after 5 seconds or immediately on click.
 *
 * This function is defined in the outer scope so that TaskList and QuickLinks
 * can delegate to it via their internal `typeof showStorageWarning` checks.
 *
 * References: Requirements 5.3
 *
 * @param {string} message
 */
// eslint-disable-next-line no-var
var showStorageWarning = (function () {
  let _dismissTimer = null;

  return function showStorageWarning(message) {
    const banner = document.getElementById('storage-warning');
    if (!banner) return;

    // Cancel any pending auto-dismiss from a previous call.
    if (_dismissTimer !== null) {
      clearTimeout(_dismissTimer);
      _dismissTimer = null;
    }

    // Show the banner with the provided message.
    banner.textContent = message;
    banner.hidden = false;

    // Dismiss helper — hides the banner and removes the click listener.
    function dismiss() {
      banner.hidden = true;
      banner.removeEventListener('click', dismiss);
      if (_dismissTimer !== null) {
        clearTimeout(_dismissTimer);
        _dismissTimer = null;
      }
    }

    // Auto-dismiss after 5 seconds.
    _dismissTimer = setTimeout(dismiss, 5000);

    // Also dismiss on click.
    banner.addEventListener('click', dismiss);
  };
}());

// ── Dark mode toggle ───────────────────────────────────────────────────────
(function () {
  const btn = document.getElementById('dark-mode-toggle');
  if (!btn) return;

  // Restore preference from localStorage.
  const saved = localStorage.getItem('tld_dark_mode');
  if (saved === 'true') {
    document.documentElement.classList.add('dark');
    btn.textContent = 'Light Mode';
  }

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('tld_dark_mode', isDark);
  });
}());

// ── Bootstrap ──────────────────────────────────────────────────────────────
// Initialise all modules once the DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
  // Validate localStorage availability; warn the user if it is unavailable.
  const storageResult = Storage.init();
  if (!storageResult.available) {
    showStorageWarning(
      'localStorage is unavailable. Your data will not be saved. ' +
      'Click to dismiss.'
    );
  }

  GreetingWidget.init();
  FocusTimer.init();
  TaskList.init();
  QuickLinks.init();
});
