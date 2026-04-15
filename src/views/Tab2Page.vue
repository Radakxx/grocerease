<template>
  <ion-page class="shopping-list-page">
    <ion-content :fullscreen="true">
      <AddOneTimeItemModal ref="oneTimeItemModal" @item-added="handleOneTimeItemAdded" />

      <ion-item v-if="checkedItemsCount === 0 && oneTimeItems.length === 0 && (!historyEnabled || historyItems.length === 0)">
        <ion-title>Your list is empty</ion-title>
      </ion-item>

      <ion-list ref="ionListRef" lines="full" v-if="checkedItemsCount > 0 || oneTimeItems.length > 0">
        <!-- One-time items -->
        <div v-for="(item, index) in oneTimeItems" :key="item.id" class="item-wrapper">
          <ion-item>
            <ion-label class="item-label">
              <span class="item-name">{{ item.name }}</span>
              <span v-if="item.note" class="item-note"> • {{ item.note }}</span>
            </ion-label>
            <ion-checkbox 
              slot="end" 
              :checked="item.checked"
              :aria-label="`Toggle ${item.name}`"
              @ionChange="(event) => handleOneTimeItemCheck(item, index, event)"
            ></ion-checkbox>
          </ion-item>
        </div>
        
        <!-- Regular items from Items tab -->
        <ShoppingListItemComponent
          v-for="item in items"
          :key="item.id"
          :item="item"
          :depth="0"
          @toggle-expand="toggleExpand"
          @check-item="handleItemCheck"
        />
      </ion-list>

      <ion-list
        v-if="historyEnabled && historyItems.length > 0"
        lines="full"
        class="history-list"
      >
        <ion-list-header>
          <ion-label class="history-header">History</ion-label>
        </ion-list-header>

        <ion-item
          v-for="entry in historyItems"
          :key="entry.entryId"
          class="history-row"
          @click="handleUndoHistory(entry)"
        >
          <ion-label class="history-item-label">
            <span class="item-name">{{ entry.itemSnapshot.name }}</span>
            <span v-if="entry.itemSnapshot.note" class="item-note"> • {{ entry.itemSnapshot.note }}</span>
          </ion-label>
        </ion-item>
      </ion-list>

      <div
        v-if="historyEnabled && historyItems.length > 0"
        class="history-flush-button-wrapper"
      >
        <ion-fab-button
          class="history-flush-button"
          aria-label="Flush history"
          @click="handleFlushHistory"
        >
          <span class="history-flush-text">Flush</span>
        </ion-fab-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject, onMounted, onUnmounted } from 'vue';
import { IonPage, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonIcon, IonLabel, IonCheckbox, IonFabButton } from '@ionic/vue';
import { useItemsList, type ShoppingListItem, type OneTimeItem } from '@/composables/items';
import ShoppingListItemComponent from '@/components/ShoppingListItem.vue';
import AddOneTimeItemModal from '@/components/AddOneTimeItemModal.vue';
import { useSettings } from '@/composables/settings';
import { useHistory, type HistoryEntry, type RegularItemSnapshot, type OneTimeItemSnapshot } from '@/composables/history';

const { historyEnabled } = useSettings();

const { 
  items, 
  oneTimeItems, 
  addOneTimeItem,
  removeOneTimeItem,
} = useItemsList();

const {
  historyItems,
  addToHistoryFromRegular,
  addToHistoryFromOneTime,
  flushHistory,
  removeHistoryEntry,
} = useHistory();
const oneTimeItemModal = ref<InstanceType<typeof AddOneTimeItemModal>>();
const registerAddHandler = inject<(path: string, fn: (() => void) | null) => void>('registerAddHandler')!;

const checkedItemsCount = computed(() => {
  const countChecked = (itemList: ShoppingListItem[]): number => {
    let count = 0;
    for (const item of itemList) {
      if (item.checked) count++;
      if (item.children) {
        count += countChecked(item.children);
      }
    }
    return count;
  };
  // One-time items are removed when checked, so we only count regular items
  return countChecked(items.value);
});

