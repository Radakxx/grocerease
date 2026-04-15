import type { ShoppingListItem } from '@/composables/items';

export type ItemsSearchFilteredView = {
  roots: ShoppingListItem[];
  childMap: Map<string, ShoppingListItem[]>;
};

/**
 * Returns roots and a map of parent id → visible children (same object refs).
 * Name-only, case-insensitive substring match. Ancestors of matches are included.
 */
export function buildItemsSearchFilteredView(
  roots: ShoppingListItem[],
  queryRaw: string
): ItemsSearchFilteredView {
  const q = queryRaw.trim().toLowerCase();
  const childMap = new Map<string, ShoppingListItem[]>();

  function walk(list: ShoppingListItem[]): ShoppingListItem[] {
    const out: ShoppingListItem[] = [];
    for (const item of list) {
      const nameMatch = item.name.toLowerCase().includes(q);
      const source = item.children && item.children.length > 0 ? item.children : [];
      const childOut = source.length > 0 ? walk(source) : [];
      if (nameMatch || childOut.length > 0) {
        out.push(item);
        if (item.id != null) {
          childMap.set(item.id, childOut);
        }
      }
    }
    return out;
  }

  return { roots: walk(roots), childMap };
}
