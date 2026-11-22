<template>
  <!-- Single root so a reorder moves the row and its children together. -->
  <div class="hierarchical-item">
    <ion-item-sliding @ionSwipe="$emit('swipe', $event, item)">
    <ion-item
        :class="['item-legacy', `note-layout-${noteRowLayoutClass}`, { 'has-note': !!item.note }]"
        :style="{ paddingLeft: `${depth * 20}px` }"
      >
      <!-- Plain grip inside the row. A second background behind the item
           paints another copy of the card when a parent is opened. -->
      <button
        v-if="customSortEnabled"
        slot="start"
        type="button"
        class="reorder-handle"
        :class="{ 'reorder-disabled': isReorderDisabled }"
        :aria-disabled="isReorderDisabled"
        aria-label="Reorder"
        @pointerdown.stop="onReorderPointerDown"
      >
        <span class="reorder-grip"></span>
      </button>
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
        <span
          v-if="item.note"
          class="item-note clickable"
          @click.stop="$emit('edit-item', item)"
        >{{ item.note }}</span>
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

  <!-- Recursive children. Same nodes whether or not custom sorting is on. -->
  <div v-if="showExpandControl && effectiveExpanded" class="children-container">
    <HierarchicalItem
      v-for="(child, childIndex) in displayChildren"
      :key="child.id"
      :item="child"
      :parent-item="item"
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
  </div>
  </div>
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
} from '@ionic/vue';
import { chevronDown, chevronForward, bagAdd, trash } from 'ionicons/icons';
import type { ShoppingListItem } from '@/composables/items';
import { useSettings } from '@/composables/settings';

const { noteRowLayoutClass } = useSettings();

const props = defineProps<{
  item: ShoppingListItem;
  parentItem?: ShoppingListItem | null;
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
  return !!props.searchActive || (props.isParentReorderDisabled ?? false);
});

const handleCheckboxChange = (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  emit('check-item', props.item, isChecked);
};

const siblingRows = (row: HTMLElement): HTMLElement[] => {
  const container = row.parentElement;
  if (!container) return [];
  return Array.from(container.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('hierarchical-item'),
  );
};

// The grabbed row follows the pointer. Siblings shift to open a gap.
// Transforms are cleared before the list order changes, so nothing stays shifted.
const onReorderPointerDown = (event: PointerEvent) => {
  if (isReorderDisabled.value || !props.customSortEnabled) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const handle = event.currentTarget;
  if (!(handle instanceof HTMLElement)) return;
  const row = handle.closest('.hierarchical-item');
  if (!(row instanceof HTMLElement)) return;

  const slots = siblingRows(row).map((el) => {
    const rect = el.getBoundingClientRect();
    return { el, top: rect.top, height: rect.height };
  });
  const from = slots.findIndex((slot) => slot.el === row);
  if (from < 0) return;

  event.preventDefault();
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is unavailable for this event. Move listeners still run.
  }

  const startY = event.clientY;
  const draggedHeight = slots[from].height;
  let to = from;
  row.classList.add('reorder-dragging');

  const placeAt = (clientY: number) => {
    // Swap only after this row crosses the midpoint of a neighbor, in either direction.
    const dy = clientY - startY;
    const visualTop = slots[from].top + dy;
    const visualBottom = visualTop + draggedHeight;
    let next = from;
    for (let i = from + 1; i < slots.length; i++) {
      const mid = slots[i].top + slots[i].height / 2;
      if (visualBottom > mid) next = i;
      else break;
    }
    for (let i = from - 1; i >= 0; i--) {
      const mid = slots[i].top + slots[i].height / 2;
      if (visualTop < mid) next = i;
      else break;
    }
    to = next;
    for (let i = 0; i < slots.length; i++) {
      const el = slots[i].el;
      if (i === from) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${clientY - startY}px)`;
        continue;
      }
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -draggedHeight;
      else if (to < from && i >= to && i < from) shift = draggedHeight;
      el.style.transition = 'transform 160ms ease';
      el.style.transform = shift ? `translateY(${shift}px)` : '';
    }
  };

  const finish = (ev: PointerEvent) => {
    if (ev.pointerId !== event.pointerId) return;
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', finish);
    handle.removeEventListener('pointercancel', finish);
    row.classList.remove('reorder-dragging');
    for (const slot of slots) {
      slot.el.style.transition = 'none';
      slot.el.style.transform = '';
    }
    if (to !== from) {
      emit('item-reorder', {
        item: props.item,
        fromIndex: from,
        toIndex: to,
        parent: props.parentItem ?? null,
      });
    }
    requestAnimationFrame(() => {
      for (const slot of slots) slot.el.style.transition = '';
    });
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== event.pointerId) return;
    ev.preventDefault();
    placeAt(ev.clientY);
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
};
</script>

<style scoped>
ion-item {
  --min-height: 56px;
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

.hierarchical-item {
  display: block;
}

.hierarchical-item.reorder-dragging {
  position: relative;
  z-index: 3;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
}

.children-container {
  display: block;
}

.reorder-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  min-width: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ion-color-medium, #92949c);
  touch-action: none;
  -webkit-margin-end: 6px;
  margin-inline-end: 6px;
}

.reorder-grip {
  width: 18px;
  height: 12px;
  background:
    linear-gradient(currentColor, currentColor) 0 0 / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) 0 5px / 100% 2px no-repeat,
    linear-gradient(currentColor, currentColor) 0 10px / 100% 2px no-repeat;
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

.reorder-handle.reorder-disabled {
  pointer-events: none;
  color: color-mix(in srgb, var(--ion-color-medium, #92949c) 45%, transparent);
}
</style>