// Helper to recursively expand an item and all its descendants
const expandItemAndDescendants = (item: ShoppingListItem) => {
  item.expandedShoppingList = true;
  if (item.children) {
    for (const child of item.children) {
      expandItemAndDescendants(child);
    }
  }
};

// Track which items were checked in the previous watch cycle
const previouslyCheckedItems = ref<Set<ShoppingListItem>>(new Set());

// Helper to recursively collect all checked items
const collectCheckedItems = (itemList: ShoppingListItem[], checkedSet: Set<ShoppingListItem>) => {
  for (const item of itemList) {
    if (item.checked) {
      checkedSet.add(item);
    }
    if (item.children) {
      collectCheckedItems(item.children, checkedSet);
    }
  }
};

onMounted(() => {
  registerAddHandler('/tabs/tab2', () => openOneTimeItemModal());
});

onUnmounted(() => {
  registerAddHandler('/tabs/tab2', null);
});

// Watch for items becoming checked and auto-expand them and their descendants
watch(
  () => items.value,
  () => {
    // Collect all currently checked items
    const currentlyCheckedItems = new Set<ShoppingListItem>();
    collectCheckedItems(items.value, currentlyCheckedItems);
    
    // Find items that are now checked but weren't before
    for (const item of currentlyCheckedItems) {
      if (!previouslyCheckedItems.value.has(item)) {
        // Item just became checked - expand it and all descendants
        expandItemAndDescendants(item);
      }
    }
    
    // Update the previously checked items set
    previouslyCheckedItems.value = currentlyCheckedItems;
  },
  { deep: true, immediate: false }
);

const toggleExpand = (item: ShoppingListItem) => {
  item.expandedShoppingList = !item.expandedShoppingList;
};

const handleItemCheck = async (item: ShoppingListItem, checked: boolean) => {
  // When user checks the box in shopping list (checked = true), mark item as done.
  // This means: uncheck it (remove from shopping list) and clear the note.
  if (!checked) return;

  if (historyEnabled.value) {
    // Capture snapshot before mutating item state.
    await addToHistoryFromRegular(item);
  }

  item.checked = false;
  item.note = '';
};

const openOneTimeItemModal = () => {
  oneTimeItemModal.value?.openModal();
};

const handleOneTimeItemAdded = async (name: string, note: string) => {
  await addOneTimeItem(name, note);
};

const handleOneTimeItemCheck = async (item: OneTimeItem, index: number, event: CustomEvent) => {
  const isChecked = event.detail.checked;
  if (isChecked) {
    if (historyEnabled.value) {
      await addToHistoryFromOneTime(item);
    }
    await removeOneTimeItem(index);
  }
};

const handleFlushHistory = async () => {
  await flushHistory();
};

