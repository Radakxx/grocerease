<template>
  <ion-page class="items-page">
    <ion-content :fullscreen="true">
      <AddNoteModal ref="addNoteModal" :title="noteModalTitle" @note-confirmed="handleNoteConfirmed" />
      <AddItemModal ref="addItemModal" :title="itemModalTitle" :possible-parents="possibleParents" :current-item="editedItem"
        @item-confirmed="handleItemConfirmed" />

      <ion-list ref="ionListRef" lines="full">
        <ion-reorder-group
          :disabled="!customSortEnabled || hasExpandedRootItems || itemsSearchActive"
          @ionItemReorder="handleRootItemReorder"
        >
          <HierarchicalItem
            v-for="(item, index) in itemsDisplay.roots"
            :key="item.id"
            :item="item"
            :path="String(index)"
            :depth="0"
            :is-parent-reorder-disabled="hasExpandedRootItems"
            :custom-sort-enabled="customSortEnabled"
            :search-active="itemsSearchActive"
            :search-child-map="itemsDisplay.childMap"
            @toggle-expand="toggleExpand"
            @edit-item="openAddItemModal"
            @add-note="openAddNoteModal"
            @delete-item="confirmDelete"
            @check-item="handleItemCheck"
            @swipe="handleSwipe"
            @item-reorder="handleItemReorder"
          />
        </ion-reorder-group>
      </ion-list>
    </ion-content>

  </ion-page>
</template>

<script setup lang="ts">
import AddNoteModal from '@/components/AddNoteModal.vue';
import AddItemModal from '@/components/AddItemModal.vue';
import HierarchicalItem from '@/components/HierarchicalItem.vue';
import {
  IonPage,
  IonIcon,
  IonContent,
  IonList,
  IonReorderGroup,
  alertController,
} from '@ionic/vue';
import { ref, onMounted, onUnmounted, computed, watch, inject } from 'vue';
import { useItemsList, type ShoppingListItem } from '@/composables/items';
import { useSettings } from '@/composables/settings';
import { useItemsTabSearch } from '@/composables/itemsTabSearch';
import { buildItemsSearchFilteredView } from '@/composables/itemsSearchFilter';

const { 
  addItem, 
  deleteItem, 
  items, 
  ensureItemIds,
  checkAllDescendants,
  uncheckAllDescendants,
  getPossibleParents,
  findItemInTree,
  sortItemsAlphabetically,
  findAlphabeticalInsertIndex,
  hasDuplicateNameAtLevel,
} = useItemsList();

// Get sorting settings from settings
const { customSortEnabled, alphabeticalSortEnabled } = useSettings();

const { searchQuery } = useItemsTabSearch();

const itemsSearchActive = computed(() => searchQuery.value.trim().length > 0);

const itemsDisplay = computed(() => {
  ensureItemIds(items.value);
  if (!itemsSearchActive.value) {
    return {
      roots: items.value,
      childMap: null as Map<string, ShoppingListItem[]> | null,
    };
  }
  const { roots, childMap } = buildItemsSearchFilteredView(items.value, searchQuery.value);
  return { roots, childMap };
});

// Watch alphabeticalSortEnabled to sort all items when enabled
watch(alphabeticalSortEnabled, (enabled) => {
  if (enabled) {
    sortItemsAlphabetically(items.value);
  }
});

const registerAddHandler = inject<(path: string, fn: (() => void) | null) => void>('registerAddHandler')!;

const addItemModal = ref<InstanceType<typeof AddItemModal>>(); // Modal for adding items
const itemModalTitle = ref('');
const itemModalText = ref('');

const addNoteModal = ref<InstanceType<typeof AddNoteModal>>(); // Separate modal for adding notes
const noteModalTitle = ref('');

const editedItem = ref<ShoppingListItem | null>(null);
const ionListRef = ref(null);

onMounted(() => {
  registerAddHandler('/tabs/tab1', () => openAddItemModal(null));
});

onUnmounted(() => {
  registerAddHandler('/tabs/tab1', null);
});

// Get possible parents for the modal (excluding current item and its descendants)
const possibleParents = computed(() => {
  return getPossibleParents(editedItem.value);
});

// Check if any root items are expanded - disable reordering if so
const hasExpandedRootItems = computed(() => {
  return items.value.some(item => item.expanded === true);
});


const toggleExpand = (item: ShoppingListItem) => {
  item.expanded = !item.expanded;
};

onMounted(() => {
  ionListRef.value.$el.closeSlidingItems(); // Close sliding items when the component is mounted
  
  // Sort items if alphabetical sorting is enabled (in case settings were loaded before items)
  if (alphabeticalSortEnabled.value) {
    sortItemsAlphabetically(items.value);
  }
});



