import type { ShoppingListItem } from '@/composables/items';
import { buildItemsSearchFilteredView } from '@/composables/itemsSearchFilter';

function item(
  id: string,
  name: string,
  note = '',
  children?: ShoppingListItem[],
): ShoppingListItem {
  return { id, name, note, checked: false, children };
}

describe('buildItemsSearchFilteredView', () => {
  const cheddar = item('cheddar', 'Cheddar');
  const yogurt = item('yogurt', 'Yogurt', 'milk culture');
  const cheese = item('cheese', 'Cheese', '', [cheddar]);
  const dairy = item('dairy', 'Dairy', '', [cheese, yogurt]);
  const bread = item('bread', 'Bread', 'milk bread');
  const roots = [dairy, bread];

  it('matches item names only, case-insensitively, and ignores surrounding spaces', () => {
    const byName = buildItemsSearchFilteredView(roots, '  CHED  ');
    expect(byName.roots).toEqual([dairy]);

    const byNote = buildItemsSearchFilteredView(roots, '  MILK  ');
    expect(byNote.roots).toEqual([]);
  });

  it('keeps ancestors of a match and only the visible children', () => {
    const view = buildItemsSearchFilteredView(roots, 'cheddar');

    expect(view.roots).toEqual([dairy]);
    expect(view.childMap.get('dairy')).toEqual([cheese]);
    expect(view.childMap.get('cheese')).toEqual([cheddar]);
    expect(view.childMap.has('yogurt')).toBe(false);
    expect(view.childMap.has('bread')).toBe(false);
  });

  it('returns no roots when nothing matches', () => {
    const view = buildItemsSearchFilteredView(roots, 'apples');

    expect(view.roots).toEqual([]);
    expect(view.childMap.size).toBe(0);
  });

  it('shows the full tree for an empty query', () => {
    const view = buildItemsSearchFilteredView(roots, '   ');

    expect(view.roots).toEqual(roots);
    expect(view.childMap.get('dairy')).toEqual([cheese, yogurt]);
    expect(view.childMap.get('cheese')).toEqual([cheddar]);
  });
});