const findRegularItemById = (list: ShoppingListItem[], id: string): ShoppingListItem | null => {
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findRegularItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

const applyRegularSnapshotToActive = (
  activeNode: ShoppingListItem,
  snapshotNode: RegularItemSnapshot
) => {
  // Restore only checked state from history; keep active name/note (user may have edited or replaced the row).
  // We don't re-create nodes; if a child was deleted, we just skip it.
  activeNode.checked = snapshotNode.checked;

  if (!snapshotNode.children) return;
  if (!activeNode.children) return;

  for (const snapChild of snapshotNode.children) {
    const activeChild = activeNode.children.find((c) => c.id === snapChild.id);
    if (activeChild) {
      applyRegularSnapshotToActive(activeChild, snapChild);
    }
  }
};

const handleUndoHistory = async (entry: HistoryEntry) => {
  if (!historyEnabled.value) return;

  if (entry.type === 'regular') {
    const snapshot = entry.itemSnapshot as RegularItemSnapshot;
    const activeRoot = findRegularItemById(items.value, entry.sourceItemId);
    if (!activeRoot) {
      // No re-create for deleted sources.
      return;
    }

    applyRegularSnapshotToActive(activeRoot, snapshot);
    await removeHistoryEntry(entry.entryId);
    return;
  }

  // One-time: restore into active one-time list (these were removed on tick-off).
  const snapshot = entry.itemSnapshot as OneTimeItemSnapshot;
  oneTimeItems.value.unshift({
    id: snapshot.id,
    name: snapshot.name,
    note: snapshot.note,
    checked: snapshot.checked,
  });

  await removeHistoryEntry(entry.entryId);
};

</script>

<style>
/* Right side: Ionic adds safe area only on .item-inner's right, so we zero end padding
   so the row/checkbox extends to the safe area edge (left side uses padding-start only). */
.shopping-list-page ion-list ion-item {
  --inner-padding-end: 0;
  --padding-end: 0;
  --border-width: 0; /* Hide Ionic's default border (it's inset due to padding) */
  position: relative;
  overflow: visible;
}

/* Ensure ion-list doesn't clip the separator line and remove any padding that would clip */
.shopping-list-page ion-list {
  overflow: visible;
  --padding-start: 0;
  --padding-end: 0;
}

/* Item wrapper for separator line positioning - extend to viewport edges */
.shopping-list-page ion-list .item-wrapper {
  position: relative;
  overflow: visible;
  margin-left: calc(-1 * var(--padding-start, 16px) - var(--ion-safe-area-left, 0px));
  margin-right: calc(-1 * var(--padding-end, 0px) - var(--ion-safe-area-right, 0px));
  padding-left: calc(var(--padding-start, 16px) + var(--ion-safe-area-left, 0px));
  padding-right: calc(var(--padding-end, 0px) + var(--ion-safe-area-right, 0px));
}

/* Full-width separator line that extends to screen edge */
.shopping-list-page ion-list .item-wrapper::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.55px;
  background-color: var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, #c8c7cc)));
  pointer-events: none;
  z-index: 1;
}

/* Also handle ShoppingListItemComponent items that aren't wrapped */
.shopping-list-page ion-list ion-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0.55px;
  background-color: var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, #c8c7cc)));
  pointer-events: none;
  z-index: 1;
}

.shopping-list-page ion-checkbox {
  --size: 32px;
  --checkbox-background-checked: #ff6b47;
}

.shopping-list-page ion-checkbox::part(container) {
  border-radius: 6px;
  border: 2px solid #ff6b47;
}

.item-label {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.item-name {
  font-weight: 500;
}

.item-note {
  color: var(--ion-color-medium);
  font-size: 0.9em;
  margin-left: 4px;
}

.shopping-list-page {
  position: relative;
}

.history-list {
  margin-top: 8px;
}

.history-header {
  text-align: center;
  width: 100%;
  font-weight: 500;
  color: var(--ion-color-dark);
  opacity: 0.7;
}

.history-row {
  cursor: pointer;
  opacity: 0.55;
  --background: transparent;
}

.history-row:hover {
  opacity: 0.7;
}

.history-flush-button-wrapper {
  position: absolute;
  bottom: 120px; /* sits well above the Add FAB to avoid overlap */
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
  z-index: 120;
}

.history-flush-button-wrapper .history-flush-button {
  pointer-events: auto;
  border-radius: 10px; /* squared-off rectangle */
  --background: transparent;
  --background-activated: rgba(37, 99, 235, 0.08);
  --background-hover: rgba(37, 99, 235, 0.06);
  --color: #2563eb;
  width: 180px;
  height: 34px; /* small height */
  --size: 34px; /* keeps internal fab sizing consistent */
  border: 2px solid #2563eb;
  margin-bottom: 14px; /* sit slightly above the tab bar area */
  --box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
}

.history-flush-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  color: #2563eb;
}
</style>