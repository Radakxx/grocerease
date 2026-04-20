# Grocerease — product requirements

This document describes **implemented** behavior: what the app does today, as reflected in the source code. It is not a roadmap unless a feature is explicitly called out as unavailable.

---

## Platform and architecture

- **Stack:** Ionic Vue (Vue 3), Vue Router, Capacitor (native filesystem and app lifecycle).
- **Persistence:** Lists and settings are stored as JSON files under Capacitor’s app **Data** directory using UTF-16 encoding (`itemslist.json`, `onetimeitems.json`, `settings.json`, `shoppinghistory.json`).
- **Identity:** Tree items receive a `crypto.randomUUID()` when missing, so nested structures remain addressable after load.

---

## Navigation and shell

- **Default route:** `/` redirects to **`/tabs/tab2`** (Shopping list).
- **Tabs:** Two tabs — **Items** (`/tabs/tab1`) and **Shopping list** (`/tabs/tab2`).
- **Header:** Title reflects the active tab (“Items” or “Shopping list”); a **settings** control opens Settings on both tabs.
- **Items tab header:** Includes a **search** field (native `input type="search"`), a **clear** control when the query is non-empty, and settings. Search uses shared state so the list and header stay in sync.
- **Floating add button:** A centered FAB above the tab bar invokes a **tab-specific** action: **Add item** on Items, **Add one-time item** on Shopping list. Styling differs per tab (green vs orange).

---

## Items tab (master catalog)

### Data model

- Items form a **tree:** each node has a name, optional note, `checked` (whether it is on the shopping list), optional `children`, and separate expansion flags for the Items UI vs the Shopping list UI.
- **Checked** on the Items tab means the same as elsewhere: the item is treated as **on the shopping list**.

### Viewing and expanding

- Rows are **indented by depth** (20px per level).
- **Expand/collapse** applies to nodes with children. During **search**, matching branches stay visible; ancestors of matches are included; the filter drives which children appear. While search is active, expand **caret interaction is disabled** (subtrees follow the filter).

### Adding and editing items

- **Add** opens a modal: item name, optional **parent** (popover picker listing possible parents — every node except the item being edited and its descendants, to avoid cycles).
- **Edit** opens the same modal (title includes the item name): name, optional **note**, **checked** toggle, parent selector, and when editing, **sub-items** (add by name with duplicate guard, list with remove).
- **Duplicate names:** At the same **sibling** level only, names are compared case-insensitively after trim. If a duplicate exists, the user is prompted to **cancel** or **add anyway** (applies to top-level add/edit and duplicate sub-item names in the edit modal).
- **Confirming add** requires a non-empty trimmed name.

### Checkboxes (Items tab)

- **Checking** an item sets it checked and **checks all descendants** (skipping already-checked descendants only in the recursive check helper — effectively all descendants end checked).
- **Unchecking** unchecks the item and **unchecks all descendants**.

### Notes

- **Swipe right** (or the “Add with note” option) opens **Add note**. Confirming saves the note text (trimmed), sets the item **checked**, and **checks all descendants** (same as checking the parent).
- **Swipe left** exposes **Delete**; confirming deletes the item and **all descendants**. Deleting a child can collapse a parent if it had no children left.

### Sorting (Settings — see below)

Three **mutually exclusive** modes:

1. **Creation order (default):** Both “custom sorting” and “alphabetical” are off. New items are inserted at the **beginning** of the root list or parent’s children.
2. **Custom sorting:** Drag-and-drop **reorder** handles appear. Root and nested levels each use reorder groups. Reordering is **disabled** when search is active, when **any root** item is expanded (root level), or when **any sibling at that parent’s level** is expanded (nested level).
3. **Alphabetical:** Entire tree is sorted **recursively** by name using `localeCompare` (case-insensitive, locale-aware). Toggling alphabetical on sorts the existing tree; new/edited items are placed in alphabetical order at their level.

### Search (Items tab only)

- **Filter:** Case-insensitive **substring** match on **item name** only (not note).
- **Behavior:** Only branches that contain a match or a matching descendant are shown; a map supplies visible children per parent during search. Reordering is disabled while search is active.

---

## Shopping list tab

### What appears on the list

- **One-time items** (see below) render **first**, then **regular** items from the master tree.
- **Regular items:** The tab shows the subtree of items that are **checked** in the master catalog. A parent may appear as a **header row** (no checkbox) if it is not checked but has checked descendants; fully checked nodes show a row with name, optional note, and the completion control.
- **Checkbox semantics (Shopping list):** The control is **inverted** visually: an item still “on the list” shows an **unchecked** box; marking it **checked** means **done** — the app **unchecks** the master item, **clears its note**, and (with history) records an undo snapshot first.

### One-time items

- Added via the FAB: **name** (required) and **note** (optional).
- Stored separately, persisted to `onetimeitems.json`.
- Shown at the **top** of the shopping list list.
- When the user checks one off, it is **removed** from the one-time list (and persisted). With history enabled, a snapshot is stored before removal.

### Expansion on the Shopping list

- Uses `expandedShoppingList` (separate from Items-tab expansion).
- When an item **becomes checked** (from the Items tab or elsewhere), the app **expands that node and all descendants** on the Shopping list so the new selection is visible.

### Empty state

- “Your list is empty” appears when there are **no** checked regular items, **no** one-time items, **and** either history is off **or** the history list is empty. If history is enabled and has entries, that banner is suppressed even when the active list has no lines.

---

## History (optional)

- **Setting:** “Enable history” in Settings. Persisted; when turned **off**, persisted history is **flushed** and cleared from storage.
- **When enabled:** Completing a **regular** item on the Shopping list or checking off a **one-time** item stores a **snapshot** (including nested structure for regular items). Newest entries appear **first**. Duplicate logical entries for the same source id are **replaced** (upsert).
- **UI:** A **History** section lists entries (tap target). **Tap an entry** to **undo**: for regular items, **checked** state is restored from the snapshot by id (name/note on live items are not overwritten); deleted tree nodes are not recreated. For one-time items, the item is **restored** to the one-time list. The entry is removed after undo.
- **Flush:** A bottom **Flush** control clears all history entries.

---

## Settings modal

- **Sorting:** Toggles for **custom sorting**, **alphabetical sort**, and a **read-only** indicator for **creation order (default)** — the latter reflects “both others off.”
- **History:** Toggle as above.
- **Import CSV:** Button present but **disabled**; not implemented (commented as future).
- **Share shopping list:** Builds a text representation: one-time lines first (`name` + optional note), then checked regular items in tree order with **two spaces per depth** for indentation; lines joined with `,\n`. Copies to the **clipboard** when available and shows a short **toast**; if nothing is on the list, share does nothing useful (console log).
- **Info:** Static marketing text and copyright line.

---

## Persistence and lifecycle

- **Startup (`App.vue`):** Registers the Android-style **back** handler to **exit the app**; loads **settings** from disk.
- **Items / one-time:** Loaded when components using `useItemsList` mount; **deep watch** saves the main list and one-time list on changes.
- **Settings:** Saved when any of the three toggles changes.
- **History:** Loaded when `useHistory` mounts; saved on add, flush, or remove.

---

## Explicit non-features or limitations

- **CSV import:** UI stub only; no import logic.
- **Share:** Clipboard only (no native share sheet in code).

---

## Document maintenance

Update this file when user-visible behavior or persistence contracts change, so it stays an accurate description of the running app.
