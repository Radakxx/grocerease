import type { OneTimeItem, ShoppingListItem } from '@/composables/items';
import {
  applyItemTransfer,
  parseItemTransfer,
  serializeItems,
} from '@/utils/itemTransfer';

function withoutIds(list: ShoppingListItem[]): unknown[] {
  return list.map((item) => ({
    name: item.name,
    note: item.note,
    checked: item.checked,
    children: item.children ? withoutIds(item.children) : undefined,
  }));
}

function withoutOneTimeIds(list: OneTimeItem[]): unknown[] {
  return list.map((item) => ({
    name: item.name,
    note: item.note,
    checked: item.checked,
  }));
}

describe('itemTransfer', () => {
  it('round-trips nesting, notes, checked flags, and one-time items', () => {
    const catalog: ShoppingListItem[] = [
      {
        id: 'milk',
        name: 'Milk',
        note: '2L',
        checked: true,
        children: [
          { id: 'skim', name: 'Skim', note: '', checked: false },
        ],
      },
      { id: 'bread', name: 'Bread', note: '', checked: false },
    ];
    const oneTime: OneTimeItem[] = [
      { id: 'eggs', name: 'Eggs', note: 'dozen', checked: true },
    ];

    const text = serializeItems(catalog, oneTime);
    expect(text).toBe([
      'Grocerease export 1',
      '[x] Milk || 2L',
      '  [ ] Skim ||',
      '[ ] Bread ||',
      '* [x] Eggs || dozen',
    ].join('\n'));

    const parsed = parseItemTransfer(text);
    expect(parsed.ok).toBe(true);
    expect(withoutIds(parsed.catalog)).toEqual(withoutIds(catalog));
    expect(withoutOneTimeIds(parsed.oneTimeItems)).toEqual(withoutOneTimeIds(oneTime));
    expect(parsed.catalog.every((item) => item.id && item.id !== 'milk')).toBe(true);
    expect(parsed.oneTimeItems[0].id).not.toBe('eggs');
  });

  it('parses a legacy shopping-list copy', () => {
    const text = [
      'Eggs dozen,',
      'Milk 2L,',
      '  Skim,',
      'Bread',
    ].join('\n');

    const parsed = parseItemTransfer(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.oneTimeItems).toEqual([]);
    expect(withoutIds(parsed.catalog)).toEqual([
      { name: 'Eggs dozen', note: '', checked: false, children: undefined },
      {
        name: 'Milk 2L',
        note: '',
        checked: false,
        children: [
          { name: 'Skim', note: '', checked: false, children: undefined },
        ],
      },
      { name: 'Bread', note: '', checked: false, children: undefined },
    ]);
  });

  it('places a legacy item under the nearest parent when a parent line is missing', () => {
    const parsed = parseItemTransfer([
      '  Milk,',
      '  Cheese,',
      'Bread',
    ].join('\n'));

    expect(parsed.ok).toBe(true);
    expect(parsed.missingParents).toBe(2);
    expect(parsed.warnings.some((warning) => warning.includes('parent line was missing'))).toBe(true);
    expect(withoutIds(parsed.catalog)).toEqual([
      { name: 'Milk', note: '', checked: false, children: undefined },
      { name: 'Cheese', note: '', checked: false, children: undefined },
      { name: 'Bread', note: '', checked: false, children: undefined },
    ]);
  });

  it('rejects empty text', () => {
    expect(parseItemTransfer('').ok).toBe(false);
    expect(parseItemTransfer('   \n').ok).toBe(false);
    expect(parseItemTransfer('').error).toBe('Nothing to import.');
  });

  it('skips a duplicate sibling name and does not keep its children', () => {
    const parsed = parseItemTransfer([
      'Milk,',
      '  Skim,',
      'Milk,',
      '  Whole,',
      'Bread',
    ].join('\n'));

    expect(parsed.ok).toBe(true);
    expect(parsed.skippedDuplicates).toBe(1);
    expect(withoutIds(parsed.catalog)).toEqual([
      {
        name: 'Milk',
        note: '',
        checked: false,
        children: [
          { name: 'Skim', note: '', checked: false, children: undefined },
        ],
      },
      { name: 'Bread', note: '', checked: false, children: undefined },
    ]);
  });

  it('adds beside an existing collection and skips a matching sibling without merging children', () => {
    const existing: ShoppingListItem[] = [
      { id: 'milk', name: 'Milk', note: 'keep', checked: false, children: [] },
    ];
    const parsed = parseItemTransfer([
      'Grocerease export 1',
      '[x] Milk || 2L',
      '  [x] Skim ||',
      '[ ] Bread ||',
      '* [ ] Eggs || dozen',
    ].join('\n'));

    const applied = applyItemTransfer(existing, [], parsed, 'add');
    expect(applied.skippedDuplicates).toBe(2);
    expect(applied.catalog.map((item) => item.name)).toEqual(['Milk', 'Bread']);
    expect(applied.catalog[0].note).toBe('keep');
    expect(applied.catalog[0].children).toEqual([]);
    expect(applied.catalog[0].id).toBe('milk');
    expect(applied.oneTimeItems.map((item) => item.name)).toEqual(['Eggs']);
  });

  it('replaces the catalog and one-time list', () => {
    const existing: ShoppingListItem[] = [
      { id: 'old', name: 'Old', note: '', checked: false },
    ];
    const existingOneTime: OneTimeItem[] = [
      { id: 'old-once', name: 'Old once', note: '', checked: false },
    ];
    const parsed = parseItemTransfer([
      'Grocerease export 1',
      '[x] Milk || 2L',
      '* [ ] Eggs ||',
    ].join('\n'));

    const applied = applyItemTransfer(existing, existingOneTime, parsed, 'replace');
    expect(applied.catalog.map((item) => item.name)).toEqual(['Milk']);
    expect(applied.oneTimeItems.map((item) => item.name)).toEqual(['Eggs']);
    expect(applied.catalog[0].note).toBe('2L');
    expect(applied.catalog[0].checked).toBe(true);
  });
});
