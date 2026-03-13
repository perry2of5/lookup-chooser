 # Implementation Decisions

## Copilot Run Policy
- For repository-wide run requirements, see [.github/copilot-instructions.md](.github/copilot-instructions.md).
- Maintainers should review and follow that file for every implementation run.

## Dialog Behavior
- [x] Close on backdrop click vs. require explicit action
- [ ] Animation duration (currently 200ms) - tune for perceived performance
- [x] Focus management: auto-focus search input on open

## Data Loading
- [ ] Static data vs. API fetch for categories/items
- [ ] Loading states: skeleton screens or spinner
- [ ] Error handling: toast notification or inline message

## Category Switching
- [x] Preload all categories or lazy-load on selection
- [x] Preserve search filter when switching categories
- [x] Show item count badge per category (currently hardcoded)

## Search Functionality
- [x] Filter logic: substring match, case-insensitive (default)
- [x] Debounce search input (ms threshold)
- [ ] Highlight matched text in results
- [x] "No results" state messaging

## Value Selection
- [ ] Click vs. Enter key to select (currently click only)
- [x] Return full object or display string to input
- [x] Allow clearing selected value from main control

## Keyboard Navigation
- [x] Arrow keys to navigate result list
- [x] Tab order: input → lookup button → dialog elements
- [x] Escape closes dialog (implemented)

## Responsive Design
- [ ] Mobile: full-screen dialog vs. current fixed size
- [ ] Breakpoint for master-detail layout (stack on small screens)
- [ ] Touch-friendly tap targets (44px minimum)

## Accessibility
- [ ] ARIA labels for interactive elements
- [ ] Screen reader announcements on state changes
- [ ] Visible focus indicators beyond default outline

### 1. Container Hierarchy & Semantics
*   **Decision:** Replaced generic wrapper `<div>`s with semantic HTML5 tags (`<main>`, `<section>`, `<aside>`, `<header>`).
*   **Rationale:** Improves accessibility (screen readers understand structure better), makes the DOM cleaner for future JavaScript targeting, and clearly
defines the purpose of each region (e.g., `<aside>` for the sidebar navigation vs. `<section>` for the main content).
*   **Structure:** The form is wrapped in a `<main>` container. The dialog acts as a separate modal layer floating above the main content.

### 2. Master-Detail Layout (Dialog)
*   **Decision:** Implemented a split-pane layout within the popup dialog.
    *   **Master (Left):** An `<aside>` column with a fixed width (`w-64`). This holds high-level categories (Locations, Departments). It features sticky
headers and distinct active/inactive states.
    *   **Detail (Right):** A flexible `<section>` column (`w-[calc(100%-16rem)]`). This displays the specific items belonging to the selected category.
*   **Rationale:** This layout allows users to quickly switch contexts (categories) without losing their place in the data list, a standard pattern for
complex lookup screens.

### 3. Search Functionality (Step 2)
*   **Decision:** Placed the search input inside the **Detail View Header**, not just in the main form or the Master list.
*   **Rationale:** This enforces the workflow: Select Category $\rightarrow$ Filter Results. The search bar is given visual priority (icon, focus ring,
shadow) to indicate it is the primary interaction tool for narrowing down results within the selected category.

### 4. Desktop & Tailwind CSS Strategy
*   **Decision:** Designed specifically for desktop screens using fixed/max-width constraints (`max-w-[768px]` for the dialog). Used Tailwind utility
classes for all styling rather than custom CSS (except for specific scrollbar tweaks and animations).
*   **Rationale:** Ensures consistent spacing, typography, and color usage. The design uses standard desktop interaction patterns like hover states on
lists, backdrop blurs, and centered modals.

### 5. Interaction & UX Design
*   **Decision:** Added visual feedback for state changes.
    *   **Input:** Focus rings turn blue (`ring-blue-500`).
    *   **Selection:** Clicking a result updates the main input field with a brief color flash to confirm selection.
    *   **Closing:** Added functionality to close via Backdrop click, X button, or `Esc` key.
*   **Decision:** Used CSS animations (`fade-enter`, `scale`) for the dialog entry/exit.
*   **Rationale:** Makes the interface feel responsive and polished. The user always knows if their action was successful (e.g., value populated).

### 6. Technical Implementation
*   **Decision:** Managed the modal state using vanilla JavaScript class toggling (`hidden`, `fade-enter-active`) rather than native HTML `<dialog>` or
heavy frameworks.
*   **Rationale:** Provides maximum control over the styling and animation timing without dependency overhead. Custom scrollbars were added to the lists
to prevent browser default styles from breaking the clean visual design.

## Lookup Locking Behavior (March 2026)

### 7. Main Input State: Manual vs. Lookup-Locked
*   **Decision:** The main input has two states:
    *   **Manual mode:** White background, editable text.
    *   **Lookup-locked mode:** Light gray background, read-only text, clear (`X`) button visible.
