<template>
    <ion-modal class="edit-item-modal" ref="addItemModal" @ionModalDidPresent="onModalPresented" @ionModalWillDismiss="onModalWillDismiss">
        <div class="edit-item-shell">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="closeModal()">Cancel</ion-button>
                </ion-buttons>
                <ion-title>{{ title }}</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" @click="confirm()">Confirm</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <div class="edit-item-form">
            <ion-item class="item-legacy">
                <ion-input label="Item name" label-placement="stacked" ref="input" type="text"
                    v-model="addItemModalText"></ion-input>
            </ion-item>
            <ion-item v-if="currentItem" class="item-legacy">
                <ion-input 
                    label="Note" 
                    label-placement="stacked"
                    v-model="localNote" 
                    placeholder="Add a note"
                    type="text"
                ></ion-input>
            </ion-item>
            <ion-item v-if="currentItem" class="item-legacy checkbox-item">
                <ion-label position="stacked">Checked</ion-label>
                <ion-checkbox 
                    slot="end"
                    :checked="localChecked"
                    :aria-label="`Toggle checked state for ${addItemModalText}`"
                    @ionChange="handleCheckboxChange"
                ></ion-checkbox>
            </ion-item>
            <ion-item class="item-legacy">
                <ion-select 
                    label="Parent (optional)" 
                    label-placement="stacked"
                    v-model="selectedParent" 
                    placeholder="None (root item)" 
                    interface="popover"
                >
                    <ion-select-option :value="null">None (root item)</ion-select-option>
                    <ion-select-option v-for="parent in possibleParents" :key="getItemPath(parent)" :value="parent">
                        {{ getItemPath(parent) }}
                    </ion-select-option>
                </ion-select>
            </ion-item>
            
            <!-- Add new child when editing -->
            <div v-if="currentItem" class="add-child-section">
                <ion-item class="item-legacy">
                    <ion-input 
                        label="Add sub-item" 
                        label-placement="stacked" 
                        v-model="newChildName" 
                        placeholder="Enter sub-item name"
                        @keyup.enter="addChild"
                    ></ion-input>
                    <ion-button slot="end" @click="addChild" :disabled="!newChildName.trim()">
                        <ion-icon slot="icon-only" :icon="add"></ion-icon>
                    </ion-button>
                </ion-item>
            </div>
        </div>

            <!-- Sub-items scroll on their own. Text fields stay outside that
                 scroller, because Android misplaces inputs once it has to scroll. -->
            <div v-if="currentItem && localChildren.length > 0" class="children-section">
                <ion-item class="item-legacy sub-items-header">
                    <div><strong>Sub-items:</strong></div>
                </ion-item>
                <ion-item v-for="(child, index) in localChildren" :key="index" class="item-legacy sub-item-row">
                    <ion-label class="sub-item-name">{{ child.name }}</ion-label>
                    <ion-button slot="end" fill="clear" @click="removeChild(index)">
                        <ion-icon slot="icon-only" :icon="trash"></ion-icon>
                    </ion-button>
                </ion-item>
            </div>
        </div>
    </ion-modal>
</template>
  
<script setup lang="ts">
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonCheckbox,
    alertController,
} from '@ionic/vue';
import { ref, defineProps, defineEmits, watch } from 'vue';
import { add, trash } from 'ionicons/icons';
import type { ShoppingListItem } from '@/composables/items';

const props = defineProps<{ 
    title: string;
    possibleParents?: ShoppingListItem[];
    currentItem?: ShoppingListItem | null;
}>();

const emit = defineEmits<{
    (e: 'item-confirmed', name: string, parent: ShoppingListItem | null, children?: ShoppingListItem[], note?: string, checked?: boolean): void;
}>();

const addItemModal = ref();
const addItemModalText = ref('');
const selectedParent = ref<ShoppingListItem | null>(null);
const newChildName = ref('');
const input = ref();
const localChildren = ref<ShoppingListItem[]>([]);
const localNote = ref('');
const localChecked = ref(false);

const hasDuplicateChildName = (name: string): boolean => {
    const normalized = name.trim().toLowerCase();
    return localChildren.value.some(
        (child) => child.name.trim().toLowerCase() === normalized
    );
};

// Helper to create deep copy of children recursively; each copy gets a new UUID
const deepCopyChildren = (children: ShoppingListItem[]): ShoppingListItem[] => {
    return children.map(child => {
        const copy: ShoppingListItem = {
            id: crypto.randomUUID(),
            name: child.name,
            note: child.note,
            checked: child.checked,
        };
        if (child.children) {
            copy.children = deepCopyChildren(child.children);
        }
        return copy;
    });
};

// Watch currentItem and create a local copy of children, note, and checked status
watch(() => props.currentItem, (newItem) => {
    if (newItem) {
        if (newItem.children) {
            // Create a deep copy of children (recursively)
            localChildren.value = deepCopyChildren(newItem.children);
        } else {
            localChildren.value = [];
        }
        localNote.value = newItem.note || '';
        localChecked.value = newItem.checked || false;
    } else {
        localChildren.value = [];
        localNote.value = '';
        localChecked.value = false;
    }
}, { immediate: true });

// Helper to get item path for display (shows hierarchy)
// Since we don't have parent references, we'll just show the item name
// For a better UX, we could show depth with indentation or icons
const getItemPath = (item: ShoppingListItem): string => {
    return item.name;
};

