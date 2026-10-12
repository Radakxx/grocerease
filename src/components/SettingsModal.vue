<template>
    <ion-modal ref="settingsModal">
        <ion-header>
            <ion-toolbar>
            <ion-title>Settings</ion-title>
                <ion-buttons slot="end">
                    <ion-button @click="closeModal()">Close</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding settings-modal-content">
            <ion-list>
                <ion-list-header>
                    <ion-label class="section-header">
                        <span>Sorting</span>
                        <SettingsSectionHelp
                            label="About Sorting"
                            text="Choose how the Items list is ordered: drag to rearrange, A to Z, or the order items were added. Only one mode is on at a time."
                        />
                    </ion-label>
                </ion-list-header>
                <ion-item>
                    <ion-label>Enable custom sorting</ion-label>
                    <ion-toggle 
                        :checked="customSortEnabled" 
                        @ionChange="(event) => handleCustomSortingChange(event.detail.checked)"
                    ></ion-toggle>
                </ion-item>
                
                <ion-item>
                    <ion-label>Sort items alphabetically</ion-label>
                    <ion-toggle 
                        :checked="alphabeticalSortEnabled" 
                        @ionChange="(event) => handleAlphabeticalSortChange(event.detail.checked)"
                    ></ion-toggle>
                </ion-item>
                
                <ion-item>
                    <ion-label>Sort in the order of creation (Default)</ion-label>
                    <ion-toggle 
                        :checked="creationOrderSortEnabled" 
                        :disabled="true"
                    ></ion-toggle>
                </ion-item>

                <ion-list-header>
                    <ion-label class="section-header">
                        <span>History</span>
                        <SettingsSectionHelp
                            label="About History"
                            text="When on, completed shopping list items are saved so you can undo them. Turning this off clears that history."
                        />
                    </ion-label>
                </ion-list-header>
                <!-- Disabled until history feature is implemented; re-enable when ready -->
                <ion-item>
                    <ion-label>Enable history</ion-label>
                    <ion-toggle 
                        :checked="historyEnabled" 
                        @ionChange="(event) => handleHistoryChange(event.detail.checked)"
                    ></ion-toggle>
                </ion-item>

                <ion-list-header>
                    <ion-label class="section-header">
                        <span>Wrapping</span>
                        <SettingsSectionHelp
                            label="About Wrapping"
                            text="When on, long names and notes use as many lines as they need. When off, each stays on one line and shortens with an ellipsis."
                        />
                    </ion-label>
                </ion-list-header>
                <ion-item>
                    <ion-label class="ion-text-wrap">Wrap name and note indefinitely</ion-label>
                    <ion-toggle
                        :checked="wrapNameAndNote"
                        @ionChange="(event) => handleWrapNameAndNoteChange(event.detail.checked)"
                    ></ion-toggle>
                </ion-item>

                <ion-list-header>
                    <ion-label class="section-header">
                        <span>Import/Export</span>
                        <SettingsSectionHelp
                            label="About Import and Export"
                            text="Share copies the current shopping list to the clipboard. CSV import is not available yet."
                        />
                    </ion-label>
                </ion-list-header>
                <!-- Disabled until CSV import is implemented; re-enable when ready -->
                <ion-item>
                    <ion-label>Import CSV</ion-label>
                    <ion-button slot="end" :disabled="true" @click="handleImportCSV">Import</ion-button>
                </ion-item>
                <ion-item>
                    <ion-label>Share Shopping List</ion-label>
                    <ion-button slot="end" @click="handleShareShoppingList">Share</ion-button>
                </ion-item>

                <ion-list-header>
                    <ion-label class="section-header">Info</ion-label>
                </ion-list-header>
                <ion-item lines="none">
                    <ion-label class="ion-text-wrap">
                        <p>Grocerease helps you manage your shopping list efficiently.</p>
                        <p style="margin-top: 8px; font-size: 0.9em; color: var(--ion-color-medium);">
                            © 2026 Grocerease. All rights reserved.
                        </p>
                    </ion-label>
                </ion-item>
            </ion-list>

            <ion-toast
                :is-open="toastOpen"
                @didDismiss="toastOpen = false"
                message="Shopping list copied to clipboard"
                duration="2000"
                position="bottom"
            />
        </ion-content>
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
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonToggle,
    IonToast,
} from '@ionic/vue';
import { ref } from 'vue';
import { useSettings } from '@/composables/settings';
import { useItemsList, type ShoppingListItem } from '@/composables/items';
import SettingsSectionHelp from '@/components/SettingsSectionHelp.vue';

const settingsModal = ref<InstanceType<typeof IonModal>>();
const toastOpen = ref(false);

// Use shared settings composable
const {
    customSortEnabled,
    alphabeticalSortEnabled,
    creationOrderSortEnabled,
    historyEnabled,
    wrapNameAndNote,
    handleCustomSortingChange,
    handleAlphabeticalSortChange,
    handleHistoryChange,
    handleWrapNameAndNoteChange,
} = useSettings();

// Shared shopping list state (regular + one-time items)
const {
    items,
    oneTimeItems,
} = useItemsList();

function openModal() {
    settingsModal.value?.$el.present();
}

function closeModal() {
    settingsModal.value?.$el.dismiss();
}

// CSV import is not implemented yet.
function handleImportCSV() {
    // TODO: Implement CSV import
}

function collectShoppingListLabels(): string[] {
    const labels: string[] = [];

    // One-time items shown at the top of the Shopping List tab
    for (const item of oneTimeItems.value) {
        const label = item.note ? `${item.name} ${item.note}` : item.name;
        labels.push(label);
    }

    // Regular items: include all checked items in the tree, with indentation by depth
    const walk = (list: ShoppingListItem[], depth: number) => {
        for (const item of list) {
            if (item.checked) {
                const label = item.note ? `${item.name} ${item.note}` : item.name;
                const indent = '  '.repeat(depth);
                labels.push(`${indent}${label}`);
            }
            if (item.children && item.children.length > 0) {
                walk(item.children, depth + 1);
            }
        }
    };

    walk(items.value, 0);

    return labels;
}

async function handleShareShoppingList() {
    const labels = collectShoppingListLabels();

    if (!labels.length) {
        console.log('No shopping list items to copy.');
        return;
    }

    const shareText = labels.join(',\n');

    try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareText);
            toastOpen.value = true;
        } else {
            console.warn('Clipboard API is not available in this environment.');
        }
    } catch (error) {
        console.error('Failed to copy shopping list to clipboard:', error);
    }
}

defineExpose({
    openModal,
    closeModal,
});
</script>

<style scoped>
.section-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    font-weight: 500;
    color: var(--ion-color-dark);
    opacity: 0.7;
}

/* Match Tab1/Tab2: list and items extend to content edges, full-width separator lines */
.settings-modal-content ion-list {
    overflow: visible;
    --padding-start: 0;
    --padding-end: 0;
}

.settings-modal-content ion-list ion-item {
    /* Same 16px as --padding-start; do not also set --padding-end or the gutter doubles. */
    --inner-padding-end: 16px;
    --padding-end: 0;
    --border-width: 0;
    position: relative;
    overflow: visible;
}

.settings-modal-content ion-list ion-item::after {
    content: '';
    position: absolute;
    bottom: 0;
    /* Extend to content edges: ion-content.ion-padding adds ~16px each side */
    left: -16px;
    right: -16px;
    height: 0.55px;
    background-color: var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, #c8c7cc)));
    pointer-events: none;
    z-index: 1;
}

/* Info item has lines="none" so don't draw a separator under it */
.settings-modal-content ion-list ion-item[lines="none"]::after {
    display: none;
}
</style>
