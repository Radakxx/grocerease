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
                            text="Choose how the Items list is ordered: drag to rearrange, A to Z, or the order items were added. Only one mode is available at a time."
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
                            text="When turned on, completed shopping list items are saved so you can undo them. Helps with accidental presses. Turning this off clears that history."
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
                            text="When on, long names and notes of items use as many lines as they need. When off, each text of an item stays on one line and shortens with an ellipsis. (...)"
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
                        <span>Share</span>
                        <SettingsSectionHelp
                            label="About Share"
                            text="Copies the current shopping list to the clipboard. One-time items come first, then checked items, indented by how deeply they are nested."
                        />
                    </ion-label>
                </ion-list-header>
                <ion-item>
                    <ion-label>Share Shopping List</ion-label>
                    <ion-button slot="end" @click="handleShareShoppingList">Share</ion-button>
                </ion-item>

                <ion-list-header>
                    <ion-label class="section-header">
                        <span>Import/Export</span>
                        <SettingsSectionHelp
                            label="About Import and Export"
                            text="Export items copies every item on the Items tab and every one-time item, including notes and whether each is on the shopping list. Import from text restores that copy."
                        />
                    </ion-label>
                </ion-list-header>
                <ion-item>
                    <ion-label>Export items</ion-label>
                    <ion-button slot="end" @click="handleExportItems">Export</ion-button>
                </ion-item>
                <ion-item>
                    <ion-label>Import from text</ion-label>
                    <ion-button slot="end" @click="openImportModal">Import</ion-button>
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
                :message="toastMessage"
                duration="2000"
                position="bottom"
            />
        </ion-content>
    </ion-modal>

    <ion-modal ref="importModal">
        <ion-header>
            <ion-toolbar>
                <ion-title>Import from text</ion-title>
                <ion-buttons slot="end">
                    <ion-button @click="closeImportModal">Close</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <p>Paste an items export.</p>
            <ion-textarea
                v-model="importText"
                :auto-grow="true"
                :rows="10"
                fill="outline"
                placeholder="Paste items here"
            ></ion-textarea>
            <p v-if="importPreviewText" :class="importPreviewIsError ? 'import-error' : 'import-preview'">
                {{ importPreviewText }}
            </p>
            <ion-button expand="block" :disabled="!canImport" @click="confirmImport">Import</ion-button>
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
    IonTextarea,
    alertController,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useSettings } from '@/composables/settings';
import { useItemsList, type ShoppingListItem } from '@/composables/items';
import SettingsSectionHelp from '@/components/SettingsSectionHelp.vue';
import {
    applyItemTransfer,
    countCatalogItems,
    parseItemTransfer,
    serializeItems,
} from '@/utils/itemTransfer';
import type { ImportMode } from '@/utils/itemTransfer';

const settingsModal = ref<InstanceType<typeof IonModal>>();
const importModal = ref<InstanceType<typeof IonModal>>();
const toastOpen = ref(false);
const toastMessage = ref('');
const importText = ref('');

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
    sortItemsAlphabetically,
} = useItemsList();

const importParseResult = computed(() => parseItemTransfer(importText.value));

const canImport = computed(() => importText.value.trim().length > 0 && importParseResult.value.ok);

const importPreviewIsError = computed(() => importText.value.trim().length > 0 && !importParseResult.value.ok);

const importPreviewText = computed(() => {
    if (!importText.value.trim()) return '';
    const parsed = importParseResult.value;
    if (!parsed.ok) {
        return [parsed.error, ...parsed.warnings].filter(Boolean).join(' ');
    }
    const catalogCount = countCatalogItems(parsed.catalog);
    const nestedCount = catalogCount - parsed.catalog.length;
    const parts = [`${catalogCount} ${catalogCount === 1 ? 'item' : 'items'}`];
    if (nestedCount > 0) parts.push(`${nestedCount} nested`);
    if (parsed.oneTimeItems.length > 0) {
        const count = parsed.oneTimeItems.length;
        parts.push(`${count} one-time ${count === 1 ? 'item' : 'items'}`);
    }
    return [parts.join(', '), ...parsed.warnings].filter(Boolean).join(' ');
});

function openModal() {
    settingsModal.value?.$el.present();
}

function closeModal() {
    settingsModal.value?.$el.dismiss();
}

function openImportModal() {
    importText.value = '';
    importModal.value?.$el.present();
}

function closeImportModal() {
    importModal.value?.$el.dismiss();
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

    await copyText(labels.join(',\n'), 'Shopping list copied to clipboard');
}

async function handleExportItems() {
    const exportText = serializeItems(items.value, oneTimeItems.value);
    if (!exportText) {
        console.log('No items to copy.');
        return;
    }
    await copyText(exportText, 'Items copied to clipboard');
}

async function copyText(text: string, successMessage: string) {
    try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            toastMessage.value = successMessage;
            toastOpen.value = true;
        } else {
            console.warn('Clipboard API is not available in this environment.');
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
    }
}

function chooseImportMode(): Promise<ImportMode | null> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (mode: ImportMode | null) => {
            if (settled) return;
            settled = true;
            resolve(mode);
        };
        alertController
            .create({
                header: 'Existing items',
                message: 'Add the pasted items beside the current ones, or replace the Items list and the one-time items?',
                backdropDismiss: false,
                buttons: [
                    { text: 'Cancel', role: 'cancel', handler: () => finish(null) },
                    { text: 'Add', handler: () => finish('add') },
                    { text: 'Replace', handler: () => finish('replace') },
                ],
            })
            .then((alert) => alert.present());
    });
}

async function confirmImport() {
    const parsed = importParseResult.value;
    if (!parsed.ok) return;

    const hasExisting = items.value.length > 0 || oneTimeItems.value.length > 0;
    const mode = hasExisting ? await chooseImportMode() : 'replace';
    if (!mode) return;

    const applied = applyItemTransfer(items.value, oneTimeItems.value, parsed, mode);
    if (alphabeticalSortEnabled.value) {
        sortItemsAlphabetically(applied.catalog);
    }
    items.value = applied.catalog;
    oneTimeItems.value = applied.oneTimeItems;

    closeImportModal();
    const skipped = applied.skippedDuplicates;
    toastMessage.value = skipped > 0
        ? `Items imported. ${skipped} matching ${skipped === 1 ? 'name was' : 'names were'} left unchanged.`
        : 'Items imported';
    toastOpen.value = true;
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

.import-preview,
.import-error {
    margin-top: 12px;
    white-space: pre-wrap;
}

.import-preview {
    color: var(--ion-color-medium);
}

.import-error {
    color: var(--ion-color-danger);
}
</style>