const handleSwipe = async (event, item) => {
  const swipeDirection = event.detail.side; // Determine the direction of the swipe
  if (swipeDirection === 'start') { // Perform actions based on the swipe direction
    openAddNoteModal(item); // Swiped to the right (start), open addNoteModal
  } else if (swipeDirection === 'end') {
    await confirmDelete(item); // Swiped to the left (end), show confirmation
  }
};

const confirmDelete = async (item: ShoppingListItem) => {
  const alert = await alertController.create({
    header: 'Delete Item',
    message: `Are you sure you want to delete "${item.name}"? This will also delete all its children.`,
    buttons: [
      {
        text: 'No',
        role: 'cancel',
        handler: () => {
          // Close the sliding item if user cancels
          ionListRef.value.$el.closeSlidingItems();
        }
      },
      {
        text: 'Yes',
        role: 'confirm',
        handler: () => {
          deleteItem(item);
          // Close the sliding item after deletion
          ionListRef.value.$el.closeSlidingItems();
        }
      }
    ]
  });

  await alert.present();
};

const openAddItemModal = (item: ShoppingListItem | null, parent: ShoppingListItem | null = null) => {
  editedItem.value = item;
  itemModalTitle.value = item ? `Edit: ${item.name}` : 'Add Item';
  itemModalText.value = item ? item.name : '';
  
  // Find current parent if editing
  let currentParent: ShoppingListItem | null = null;
  if (item) {
    const found = findItemInTree(items.value, item);
    currentParent = found?.parent || null;
  } else if (parent) {
    currentParent = parent;
  }
  
  addItemModal.value?.openModal(itemModalText.value, currentParent);
};


async function confirmDuplicateProceed(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    alertController
      .create({
        header: 'Duplicate name',
        message: 'An item with this name already exists at this level. Do you want to add it anyway?',
        backdropDismiss: false,
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
          { text: 'Add anyway', role: 'confirm', handler: () => resolve(true) },
        ],
      })
      .then((alert) => alert.present());
  });
}

const handleItemConfirmed = async (name: string, parent: ShoppingListItem | null, children?: ShoppingListItem[], note?: string, checked?: boolean) => {
  if (editedItem.value) { // Editing existing item
    if (hasDuplicateNameAtLevel(name, parent, editedItem.value)) {
      const proceed = await confirmDuplicateProceed();
      if (!proceed) return;
    }
    editedItem.value.name = name;
    
    // Update children if provided
    if (children !== undefined) {
      editedItem.value.children = children;
      // Sort children if alphabetical sorting is enabled
      if (alphabeticalSortEnabled.value && editedItem.value.children && editedItem.value.children.length > 0) {
        sortItemsAlphabetically(editedItem.value.children);
      }
    }
    
    // Update note if provided
    if (note !== undefined) {
      editedItem.value.note = note;
    }
    
    // Update checked status if provided
    if (checked !== undefined) {
      editedItem.value.checked = checked;
    }
    
    // Handle parent change - only move item if parent actually changed
    const found = findItemInTree(items.value, editedItem.value);
    if (found) {
      const currentParent = found.parent;
      // Compare by reference - if both are null or both are the same object, parent hasn't changed
      const parentChanged = currentParent !== parent;
      
      // Only move item if parent actually changed
      if (parentChanged) {
        // Remove from old parent
        if (currentParent) {
          const childIndex = currentParent.children?.indexOf(editedItem.value) ?? -1;
          if (childIndex !== -1) {
            currentParent.children?.splice(childIndex, 1);
          }
        } else {
          // Remove from root
          const rootIndex = items.value.indexOf(editedItem.value);
          if (rootIndex !== -1) {
            items.value.splice(rootIndex, 1);
          }
        }
        
        // Add to new parent
        if (parent) {
          parent.children = parent.children || [];
          if (alphabeticalSortEnabled.value) {
            // Insert in alphabetical position
            const insertIndex = findAlphabeticalInsertIndex(parent.children, editedItem.value.name);
            parent.children.splice(insertIndex, 0, editedItem.value);
            // Sort children recursively
            sortItemsAlphabetically(parent.children);
          } else {
            // When not sorting alphabetically, match add-item behavior: insert at the beginning
            parent.children.unshift(editedItem.value);
          }
        } else {
          if (alphabeticalSortEnabled.value) {
            // Insert in alphabetical position
            const insertIndex = findAlphabeticalInsertIndex(items.value, editedItem.value.name);
            items.value.splice(insertIndex, 0, editedItem.value);
            // Sort root items recursively
            sortItemsAlphabetically(items.value);
          } else {
            // When not sorting alphabetically, match add-item behavior: insert at the beginning
            items.value.unshift(editedItem.value);
          }
        }
      } else {
        // Parent hasn't changed, but if alphabetical sorting is enabled, sort the current level
        if (alphabeticalSortEnabled.value) {
          if (parent) {
            sortItemsAlphabetically(parent.children || []);
          } else {
            sortItemsAlphabetically(items.value);
          }
        }
      }
      // If parent hasn't changed, item stays in place - no need to move it
    }
  } else { // Adding new item
    if (hasDuplicateNameAtLevel(name, parent, null)) {
      const proceed = await confirmDuplicateProceed();
      if (!proceed) return;
    }
    const newItem: ShoppingListItem = { 
      name, 
      note: '', 
      checked: false,
      children: children
    };
    ensureItemIds([newItem]);
    
    // Sort children if alphabetical sorting is enabled before adding
    if (alphabeticalSortEnabled.value && newItem.children && newItem.children.length > 0) {
      sortItemsAlphabetically(newItem.children);
    }
    
    await addItem(newItem, parent, alphabeticalSortEnabled.value);
    
    // After adding, sort if alphabetical sorting is enabled (to ensure the item is in correct position and children are sorted)
    if (alphabeticalSortEnabled.value) {
      if (parent) {
        sortItemsAlphabetically(parent.children || []);
      } else {
        sortItemsAlphabetically(items.value);
      }
    }
  }
  editedItem.value = null;
  itemModalTitle.value = '';
  itemModalText.value = '';
  ionListRef.value.$el.closeSlidingItems();
};

