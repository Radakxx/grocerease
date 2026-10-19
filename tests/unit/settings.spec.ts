import { nextTick } from 'vue';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { historyItems, addToHistoryFromOneTime } from '@/composables/history';
import { useSettings } from '@/composables/settings';

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue({ uri: 'memory' }),
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF16: 'utf16' },
}));

async function settle(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
}

describe('settings', () => {
  const {
    customSortEnabled,
    alphabeticalSortEnabled,
    creationOrderSortEnabled,
    historyEnabled,
    wrapNameAndNote,
    noteRowLayoutClass,
    handleCustomSortingChange,
    handleAlphabeticalSortChange,
    handleHistoryChange,
    handleWrapNameAndNoteChange,
    loadSettings,
  } = useSettings();

  beforeEach(async () => {
    jest.mocked(Filesystem.readFile).mockReset();
    jest.mocked(Filesystem.writeFile).mockReset();
    jest.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'memory' });
    handleAlphabeticalSortChange(false);
    handleCustomSortingChange(false);
    handleWrapNameAndNoteChange(false);
    handleHistoryChange(false);
    historyItems.value = [];
    await settle();
    jest.mocked(Filesystem.writeFile).mockClear();
  });

  it('keeps sorting modes mutually exclusive and treats creation order as the default', () => {
    expect(creationOrderSortEnabled.value).toBe(true);
    expect(noteRowLayoutClass.value).toBe('stack');

    handleCustomSortingChange(true);
    expect(customSortEnabled.value).toBe(true);
    expect(alphabeticalSortEnabled.value).toBe(false);
    expect(creationOrderSortEnabled.value).toBe(false);

    handleAlphabeticalSortChange(true);
    expect(alphabeticalSortEnabled.value).toBe(true);
    expect(customSortEnabled.value).toBe(false);
    expect(creationOrderSortEnabled.value).toBe(false);

    handleAlphabeticalSortChange(false);
    expect(creationOrderSortEnabled.value).toBe(true);

    handleWrapNameAndNoteChange(true);
    expect(wrapNameAndNote.value).toBe(true);
    expect(noteRowLayoutClass.value).toBe('wrap');
  });

  it('loads defined settings from UTF-16 JSON and leaves other fields as they are', async () => {
    handleCustomSortingChange(true);
    handleHistoryChange(true);
    handleWrapNameAndNoteChange(true);
    jest.mocked(Filesystem.readFile).mockResolvedValue({
      data: JSON.stringify({ alphabeticalSortEnabled: true, wrapNameAndNote: 'yes' }),
    });

    await loadSettings();

    expect(Filesystem.readFile).toHaveBeenCalledWith({
      path: 'settings.json',
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });
    expect(customSortEnabled.value).toBe(true);
    expect(alphabeticalSortEnabled.value).toBe(true);
    expect(historyEnabled.value).toBe(true);
    expect(wrapNameAndNote.value).toBe(true);
  });

  it('applies wrapNameAndNote only when the stored value is a boolean', async () => {
    handleWrapNameAndNoteChange(true);
    jest.mocked(Filesystem.readFile).mockResolvedValue({
      data: JSON.stringify({ wrapNameAndNote: false }),
    });

    await loadSettings();

    expect(wrapNameAndNote.value).toBe(false);
    expect(noteRowLayoutClass.value).toBe('stack');
  });

  it('leaves defaults in place when settings.json is missing', async () => {
    jest.mocked(Filesystem.readFile).mockRejectedValue(new Error('missing'));

    await loadSettings();

    expect(customSortEnabled.value).toBe(false);
    expect(alphabeticalSortEnabled.value).toBe(false);
    expect(historyEnabled.value).toBe(false);
    expect(wrapNameAndNote.value).toBe(false);
    expect(creationOrderSortEnabled.value).toBe(true);
  });

  it('flushes history when history is turned off', async () => {
    await addToHistoryFromOneTime({ id: 'eggs', name: 'Eggs', note: '', checked: false });
    expect(historyItems.value).toHaveLength(1);

    handleHistoryChange(true);
    await settle();
    handleHistoryChange(false);
    await settle();

    expect(historyItems.value).toEqual([]);
    expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: 'shoppinghistory.json',
      data: '[]',
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    }));
  });
});
