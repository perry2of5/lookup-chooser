# React Lookup Demo

A Vite + React + TypeScript demo that provides reusable lookup-enabled form inputs.

## Tooling

- Build tool: Vite
- Package manager: npm
- Styling: Tailwind CSS
- Test stack: Vitest + React Testing Library + user-event

## Run

```bash
npm install
npm run dev
```

## Build and test

```bash
npm run build
npm run test
```

## Project structure

- `src/services/LookupService.ts`: Lookup service interface and shared types.
- `src/services/StubLookupService.ts`: In-memory stub implementation with sample categories, targets, and sub-targets.
- `src/components/LookupInput.tsx`: Reusable component for manual input or lookup selection.
- `src/pages/ConnectionFormPage.tsx`: Example page with 4 instances: Host, Port, Username, Password.

## LookupInput component

`LookupInput` accepts:

- `hint`: Optional data hints (`valueType`, category allow-list, target allow-list)
- `lookupService`: Any implementation of `LookupService`
- `value`: Current controlled value (`manual` or `lookup` source)
- `onChange`: Callback returning updated structured value

## Behavior

- Users can manually type values.
- Users can open a lookup dialog and select `category -> target -> sub-target`.
- Lookup selections lock the input as read-only and display the lookup path.
- Clear (`x`) restores previous manual value and unlocks the input.
- Dialog supports backdrop close, Escape close, target filtering, and back navigation from sub-targets.
- Target filtering is debounced by 75ms.
- Arrow keys (`Up`, `Down`, `Home`, `End`) navigate category/target/sub-target lists.
- Keyboard usage help is available in the lookup dialog via a `Usage` control (shown on hover/focus, announced by screen readers, and pin-able on click until outside-click or explicit close).
- When no lookup is selected, opening the dialog focuses the category list and highlights the most likely category.
- Selecting a category moves focus to the target list with the most likely target selected (or the first returned target).
- Selecting a target moves focus to sub-targets with the most likely sub-target selected (or the first returned sub-target).
- When a lookup is already selected, reopening returns to the previously selected sub-target and keeps left-arrow navigation to move up levels.
- Dialog tab order remains constrained to dialog controls (focus trap) and supports sensible keyboard progression.

## Implementing a real lookup service

Create a class that implements `LookupService`:

- `getCategories(hint)`
- `getTargets(categoryId, hint)`
- `getSubTargets(categoryId, targetId, hint)`
- `resolveValue(categoryId, targetId, subTargetId)`

Use the same structured output contract so `LookupInput` remains unchanged.