*   **Rationale:** Users can clearly see when a value is sourced from lookup data versus manually entered text.

### 8. What Displays After Lookup Selection
*   **Decision:** After selecting a lookup sub-target:
    *   Input displays the resolved lookup value.
    *   A gray line below the input displays the lookup reference path in format `lookup:Category/Target/Sub-Target`.
*   **Rationale:** Keeps both runtime value and source reference visible for validation and debugging.

### 9. Clearing a Lookup Selection
*   **Decision:** Clicking the `X` button:
    *   Removes lookup lock.
    *   Hides lookup path display.
    *   Restores previous manual input value.
    *   Returns input to editable white-background state.
*   **Rationale:** Provides reversible lookup selection without losing user-entered text from before lookup mode.

### 10. Interaction Rules
*   **Decision:** The Lookup button always remains active, even while locked.
*   **Rationale:** Users can replace one lookup selection with another without clearing first.

### 11. Event Handling Safety
*   **Decision:** Row click handlers in dynamic lists use JavaScript closures (`li.onclick = ...`) instead of inline HTML `onclick` strings.
*   **Rationale:** Avoids escaping bugs for values containing quotes/newlines (for example SSH key material).

### 12. Reopen Behavior: Return to Prior Target Context
*   **Decision:** Reopening the dialog restores the last selected category and target sub-target view when available.
    *   If prior target context exists: open directly to sub-targets for that target.
    *   If prior target context is missing/invalid: fall back to category target list.
*   **Rationale:** Supports quick reselection in the same area without forcing extra clicks.

### 13. Up-Level Navigation from Sub-Targets
*   **Decision:** Added a Back to targets control in the detail header while viewing sub-targets.
*   **Rationale:** Users can move up one level inside the same category without switching categories.

### 14. Stable Control Height Across States
*   **Decision:** The lookup path row under the input always reserves vertical space and toggles visibility instead of entering/leaving layout flow.
*   **Rationale:** Prevents the input/control block from shifting height when toggling between manual and lookup-locked states.

## React Component Decisions (March 2026)

### 15. Service Abstraction Boundary
*   **Decision:** React input components depend on a `LookupService` interface rather than concrete data sources.
*   **Rationale:** Keeps UI logic testable and allows swapping stub, API-backed, or mocked implementations without changing component code.

### 16. Controlled Input Value Model
*   **Decision:** Value shape is structured as `{ source, value, lookupPath }` where source is `manual` or `lookup`.
*   **Rationale:** Preserves provenance for submitted values and supports clear UI states (editable/manual vs. locked/lookup).

### 17. React Dialog Behavior Parity
*   **Decision:** React dialog behavior is kept consistent with prior HTML implementation for the following items:
    *   Close via backdrop click and Escape key.
    *   Auto-focus search on open.
    *   Reopen with prior category/target context and allow Back to targets.
*   **Rationale:** Maintains predictable UX while moving from static HTML to reusable component architecture.

### 18. Clear Action Restores Previous Manual Input
*   **Decision:** Clearing a lookup value restores the previous manual value instead of forcing empty text.
*   **Rationale:** Prevents accidental data loss when users temporarily switch to lookup mode.

### 19. Category Badge Counts in React
*   **Decision:** Category count badges are resolved per category from service target counts filtered by current hints.
*   **Rationale:** Avoids misleading counts and keeps badges aligned with what users can actually select.

### 20. React Test Coverage Scope
*   **Decision:** Added tests for critical behavior paths:
    *   Manual typing for controlled input.
    *   Lookup selection and lookup path payload emission.
    *   Restore previous manual value on clear.
    *   Search auto-focus on open.
    *   Backdrop and Escape close behavior.
    *   No-results state messaging.
*   **Rationale:** These are high-risk interaction paths that commonly regress during UI refactors.

### 21. Hint Interpretation: Ranking, Not Filtering
*   **Decision:** In dialog browsing, all categories, targets, and sub-targets are displayed. Hints are used to choose likely defaults, not to hide options.
*   **Rationale:** Preserves discoverability while still guiding users toward probable selections.

### 22. Hierarchical Focus Progression
*   **Decision:** Focus moves deeper as users choose category and target:
    *   Open (no prior lookup): focus category list with likely category selected.
    *   Select category: focus likely/first target.
    *   Select target: focus likely/first sub-target.
*   **Rationale:** Reduces keystrokes and keeps keyboard workflows aligned with visual hierarchy.

### 23. Reopen and Left-Arrow Up Navigation
*   **Decision:** If a lookup value is already selected, dialog reopens at the selected sub-target; `ArrowLeft` moves up from sub-target to target, then target to category.
*   **Rationale:** Supports quick reselection and predictable directional navigation.