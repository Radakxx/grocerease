import { ref, onMounted } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { ShoppingListItem, OneTimeItem } from '@/composables/items';

const HISTORY_FILENAME = 'shoppinghistory.json';

export type HistoryEntryType = 'regular' | 'one-time';

export type RegularItemSnapshot = {
  id: string;
  name: string;
  note: string;
  checked: boolean;
  children?: RegularItemSnapshot[];
};

export type OneTimeItemSnapshot = {
  id: string;
  name: string;
  note: string;
  checked: boolean;
};

export type HistoryItemSnapshot = RegularItemSnapshot | OneTimeItemSnapshot;

export interface HistoryEntry {
  entryId: string; // deterministic for dedupe: `${type}:${sourceItemId}`
  type: HistoryEntryType;
  sourceItemId: string;
  itemSnapshot: HistoryItemSnapshot;
  completedAt: number;
}

export const historyItems = ref<HistoryEntry[]>([]);

function getEntryId(type: HistoryEntryType, sourceItemId: string): string {
  return `${type}:${sourceItemId}`;
}

function extractRegularSnapshot(item: ShoppingListItem): RegularItemSnapshot | null {
  if (!item.id) return null;

  return {
    id: item.id,
    name: item.name,
    note: item.note,
    checked: item.checked,
    children: item.children?.map((c) => extractRegularSnapshot(c)).filter(Boolean) as RegularItemSnapshot[] | undefined,
  };
}

function extractOneTimeSnapshot(item: OneTimeItem): OneTimeItemSnapshot | null {
  if (!item.id) return null;

  return {
    id: item.id,
    name: item.name,
    note: item.note,
    checked: item.checked,
  };
}

async function saveHistoryToStorage(): Promise<void> {
  await Filesystem.writeFile({
    path: HISTORY_FILENAME,
    data: JSON.stringify(historyItems.value),
    directory: Directory.Data,
    encoding: Encoding.UTF16,
  });
}

export async function loadHistory(): Promise<void> {
  try {
    const readFile = await Filesystem.readFile({
      path: HISTORY_FILENAME,
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });

    const parsed = JSON.parse(readFile.data.toString());
    if (Array.isArray(parsed)) {
      historyItems.value = parsed as HistoryEntry[];
    } else {
      historyItems.value = [];
    }
  } catch {
    // File may not exist yet
    historyItems.value = [];
  }
}

function upsertEntry(entry: HistoryEntry): void {
  const existingIndex = historyItems.value.findIndex((e) => e.entryId === entry.entryId);
  if (existingIndex !== -1) {
    historyItems.value.splice(existingIndex, 1);
  }

  // Put newest at the top.
  historyItems.value.unshift(entry);
}

export async function addToHistoryFromRegular(item: ShoppingListItem): Promise<void> {
  const snapshot = extractRegularSnapshot(item);
  if (!snapshot) return;

  const entry: HistoryEntry = {
    entryId: getEntryId('regular', snapshot.id),
    type: 'regular',
    sourceItemId: snapshot.id,
    itemSnapshot: snapshot,
    completedAt: Date.now(),
  };

  upsertEntry(entry);
  await saveHistoryToStorage();
}

export async function addToHistoryFromOneTime(item: OneTimeItem): Promise<void> {
  const snapshot = extractOneTimeSnapshot(item);
  if (!snapshot) return;

  const entry: HistoryEntry = {
    entryId: getEntryId('one-time', snapshot.id),
    type: 'one-time',
    sourceItemId: snapshot.id,
    itemSnapshot: snapshot,
    completedAt: Date.now(),
  };

  upsertEntry(entry);
  await saveHistoryToStorage();
}

export async function flushHistory(): Promise<void> {
  historyItems.value = [];
  await saveHistoryToStorage();
}

export async function removeHistoryEntry(entryId: string): Promise<void> {
  historyItems.value = historyItems.value.filter((e) => e.entryId !== entryId);
  await saveHistoryToStorage();
}

// Convenience wrapper so Tab2Page can keep a single “undo” call site.
export async function undoHistoryEntry(entry: HistoryEntry): Promise<void> {
  await removeHistoryEntry(entry.entryId);
}

export function useHistory() {
  onMounted(() => {
    // Best-effort; UI is gated by `historyEnabled` anyway.
    void loadHistory();
  });

  return {
    historyItems,
    loadHistory,
    addToHistoryFromRegular,
    addToHistoryFromOneTime,
    flushHistory,
    removeHistoryEntry,
    undoHistoryEntry,
  };
}

