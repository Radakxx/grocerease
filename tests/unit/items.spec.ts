import { Filesystem } from '@capacitor/filesystem';
import type { ShoppingListItem } from '@/composables/items';
import { useItemsList } from '@/composables/items';

const cryptoRef = globalThis.crypto as { randomUUID?: () => string } | undefined;
if (!cryptoRef || typeof cryptoRef.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID(): string {
        return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      },
    },
  });
}

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue({ uri: 'memory' }),
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF16: 'utf16' },
}));

function item(
  name: string,
  children?: ShoppingListItem[],
  checked = false,
): ShoppingListItem {
  return {
    id: name.toLowerCase(),
    name,
    note: '',
    checked,
    children,
  };
}

describe('items tree', () => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);

  const {
    items,
    oneTimeItems,
    addItem,
    deleteItem,
    ensureItemIds,
    checkAllDescendants,
    uncheckAllDescendants,
    getPossibleParents,
    sortItemsAlphabetically,
    hasDuplicateNameAtLevel,
  } = useItemsList();

  beforeEach(() => {
    items.value = [];
    oneTimeItems.value = [];
    jest.mocked(Filesystem.writeFile).mockClear();
  });

  it('checks a node and every descendant, including ones already checked', () => {
    const skim = item('Skim', undefined, true);
    const whole = item('Whole');
    const milk = item('Milk', [skim, item('Organic', [whole])]);

    milk.checked = true;
    checkAllDescendants(milk);

    expect(milk.checked).toBe(true);
    expect(skim.checked).toBe(true);
    expect(milk.children?.[1].checked).toBe(true);
    expect(whole.checked).toBe(true);
  });

  it('unchecks a node and every descendant', () => {
    const skim = item('Skim', undefined, true);
    const whole = item('Whole', undefined, true);
    const milk = item('Milk', [skim, item('Organic', [whole])], true);

    milk.checked = false;
    uncheckAllDescendants(milk);

    expect(milk.checked).toBe(false);
    expect(skim.checked).toBe(false);
    expect(milk.children?.[1].checked).toBe(false);
    expect(whole.checked).toBe(false);
  });

  it('detects duplicate sibling names case-insensitively and ignores the item being edited', () => {
    items.value = [item('Milk'), item('Dairy', [item('Milk')])];
    const rootMilk = items.value[0];
    const dairy = items.value[1];

    expect(hasDuplicateNameAtLevel(' milk ', null, null)).toBe(true);
    expect(hasDuplicateNameAtLevel('Bread', null, null)).toBe(false);
    expect(hasDuplicateNameAtLevel('Milk', dairy, null)).toBe(true);
    expect(hasDuplicateNameAtLevel('Dairy', dairy, null)).toBe(false);
    expect(hasDuplicateNameAtLevel('Milk', null, rootMilk)).toBe(false);
  });

  it('inserts new items at the beginning unless alphabetical order is on', async () => {
    const parent = item('Dairy', [item('Yogurt')]);
    items.value = [item('Bread'), parent];

    await addItem(item('Milk'), null, false);
    expect(items.value.map((entry) => entry.name)).toEqual(['Milk', 'Bread', 'Dairy']);

    await addItem(item('Cheese'), parent, false);
    expect(parent.children?.map((entry) => entry.name)).toEqual(['Cheese', 'Yogurt']);

    items.value = [item('Banana'), item('Cherry')];
    await addItem(item('Apple'), null, true);
    await addItem(item('Álma'), null, true);
    expect(items.value.map((entry) => entry.name)).toEqual(['Álma', 'Apple', 'Banana', 'Cherry']);

    const nested = [
      item('Pear', [item('Zest'), item('Anjou')]),
      item('Apple', [item('Fuji'), item('Éva')]),
    ];
    sortItemsAlphabetically(nested);
    expect(nested.map((entry) => entry.name)).toEqual(['Apple', 'Pear']);
    expect(nested[1].children?.map((entry) => entry.name)).toEqual(['Anjou', 'Zest']);
    expect(nested[0].children?.map((entry) => entry.name).sort((a, b) => (
      a.localeCompare(b, undefined, { sensitivity: 'base', caseFirst: 'lower' })
    ))).toEqual(nested[0].children?.map((entry) => entry.name));
  });

  it('lists every possible parent except the item and its descendants', () => {
    items.value = [
      item('Dairy', [item('Cheese', [item('Cheddar')])]),
      item('Bread'),
    ];
    const cheese = items.value[0].children?.[0] as ShoppingListItem;

    expect(getPossibleParents(cheese).map((entry) => entry.name)).toEqual(['Dairy', 'Bread']);
    expect(getPossibleParents(null).map((entry) => entry.name)).toEqual([
      'Dairy',
      'Cheese',
      'Cheddar',
      'Bread',
    ]);
  });

  it('deletes an item with its descendants and collapses a parent that lost its last child', async () => {
    const dairy = item('Dairy', [item('Cheese', [item('Cheddar')])]);
    items.value = [dairy, item('Bread')];

    await deleteItem(items.value[0]);
    expect(items.value.map((entry) => entry.name)).toEqual(['Bread']);

    const milk = item('Milk', [item('Skim')]);
    milk.expanded = true;
    items.value = [milk];
    const storedMilk = items.value[0];

    await deleteItem(storedMilk.children?.[0] as ShoppingListItem);
    expect(storedMilk.children).toEqual([]);
    expect(storedMilk.expanded).toBe(false);
  });

  it('assigns ids only where one is missing', () => {
    const child = { name: 'Skim', note: '', checked: false } as ShoppingListItem;
    const parent: ShoppingListItem = {
      id: 'keep',
      name: 'Milk',
      note: '',
      checked: false,
      children: [child],
    };

    ensureItemIds([parent]);

    expect(parent.id).toBe('keep');
    expect(child.id).toEqual(expect.any(String));
    expect(child.id).not.toBe('');
  });
});
