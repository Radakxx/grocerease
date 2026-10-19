import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { OneTimeItem, ShoppingListItem } from '@/composables/items';
import {
  addToHistoryFromOneTime,
  addToHistoryFromRegular,
  flushHistory,
  historyItems,
  loadHistory,
  removeHistoryEntry,
  type HistoryEntry,
} from '@/composables/history';

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue({ uri: 'memory' }),
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF16: 'utf16' },
}));

describe('history', () => {
  beforeEach(() => {
    historyItems.value = [];
    jest.mocked(Filesystem.readFile).mockReset();
    jest.mocked(Filesystem.writeFile).mockReset();
    jest.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'memory' });
  });

  it('stores a nested snapshot, keeps the newest entry first, and replaces the same source', async () => {
    const milk: ShoppingListItem = {
      id: 'milk',
      name: 'Milk',
      note: '2L',
      checked: true,
      children: [{ id: 'skim', name: 'Skim', note: '', checked: true }],
    };
    const eggs: OneTimeItem = { id: 'eggs', name: 'Eggs', note: 'dozen', checked: true };

    await addToHistoryFromRegular(milk);
    await addToHistoryFromOneTime(eggs);

    expect(historyItems.value.map((entry) => entry.entryId)).toEqual([
      'one-time:eggs',
      'regular:milk',
    ]);
    expect(historyItems.value[1].itemSnapshot).toEqual({
      id: 'milk',
      name: 'Milk',
      note: '2L',
      checked: true,
      children: [{ id: 'skim', name: 'Skim', note: '', checked: true }],
    });

    milk.note = '1L';
    await addToHistoryFromRegular(milk);

    expect(historyItems.value).toHaveLength(2);
    expect(historyItems.value.map((entry) => entry.entryId)).toEqual([
      'regular:milk',
      'one-time:eggs',
    ]);
    expect(historyItems.value[0].itemSnapshot).toMatchObject({ note: '1L' });
  });

  it('does not store an item that has no id', async () => {
    await addToHistoryFromRegular({ name: 'Milk', note: '', checked: true });
    await addToHistoryFromOneTime({ name: 'Eggs', note: '', checked: false });

    expect(historyItems.value).toEqual([]);
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
  });

  it('flushes every entry and writes an empty list', async () => {
    await addToHistoryFromOneTime({ id: 'eggs', name: 'Eggs', note: '', checked: false });

    await flushHistory();

    expect(historyItems.value).toEqual([]);
    expect(Filesystem.writeFile).toHaveBeenLastCalledWith({
      path: 'shoppinghistory.json',
      data: '[]',
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });
  });

  it('loads an array, replaces a non-array, and treats a missing file as empty', async () => {
    const stored: HistoryEntry[] = [{
      entryId: 'regular:milk',
      type: 'regular',
      sourceItemId: 'milk',
      itemSnapshot: { id: 'milk', name: 'Milk', note: '', checked: true },
      completedAt: 1,
    }];
    jest.mocked(Filesystem.readFile).mockResolvedValue({ data: JSON.stringify(stored) });

    await loadHistory();

    expect(Filesystem.readFile).toHaveBeenCalledWith({
      path: 'shoppinghistory.json',
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });
    expect(historyItems.value).toEqual(stored);

    jest.mocked(Filesystem.readFile).mockResolvedValue({ data: JSON.stringify({ items: [] }) });
    await loadHistory();
    expect(historyItems.value).toEqual([]);

    historyItems.value = [...stored];
    jest.mocked(Filesystem.readFile).mockRejectedValue(new Error('missing'));
    await loadHistory();
    expect(historyItems.value).toEqual([]);
  });

  it('removes only the matching entry', async () => {
    await addToHistoryFromRegular({ id: 'milk', name: 'Milk', note: '', checked: true });
    await addToHistoryFromOneTime({ id: 'eggs', name: 'Eggs', note: '', checked: false });

    await removeHistoryEntry('regular:milk');

    expect(historyItems.value.map((entry) => entry.entryId)).toEqual(['one-time:eggs']);
  });
});