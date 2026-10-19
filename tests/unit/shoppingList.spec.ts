import type { OneTimeItem, ShoppingListItem } from '@/composables/items';
import type { OneTimeItemSnapshot, RegularItemSnapshot } from '@/composables/history';
import {
  collectShoppingListLabels,
  expandNewlyChecked,
  finishOneTimeItem,
  finishRegularItem,
  moveItemWithinSiblings,
  restoreOneTimeFromSnapshot,
  restoreRegularFromHistory,
  shoppingListRowKind,
} from '@/utils/shoppingList';

function item(
  id: string,
  name: string,
  extras: Partial<ShoppingListItem> = {},
): ShoppingListItem {
  return {
    id,
    name,
    note: '',
    checked: false,
    ...extras,
  };
}

describe('shopping list rules', () => {
  it('records history before clearing a completed regular item, and ignores an uncheck', async () => {
    const milk = item('milk', 'Milk', { note: '2L', checked: true });
    const seen: ShoppingListItem[] = [];

    await finishRegularItem(milk, true, true, async (current) => {
      seen.push({ ...current });
    });

    expect(seen).toEqual([expect.objectContaining({ checked: true, note: '2L' })]);
    expect(milk.checked).toBe(false);
    expect(milk.note).toBe('');

    const bread = item('bread', 'Bread', { note: 'keep', checked: true });
    const record = jest.fn();
    await finishRegularItem(bread, true, false, record);
    expect(record).not.toHaveBeenCalled();
    expect(bread.checked).toBe(false);
    expect(bread.note).toBe('');

    const eggs = item('eggs', 'Eggs', { note: 'dozen', checked: true });
    await finishRegularItem(eggs, false, true, record);
    expect(record).not.toHaveBeenCalled();
    expect(eggs.checked).toBe(true);
    expect(eggs.note).toBe('dozen');
  });

  it('records history before removing a completed one-time item', async () => {
    const eggs: OneTimeItem = { id: 'eggs', name: 'Eggs', note: 'dozen', checked: false };
    const record = jest.fn<Promise<void>, [OneTimeItem]>().mockResolvedValue();
    const removeAt = jest.fn<Promise<void>, [number]>().mockResolvedValue();

    await finishOneTimeItem(eggs, 0, false, true, record, removeAt);
    expect(record).not.toHaveBeenCalled();
    expect(removeAt).not.toHaveBeenCalled();

    await finishOneTimeItem(eggs, 1, true, true, record, removeAt);
    expect(record).toHaveBeenCalledWith(eggs);
    expect(removeAt).toHaveBeenCalledWith(1);
    expect(record.mock.invocationCallOrder[0]).toBeLessThan(removeAt.mock.invocationCallOrder[0]);

    record.mockClear();
    removeAt.mockClear();
    await finishOneTimeItem(eggs, 2, true, false, record, removeAt);
    expect(record).not.toHaveBeenCalled();
    expect(removeAt).toHaveBeenCalledWith(2);
  });

  it('restores checked state by id and leaves the live name and note alone', () => {
    const skim = item('skim', 'Skim now', { note: 'live', checked: false });
    const milk = item('milk', 'Milk now', {
      note: 'live note',
      checked: false,
      children: [skim],
    });
    const snapshot: RegularItemSnapshot = {
      id: 'milk',
      name: 'Milk then',
      note: 'old note',
      checked: true,
      children: [
        { id: 'skim', name: 'Skim then', note: 'old', checked: true },
        { id: 'gone', name: 'Gone', note: '', checked: true },
      ],
    };

    expect(restoreRegularFromHistory([milk], 'milk', snapshot)).toBe(true);
    expect(milk.name).toBe('Milk now');
    expect(milk.note).toBe('live note');
    expect(milk.checked).toBe(true);
    expect(skim.checked).toBe(true);
    expect(skim.name).toBe('Skim now');
    expect(milk.children).toHaveLength(1);
  });

  it('does not recreate a regular item that is no longer in the tree', () => {
    const bread = item('bread', 'Bread');
    const snapshot: RegularItemSnapshot = {
      id: 'milk',
      name: 'Milk',
      note: '',
      checked: true,
    };

    expect(restoreRegularFromHistory([bread], 'milk', snapshot)).toBe(false);
    expect(bread).toEqual(item('bread', 'Bread'));
  });

  it('puts an undone one-time item back at the front of the list', () => {
    const list: OneTimeItem[] = [
      { id: 'bread', name: 'Bread', note: '', checked: false },
    ];
    const snapshot: OneTimeItemSnapshot = {
      id: 'eggs',
      name: 'Eggs',
      note: 'dozen',
      checked: true,
    };

    restoreOneTimeFromSnapshot(list, snapshot);

    expect(list.map((entry) => entry.name)).toEqual(['Eggs', 'Bread']);
    expect(list[0]).toEqual({
      id: 'eggs',
      name: 'Eggs',
      note: 'dozen',
      checked: true,
    });
  });

  it('expands a newly checked item and its descendants on the shopping list only', () => {
    const cheddar = item('cheddar', 'Cheddar');
    const cheese = item('cheese', 'Cheese', { checked: true, children: [cheddar] });
    const yogurt = item('yogurt', 'Yogurt', { checked: true, expandedShoppingList: false });
    const dairy = item('dairy', 'Dairy', { children: [cheese, yogurt], expanded: true });
    const previously = new Set<ShoppingListItem>([yogurt]);

    const currently = expandNewlyChecked([dairy], previously);

    expect(currently.has(cheese)).toBe(true);
    expect(currently.has(yogurt)).toBe(true);
    expect(cheese.expandedShoppingList).toBe(true);
    expect(cheddar.expandedShoppingList).toBe(true);
    expect(yogurt.expandedShoppingList).toBe(false);
    expect(dairy.expanded).toBe(true);
    expect(dairy.expandedShoppingList).toBeUndefined();
  });

  it('formats the share text with one-time lines first and indented checked items', () => {
    const oneTime: OneTimeItem[] = [
      { id: 'eggs', name: 'Eggs', note: 'dozen', checked: false },
      { id: 'soap', name: 'Soap', note: '', checked: false },
    ];
    const items: ShoppingListItem[] = [
      item('dairy', 'Dairy', {
        children: [
          item('milk', 'Milk', { note: '2L', checked: true }),
          item('cheese', 'Cheese', {
            children: [item('cheddar', 'Cheddar', { checked: true })],
          }),
        ],
      }),
      item('bread', 'Bread', { checked: true }),
    ];

    const labels = collectShoppingListLabels(oneTime, items);

    expect(labels).toEqual([
      'Eggs dozen',
      'Soap',
      '  Milk 2L',
      '    Cheddar',
      'Bread',
    ]);
    expect(labels.join(',\n')).toBe([
      'Eggs dozen,',
      'Soap,',
      '  Milk 2L,',
      '    Cheddar,',
      'Bread',
    ].join('\n'));
    expect(collectShoppingListLabels([], [])).toEqual([]);
  });

  it('shows a checked row, a header for an unchecked parent, and hides an empty branch', () => {
    const milk = item('milk', 'Milk', { checked: true });
    const dairy = item('dairy', 'Dairy', { children: [milk] });
    const bread = item('bread', 'Bread');

    expect(shoppingListRowKind(milk)).toBe('row');
    expect(shoppingListRowKind(dairy)).toBe('header');
    expect(shoppingListRowKind(bread)).toBe('hidden');
  });

  it('moves a sibling together with its children and ignores an index outside the list', () => {
    const skim = item('skim', 'Skim');
    const milk = item('milk', 'Milk', { children: [skim] });
    const bread = item('bread', 'Bread');
    const list = [milk, bread];

    moveItemWithinSiblings(list, 0, 1);

    expect(list.map((entry) => entry.name)).toEqual(['Bread', 'Milk']);
    expect(list[1].children).toEqual([skim]);

    moveItemWithinSiblings(list, -1, 0);
    moveItemWithinSiblings(list, 0, 4);
    expect(list.map((entry) => entry.name)).toEqual(['Bread', 'Milk']);
  });
});