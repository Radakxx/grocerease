import type { OneTimeItem, ShoppingListItem } from '@/composables/items';
import type { OneTimeItemSnapshot, RegularItemSnapshot } from '@/composables/history';

/** Mark a shopping-list row done: take it off the list and clear its note. */
export function completeRegularItem(item: ShoppingListItem): void {
  item.checked = false;
  item.note = '';
}

/**
 * Completing a regular row records history first, while the note and checked
 * flag still describe the line that was on the list.
 */
export async function finishRegularItem(
  item: ShoppingListItem,
  checked: boolean,
  historyEnabled: boolean,
  recordHistory: (item: ShoppingListItem) => Promise<void>,
): Promise<void> {
  if (!checked) return;
  if (historyEnabled) {
    await recordHistory(item);
  }
  completeRegularItem(item);
}

/** Checking off a one-time row records history, then removes it. */
export async function finishOneTimeItem(
  item: OneTimeItem,
  index: number,
  checked: boolean,
  historyEnabled: boolean,
  recordHistory: (item: OneTimeItem) => Promise<void>,
  removeAt: (index: number) => Promise<void>,
): Promise<void> {
  if (!checked) return;
  if (historyEnabled) {
    await recordHistory(item);
  }
  await removeAt(index);
}

export function findRegularItemById(
  list: ShoppingListItem[],
  id: string,
): ShoppingListItem | null {
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findRegularItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Restore only checked state from history. Live name and note stay as they are,
 * and a child that no longer exists is not recreated.
 */
export function applyRegularSnapshotToActive(
  activeNode: ShoppingListItem,
  snapshotNode: RegularItemSnapshot,
): void {
  activeNode.checked = snapshotNode.checked;

  if (!snapshotNode.children) return;
  if (!activeNode.children) return;

  for (const snapChild of snapshotNode.children) {
    const activeChild = activeNode.children.find((child) => child.id === snapChild.id);
    if (activeChild) {
      applyRegularSnapshotToActive(activeChild, snapChild);
    }
  }
}

/** Returns false when the source item is gone, without adding a replacement. */
export function restoreRegularFromHistory(
  items: ShoppingListItem[],
  sourceItemId: string,
  snapshot: RegularItemSnapshot,
): boolean {
  const activeRoot = findRegularItemById(items, sourceItemId);
  if (!activeRoot) return false;
  applyRegularSnapshotToActive(activeRoot, snapshot);
  return true;
}

export function restoreOneTimeFromSnapshot(
  list: OneTimeItem[],
  snapshot: OneTimeItemSnapshot,
): void {
  list.unshift({
    id: snapshot.id,
    name: snapshot.name,
    note: snapshot.note,
    checked: snapshot.checked,
  });
}

export function expandItemAndDescendants(item: ShoppingListItem): void {
  item.expandedShoppingList = true;
  if (item.children) {
    for (const child of item.children) {
      expandItemAndDescendants(child);
    }
  }
}

function collectCheckedItems(
  itemList: ShoppingListItem[],
  checkedSet: Set<ShoppingListItem>,
): void {
  for (const item of itemList) {
    if (item.checked) checkedSet.add(item);
    if (item.children) collectCheckedItems(item.children, checkedSet);
  }
}

/** Expand items that just became checked, and return the set that is checked now. */
export function expandNewlyChecked(
  items: ShoppingListItem[],
  previouslyChecked: Set<ShoppingListItem>,
): Set<ShoppingListItem> {
  const currentlyChecked = new Set<ShoppingListItem>();
  collectCheckedItems(items, currentlyChecked);
  for (const item of currentlyChecked) {
    if (!previouslyChecked.has(item)) {
      expandItemAndDescendants(item);
    }
  }
  return currentlyChecked;
}

export function hasCheckedDescendants(item: ShoppingListItem): boolean {
  if (!item.children) return false;
  for (const child of item.children) {
    if (child.checked) return true;
    if (hasCheckedDescendants(child)) return true;
  }
  return false;
}

export type ShoppingListRowKind = 'row' | 'header' | 'hidden';

/** A checked node is a row. An unchecked node with checked descendants is a header. */
export function shoppingListRowKind(item: ShoppingListItem): ShoppingListRowKind {
  if (item.checked) return 'row';
  if (hasCheckedDescendants(item)) return 'header';
  return 'hidden';
}

/** One-time lines first, then checked regular items indented by two spaces per depth. */
export function collectShoppingListLabels(
  oneTimeItems: OneTimeItem[],
  items: ShoppingListItem[],
): string[] {
  const labels: string[] = [];

  for (const item of oneTimeItems) {
    const label = item.note ? `${item.name} ${item.note}` : item.name;
    labels.push(label);
  }

  const walk = (list: ShoppingListItem[], depth: number) => {
    for (const item of list) {
      if (item.checked) {
        const label = item.note ? `${item.name} ${item.note}` : item.name;
        const indent = '  '.repeat(depth);
        labels.push(`${indent}${label}`);
      }
      if (item.children && item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    }
  };

  walk(items, 0);
  return labels;
}

/** Move a sibling, children included, when both indexes are inside the list. */
export function moveItemWithinSiblings<T>(
  list: T[],
  fromIndex: number,
  toIndex: number,
): void {
  if (
    fromIndex >= 0 &&
    fromIndex < list.length &&
    toIndex >= 0 &&
    toIndex < list.length
  ) {
    const moved = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, moved);
  }
}
