<template>
  <ion-item-sliding @ionSwipe="$emit('swipe', $event, item)">
    <ion-item :style="{ paddingLeft: `${depth * 20}px` }">
      <!-- Conditionally render reorder icon only when custom sorting is enabled -->
      <div v-if="customSortEnabled" slot="start" class="reorder-wrapper" :class="{ 'reorder-disabled': isReorderDisabled }">
        <ion-reorder></ion-reorder>
      </div>
      <ion-button
        slot="start"
        class="expand-arrow-button"
        :class="{
          'icon-placeholder': !showExpandControl,
          'expand-caret-search-disabled': expandCaretDisabled,
        }"
        @click.stop="onExpandClick"
        fill="clear"
        size="small"
        :disabled="expandCaretDisabled"
      >
        <ion-icon
          slot="icon-only"
          :icon="showExpandControl ? (effectiveExpanded ? chevronDown : chevronForward) : chevronForward"
        ></ion-icon>
      </ion-button>
      <ion-label class="item-label">
        <span class="item-name clickable" @click.stop="$emit('edit-item', item)">{{ item.name }}</span>
        <span v-if="item.note" class="item-note clickable" @click.stop="$emit('edit-item', item)"> • {{ item.note }}</span>
      </ion-label>
      <ion-checkbox
        slot="end"
        :checked="item.checked"
        :aria-label="`Toggle ${item.name}`"
        @ionChange.stop="handleCheckboxChange($event)"
      ></ion-checkbox>
    </ion-item>

    <ion-item-options side="start">
      <ion-item-option color="success" @click.stop="$emit('add-note', item)">
        <ion-icon slot="start" :icon="bagAdd"></ion-icon>
        Add with note
      </ion-item-option>
    </ion-item-options>
    <ion-item-options side="end">
      <ion-item-option color="danger" @click.stop="$emit('delete-item', item)">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        Delete
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>

  <!-- Recursive children -->
  <template v-if="showExpandControl && effectiveExpanded">
    <div class="children-container">
      <ion-reorder-group
        v-if="customSortEnabled"
        :disabled="hasExpandedChildren || searchActive"
        @ionItemReorder.stop="handleChildReorder"
      >
        <HierarchicalItem
          v-for="(child, childIndex) in displayChildren"
          :key="child.id"
          :item="child"
          :path="`${path}-${childIndex}`"
          :depth="depth + 1"
          :is-parent-reorder-disabled="hasExpandedChildren"
          :custom-sort-enabled="customSortEnabled"
          :search-active="searchActive"
          :search-child-map="searchChildMap"
          @toggle-expand="$emit('toggle-expand', $event)"
          @edit-item="$emit('edit-item', $event)"
          @add-note="$emit('add-note', $event)"
          @delete-item="$emit('delete-item', $event)"
          @check-item="(item, checked) => $emit('check-item', item, checked)"
          @swipe="(event, item) => $emit('swipe', event, item)"
          @item-reorder="$emit('item-reorder', $event)"
        />
      </ion-reorder-group>
      <template v-else>
        <HierarchicalItem
          v-for="(child, childIndex) in displayChildren"
          :key="child.id"
          :item="child"
          :path="`${path}-${childIndex}`"
          :depth="depth + 1"
          :is-parent-reorder-disabled="hasExpandedChildren"
          :custom-sort-enabled="customSortEnabled"
          :search-active="searchActive"
          :search-child-map="searchChildMap"
          @toggle-expand="$emit('toggle-expand', $event)"
          @edit-item="$emit('edit-item', $event)"
          @add-note="$emit('add-note', $event)"
          @delete-item="$emit('delete-item', $event)"
          @check-item="(item, checked) => $emit('check-item', item, checked)"
          @swipe="(event, item) => $emit('swipe', event, item)"
          @item-reorder="$emit('item-reorder', $event)"
        />
      </template>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonButton,
  IonIcon,
  IonLabel,
  IonCheckbox,
  IonReorder,
  IonReorderGroup,
} from '@ionic/vue';
import { chevronDown, chevronForward, bagAdd, trash } from 'ionicons/icons';
import type { ShoppingListItem } from '@/composables/items';

const props = defineProps<{
  item: ShoppingListItem;
  path: string;
  depth: number;
  isParentReorderDisabled?: boolean; // Whether parent reorder group is disabled
  customSortEnabled?: boolean; // Whether custom sorting is enabled
  searchActive?: boolean;
  searchChildMap?: Map<string, ShoppingListItem[]> | null;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand', item: ShoppingListItem): void;
  (e: 'edit-item', item: ShoppingListItem): void;
  (e: 'add-note', item: ShoppingListItem): void;
  (e: 'delete-item', item: ShoppingListItem): void;
  (e: 'check-item', item: ShoppingListItem, checked: boolean): void;
  (e: 'swipe', event: any, item: ShoppingListItem): void;
  (e: 'item-reorder', event: { item: ShoppingListItem; fromIndex: number; toIndex: number; parent: ShoppingListItem | null }): void;
}>();