const openModal = (modalText: string, currentParent: ShoppingListItem | null = null) => {
    addItemModalText.value = modalText;
    selectedParent.value = currentParent;
    newChildName.value = '';
    // Reset local values when opening modal
    if (props.currentItem) {
        if (props.currentItem.children) {
            localChildren.value = props.currentItem.children.map(child => ({ ...child }));
        } else {
            localChildren.value = [];
        }
        localNote.value = props.currentItem.note || '';
        localChecked.value = props.currentItem.checked || false;
    } else {
        localChildren.value = [];
        localNote.value = '';
        localChecked.value = false;
    }
    addItemModal.value.$el.present();
}

function modalWrapper(): HTMLElement | null {
    const modalEl = addItemModal.value?.$el as HTMLElement | undefined;
    return modalEl?.shadowRoot?.querySelector('.modal-wrapper') ?? null;
}

function onModalPresented() {
    // Drop the leftover translate so Android does not paint the fields off their rows.
    // It is put back when closing so the dismiss animation can move the dialog.
    const wrapper = modalWrapper();
    if (wrapper) wrapper.style.transform = 'none';
    focusNameInput();
}

function onModalWillDismiss() {
    modalWrapper()?.style.removeProperty('transform');
}

function focusNameInput() {
    const el = input.value?.$el ?? input.value;
    if (el?.setFocus) {
        el.setFocus();
    } else {
        const nativeInput = el?.shadowRoot?.querySelector('input') ?? el?.querySelector('input');
        nativeInput?.focus();
    }
}

const closeModal = () => {
    addItemModal.value.$el.dismiss();
    selectedParent.value = null;
    newChildName.value = '';
    localChildren.value = [];
    localNote.value = '';
    localChecked.value = false;
};

const confirmChildDuplicateProceed = async (): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
        alertController
            .create({
                header: 'Duplicate sub-item',
                message:
                    'A sub-item with this name already exists here. Do you want to add it anyway?',
                backdropDismiss: false,
                buttons: [
                    { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
                    { text: 'Add anyway', role: 'confirm', handler: () => resolve(true) },
                ],
            })
            .then((alert) => alert.present());
    });
};

const addChild = async () => {
    const name = newChildName.value.trim();
    if (!name) {
        return;
    }

    if (hasDuplicateChildName(name)) {
        const proceed = await confirmChildDuplicateProceed();
        if (!proceed) {
            return;
        }
    }

    // Insert at the beginning so the new sub-item appears at the top of the list
    localChildren.value.unshift({
        name,
        note: '',
        checked: false,
    });
    newChildName.value = '';
};

const removeChild = (index: number) => {
    localChildren.value.splice(index, 1);
};

// Helper functions to check/uncheck all descendants (matching behavior from items list)
const checkAllDescendants = (children: ShoppingListItem[]) => {
    for (const child of children) {
        if (!child.checked) {
            child.checked = true;
        }
        if (child.children) {
            checkAllDescendants(child.children);
        }
    }
};

const uncheckAllDescendants = (children: ShoppingListItem[]) => {
    for (const child of children) {
        child.checked = false;
        if (child.children) {
            uncheckAllDescendants(child.children);
        }
    }
};

// Handle checkbox change - propagate to children like in the items list
const handleCheckboxChange = (event: CustomEvent) => {
    const checked = event.detail.checked;
    localChecked.value = checked;
    
    // Propagate to all children (matching behavior from HierarchicalItem)
    if (checked) {
        // Check parent: check all descendants
        checkAllDescendants(localChildren.value);
    } else {
        // Uncheck parent: uncheck all descendants
        uncheckAllDescendants(localChildren.value);
    }
};

const confirm = () => {
    if (input.value && addItemModalText.value.trim()) {
        // Emit an event with item name, selected parent, children, note, and checked status (if editing)
        const children = props.currentItem ? localChildren.value : undefined;
        const note = props.currentItem ? localNote.value : undefined;
        const checked = props.currentItem ? localChecked.value : undefined;
        emit('item-confirmed', addItemModalText.value.trim(), selectedParent.value, children, note, checked);
        closeModal();
    }
};

defineExpose({
    openModal
})
</script>

<style scoped>
.edit-item-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--ion-background-color, #fff);
}

.edit-item-form {
    flex: 0 0 auto;
    overflow: visible;
    padding: 16px 16px 0;
}

.children-section {
    flex: 1 1 auto;
    min-height: 0;
    margin: 16px 16px 0;
    border-top: 1px solid var(--ion-color-light);
    padding-top: 16px;
    padding-bottom: 16px;
    overflow-x: hidden;
    overflow-y: auto;
}

.add-child-section {
    margin-top: 16px;
    border-top: 1px solid var(--ion-color-light);
    padding-top: 16px;
}

ion-select {
    width: 100%;
    max-width: 100%;
}

ion-item {
    --min-height: auto;
}

ion-item ion-label[position="stacked"] {
    width: 100%;
}

.checkbox-item {
    --padding-start: 16px;
    --inner-padding-end: 16px;
    --min-height: 48px;
    width: 100%;
}

.checkbox-item ion-label[position="stacked"] {
    width: 100%;
    margin-bottom: 0;
}

.children-section ion-item {
    --padding-start: 16px;
    --inner-padding-end: 16px;
    width: 100%;
    max-width: 100%;
}

.children-section ion-item::part(native) {
    width: 100%;
    max-width: 100%;
}

.children-section .sub-item-row {
    width: 100%;
    max-width: 100%;
}

.children-section .sub-item-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>