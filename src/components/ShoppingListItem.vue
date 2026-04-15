<template>
  <!-- Render if item is checked OR has checked descendants -->
  <template v-if="item.checked || hasCheckedChildren">
    <!-- Only show the item itself if it's checked -->
    <ion-item v-if="item.checked" :style="{ paddingLeft: `${depth * 20}px` }">
      <ion-button 
        slot="start"
        class="expand-arrow-button"
        @click.stop="item.children && hasCheckedChildren ? $emit('toggle-expand', item) : null"
        fill="clear"
        size="small"
        :class="{ 'icon-placeholder': !item.children || !hasCheckedChildren }"
      >
        <ion-icon 
          slot="icon-only" 
          :icon="item.children && hasCheckedChildren ? (expanded ? chevronDown : chevronForward) : chevronForward"
        ></ion-icon>
      </ion-button>
      <ion-label class="item-label">
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.note" class="item-note"> • {{ item.note }}</span>
      </ion-label>
      <ion-checkbox 
        slot="end" 
        :checked="!item.checked" 
        :aria-label="`Toggle ${item.name}`"
        @ionChange.stop="handleCheckboxChange($event)"
      ></ion-checkbox>
    </ion-item>
    
    <!-- Show parent container (without checkbox) if parent is not checked but has checked children -->
    <ion-item v-else-if="hasCheckedChildren" :style="{ paddingLeft: `${depth * 20}px` }">
      <ion-button 
        slot="start"
        class="expand-arrow-button"
        @click.stop="item.children && hasCheckedChildren ? $emit('toggle-expand', item) : null"
        fill="clear"
        size="small"
        :class="{ 'icon-placeholder': !item.children || !hasCheckedChildren }"
      >
        <ion-icon 
          slot="icon-only" 
          :icon="item.children && hasCheckedChildren ? (expanded ? chevronDown : chevronForward) : chevronForward"
        ></ion-icon>
      </ion-button>
      <ion-label class="item-label">
        <span class="item-name">{{ item.name }}</span>
      </ion-label>
    </ion-item>
    
    <!-- Recursive children - show only if expanded (collapse button controls this) -->
    <template v-if="item.children && expanded">
      <ShoppingListItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        @toggle-expand="$emit('toggle-expand', $event)"
        @check-item="(item, checked) => $emit('check-item', item, checked)"
      />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonItem,
  IonButton,
  IonIcon,
  IonLabel,
  IonCheckbox,
} from '@ionic/vue';
import { chevronDown, chevronForward } from 'ionicons/icons';
import type { ShoppingListItem } from '@/composables/items';

const props = defineProps<{
  item: ShoppingListItem;
  depth: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand', item: ShoppingListItem): void;
  (e: 'check-item', item: ShoppingListItem, checked: boolean): void;
}>();

const expanded = computed(() => props.item.expandedShoppingList === true);

const handleCheckboxChange = (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  emit('check-item', props.item, isChecked);
};

// Helper function to recursively check if any descendants are checked
const hasCheckedDescendants = (item: ShoppingListItem): boolean => {
  if (!item.children) return false;
  for (const child of item.children) {
    if (child.checked) return true;
    if (hasCheckedDescendants(child)) return true;
  }
  return false;
};

const hasCheckedChildren = computed(() => {
  return hasCheckedDescendants(props.item);
});
</script>

<style scoped>
ion-item {
  --min-height: 56px;
}

/* Match spacing between arrow and name (Ionic defaults to 16px on slot=start) */
.expand-arrow-button {
  -webkit-margin-end: 6px;
  margin-inline-end: 6px;
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

.icon-placeholder {
  opacity: 0;
  pointer-events: none;
  min-width: 32px;
}
</style>