const hasStructuralChildren = computed(
  () => (props.item.children?.length ?? 0) > 0
);

const displayChildren = computed((): ShoppingListItem[] => {
  if (props.searchActive && props.searchChildMap != null && props.item.id != null) {
    return props.searchChildMap.get(props.item.id) ?? [];
  }
  return props.item.children ?? [];
});

const showExpandControl = computed(() => {
  if (props.searchActive) {
    return displayChildren.value.length > 0;
  }
  return hasStructuralChildren.value;
});

const storedExpanded = computed(() => props.item.expanded === true);

/** Subtree visible: persisted expand, or search forces open when filtered children exist. */
const effectiveExpanded = computed(() => {
  if (props.searchActive && displayChildren.value.length > 0) {
    return true;
  }
  return storedExpanded.value;
});

/** While search is active, expansion is driven by the filter; caret is non-interactive. */
const expandCaretDisabled = computed(
  () => !!(props.searchActive && showExpandControl.value)
);

const onExpandClick = () => {
  if (props.searchActive) {
    return;
  }
  if (!hasStructuralChildren.value) {
    return;
  }
  emit('toggle-expand', props.item);
};

// Check if any children of this item are expanded - disable reordering if so
const hasExpandedChildren = computed(() => {
  if (!props.item.children || props.item.children.length === 0) {
    return false;
  }
  return props.item.children.some((child) => child.expanded === true);
});

// Check if reordering is disabled for this item's level
// For root items: check if any root items are expanded (passed from parent)
// For nested items: check if any siblings (children of same parent) are expanded
const isReorderDisabled = computed(() => {
  // For both root and nested items, use the parent's disabled state
  // This checks if any items at the same level are expanded
  return props.isParentReorderDisabled ?? false;
});

const handleCheckboxChange = (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  emit('check-item', props.item, isChecked);
};

// Handle reordering of child items
const handleChildReorder = (event: CustomEvent) => {
  // Stop event propagation immediately to prevent affecting parent reorder groups
  if (event.stopPropagation) {
    event.stopPropagation();
  }

  if (props.searchActive) {
    event.detail.complete();
    return;
  }

  const fromIndex = event.detail.from;
  const toIndex = event.detail.to;

  // Validate indices are within bounds
  if (
    props.item.children &&
    props.item.children.length > 0 &&
    fromIndex >= 0 &&
    fromIndex < props.item.children.length &&
    toIndex >= 0 &&
    toIndex < props.item.children.length
  ) {
    // Emit the reorder event with parent information - parent will handle the mutation
    emit('item-reorder', {
      item: props.item.children[fromIndex],
      fromIndex,
      toIndex,
      parent: props.item,
    });
  }

  // Complete the reorder
  event.detail.complete();
};
</script>

<style scoped>
ion-item {
  --min-height: 56px;
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

.clickable {
  cursor: pointer;
  user-select: none;
}

.icon-placeholder {
  opacity: 0;
  pointer-events: none;
  min-width: 32px;
}

.children-container {
  /* Isolate nested reorder groups */
  position: relative;
}

/* Reorder icon wrapper - only rendered when custom sorting is enabled */
.reorder-wrapper {
  min-width: 32px !important;
  width: 32px !important;
  display: block !important;
  flex-shrink: 0;
  position: relative;
  box-sizing: border-box;
  /* Reduce gap between drag handle and arrow (Ionic defaults to 16px on slot=start) */
  -webkit-margin-end: 6px;
  margin-inline-end: 6px;
}

/* Match spacing between arrow and name to spacing between drag and arrow */
.expand-arrow-button {
  -webkit-margin-end: 6px;
  margin-inline-end: 6px;
}

.expand-caret-search-disabled {
  --color: var(--ion-color-medium);
  opacity: 0.45;
  pointer-events: none;
}

.reorder-wrapper.reorder-disabled {
  opacity: 0.3;
  pointer-events: none;
}

.reorder-wrapper.reorder-disabled ion-reorder {
  opacity: 0.3;
  pointer-events: none;
}

/* Ensure ion-reorder inside wrapper is always visible */
.reorder-wrapper ion-reorder {
  display: block !important;
  visibility: visible !important;
  min-width: 32px !important;
  width: 32px !important;
}
</style>
