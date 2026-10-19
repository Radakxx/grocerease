<template>
  <!-- A checked node is a row. An unchecked node with checked descendants is a header. -->
  <template v-if="rowKind !== 'hidden'">
    <ion-item
      v-if="rowKind === 'row'"
      :class="['item-legacy', `note-layout-${noteRowLayoutClass}`, { 'has-note': !!item.note }]"
      :style="{ paddingLeft: `${depth * 20}px` }"
    >
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
        <span v-if="item.note" class="item-note">{{ item.note }}</span>
      </ion-label>
      <ion-checkbox 
        slot="end" 
        :checked="!item.checked" 
        :aria-label="`Toggle ${item.name}`"
        @ionChange.stop="handleCheckboxChange($event)"
      ></ion-checkbox>
    </ion-item>
    
    <ion-item
      v-else
      :class="['item-legacy', `note-layout-${noteRowLayoutClass}`]"
      :style="{ paddingLeft: `${depth * 20}px` }"
    >
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
import { useSettings } from '@/composables/settings';
import { hasCheckedDescendants, shoppingListRowKind } from '@/utils/shoppingList';

const { noteRowLayoutClass } = useSettings();

const props = defineProps<{
  item: ShoppingListItem;
  depth: number;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand', item: ShoppingListItem): void;
  (e: 'check-item', item: ShoppingListItem, checked: boolean): void;
}>();

const expanded = computed(() => props.item.expandedShoppingList === true);
const rowKind = computed(() => shoppingListRowKind(props.item));
const hasCheckedChildren = computed(() => hasCheckedDescendants(props.item));

const handleCheckboxChange = (event: CustomEvent) => {
  const isChecked = event.detail.checked;
  emit('check-item', props.item, isChecked);
};
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

.icon-placeholder {
  opacity: 0;
  pointer-events: none;
  min-width: 32px;
}
</style>