const openAddNoteModal = (item: ShoppingListItem) => {
  editedItem.value = item;
  noteModalTitle.value = `Add Note to ${item.name}`;
  addNoteModal.value?.openModal(item.note || '');
};

const handleNoteConfirmed = (noteText: string) => {
  if (editedItem.value) {
    editedItem.value.note = noteText;
    editedItem.value.checked = true;
    // Check all descendants (similar to checkbox logic)
    checkAllDescendants(editedItem.value);
  }
  ionListRef.value.$el.closeSlidingItems();
};

const handleItemCheck = (item: ShoppingListItem, checked: boolean) => {
  if (checked) {
    // Check parent: check all descendants (skip already checked ones)
    // First ensure the parent is checked
    item.checked = true;
    // Then check all descendants
    checkAllDescendants(item);
  } else {
    // Uncheck parent: uncheck all descendants
    item.checked = false;
    uncheckAllDescendants(item);
  }
};

// Handle reordering of root items
const handleRootItemReorder = (event: CustomEvent) => {
  const fromIndex = event.detail.from;
  const toIndex = event.detail.to;
  
  // Validate indices are within bounds for root items
  if (fromIndex >= 0 && fromIndex < items.value.length && 
      toIndex >= 0 && toIndex < items.value.length) {
    // Move item (and all its children) in the array
    // Since children are part of the item object, they move automatically
    const item = items.value.splice(fromIndex, 1)[0];
    items.value.splice(toIndex, 0, item);
  }
  
  // Complete the reorder - Ionic will handle the visual animation
  event.detail.complete();
};


// Handle reordering of nested items (children) - emitted from HierarchicalItem
const handleItemReorder = (event: { item: ShoppingListItem; fromIndex: number; toIndex: number; parent: ShoppingListItem | null }) => {
  const { fromIndex, toIndex, parent } = event;
  
  if (parent && parent.children) {
    // Validate indices
    if (fromIndex >= 0 && fromIndex < parent.children.length &&
        toIndex >= 0 && toIndex < parent.children.length) {
      // Move the item (and all its children) in the parent's children array
      // Since children are part of the item object, they move automatically
      const child = parent.children.splice(fromIndex, 1)[0];
      parent.children.splice(toIndex, 0, child);
    }
  }
  // Don't restore expansion for nested reordering - items weren't collapsed
};

</script>

<style>
/* Right side: Ionic adds safe area only on .item-inner's right, so we zero end padding
   so the row/checkbox extends to the safe area edge (left side uses padding-start only). */
.items-page ion-list ion-item {
  --inner-padding-end: 0;
  --padding-end: 0;
  --border-width: 0; /* Hide Ionic's default border (it's inset due to padding) */
  position: relative;
  overflow: visible;
}

/* Ensure ion-item-sliding doesn't clip the separator line */
.items-page ion-list ion-item-sliding {
  overflow: visible;
  position: relative;
}

/* Full-width separator line that extends to screen edge - positioned on ion-item-sliding to account for layout changes */
.items-page ion-list ion-item-sliding::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: calc(-1 * var(--padding-start, 16px) - var(--ion-safe-area-left, 0px));
  right: calc(-1 * var(--padding-end, 0px) - var(--ion-safe-area-right, 0px));
  height: 0.55px;
  background-color: var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, #c8c7cc)));
  pointer-events: none;
  z-index: 1;
}

ion-checkbox {
  --size: 32px;
  --checkbox-background-checked: #87d361;
}

ion-checkbox::part(container) {
  border-radius: 6px;
  border: 2px solid #87d361;
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
</style>