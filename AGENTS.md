# Grocerease Agent Guide

This file defines how AI agents should work in this repository.

## Purpose

- Keep changes aligned with product behavior documented in `REQUIREMENTS.md`.
- Produce small, safe, reviewable diffs.
- Preserve app stability across Items, Shopping list, Settings, and persistence flows.

## Source Of Truth

- Product behavior and feature expectations: `REQUIREMENTS.md`.
- Setup and commands: `README.md`.
- Existing implementation patterns in `src/components/`, `src/views/`, and `src/composables/`.

If code and docs disagree, update code and docs together in the same change.

## Scope And Boundaries

- Prefer minimal, task-focused edits.
- Do not refactor unrelated files while fixing a scoped issue.
- Do not remove or rename files unless required by the task.
- Do not introduce new dependencies unless clearly necessary.

## Technical Constraints

- Stack is Ionic + Vue 3 + TypeScript + Capacitor.
- Persisted app data uses Capacitor Filesystem JSON files in app Data storage.
- Preserve compatibility with existing data shape for:
  - `itemslist.json`
  - `onetimeitems.json`
  - `settings.json`
  - `shoppinghistory.json`
- Keep tree item identity stable (`id`) and avoid breaking parent/child behavior.

## Behavior-Sensitive Areas

When modifying these areas, verify behavior explicitly:

- Items tab tree operations (add/edit/delete/reparent/nested children).
- Checked-state propagation to descendants.
- Sorting modes (creation order, custom reorder, alphabetical).
- Search filtering behavior and visibility of ancestors/children.
- Shopping list completion semantics (regular vs one-time items).
- History create/undo/flush behavior.
- Settings toggles and persistence side effects.
- Share shopping list formatting and clipboard flow.

## Coding Conventions

- Match existing style in surrounding files.
- Keep functions focused and names explicit.
- Add comments only for non-obvious logic.
- Avoid broad “cleanup” edits not required for the task.

## Validation Checklist

For non-trivial changes, run:

- `npm run lint`
- `npm run test:unit`

For changes touching critical flows, also perform manual checks:

- Add/edit/delete nested items in Items tab.
- Toggle checked state and verify descendant propagation.
- Validate sorting mode behavior and reorder restrictions.
- Complete items in Shopping list and verify notes/history outcomes.
- Toggle settings and confirm persisted behavior after app reload.

## Documentation Policy

- Update `REQUIREMENTS.md` when user-visible behavior changes.
- Update this `AGENTS.md` when engineering workflow or guardrails change.
- Keep both concise and implementation-accurate.

## Git And PR Expectations

- Keep commits focused and descriptive.
- Include a short test plan in PR descriptions.
- Call out behavior changes and corresponding `REQUIREMENTS.md` updates.
- Do not commit secrets or local credential files.

## Definition Of Done

A change is done when all are true:

- Implementation matches requested behavior and existing product requirements.
- Relevant lint/tests pass locally (or failures are explained).
- Docs are updated for any behavior or workflow change.
- Diff is minimal, readable, and ready for review.
