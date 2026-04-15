<template>
    <ion-header>
        <ion-toolbar v-if="isItemsTab" class="items-header-toolbar">
            <ion-title slot="start" class="items-header-side-title">Items</ion-title>
            <div class="items-native-search" role="search">
                <ion-icon class="items-native-search__icon" :icon="searchOutline" aria-hidden="true" />
                <input
                    ref="searchInputRef"
                    class="items-native-search__input"
                    type="search"
                    v-model="searchQuery"
                    placeholder="Search"
                    aria-label="Search items"
                    inputmode="search"
                    enterkeyhint="search"
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck="false"
                />
                <ion-button
                    v-if="searchQuery.trim()"
                    class="items-native-search__clear"
                    fill="clear"
                    aria-label="Clear search"
                    @click="clearSearch"
                >
                    <ion-icon slot="icon-only" :icon="closeCircle" />
                </ion-button>
            </div>
            <ion-buttons slot="end">
                <ion-button @click="openSettings()">
                    <ion-icon :icon="settings" slot="icon-only"></ion-icon>
                </ion-button>
            </ion-buttons>
        </ion-toolbar>
        <ion-toolbar v-else>
            <ion-title size="large">{{ pageTitle }}</ion-title>
            <ion-buttons slot="end">
                <ion-button @click="openSettings()">
                    <ion-icon :icon="settings" slot="icon-only"></ion-icon>
                </ion-button>
            </ion-buttons>
        </ion-toolbar>
    </ion-header>
</template>

<script setup lang="ts">
import {
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { settings, searchOutline, closeCircle } from 'ionicons/icons';
import { useItemsTabSearch } from '@/composables/itemsTabSearch';

const route = useRoute();
const { searchQuery } = useItemsTabSearch();
const searchInputRef = ref<HTMLInputElement | null>(null);

const isItemsTab = computed(() => route.path.includes('/tab1'));

const pageTitle = computed(() => {
    const path = route.path;
    if (path.includes('/tab1')) {
        return 'Items';
    } else if (path.includes('/tab2')) {
        return 'Shopping List';
    }
    return 'GrocerEase';
});

const emit = defineEmits<{
    (e: 'open-settings'): void;
}>();

function openSettings() {
    emit('open-settings');
}

function clearSearch() {
    searchQuery.value = '';
    searchInputRef.value?.focus();
}
</script>

<style scoped>
.items-header-toolbar {
    --padding-start: 8px;
    --padding-end: 4px;
    /* Let the bar grow vertically when users use large accessibility text */
    --min-height: max(56px, 3.25rem);
    align-items: center;
}

.items-header-side-title {
    flex-shrink: 0;
    padding-inline-end: 8px;
    font-size: 1.25rem;
    font-weight: 600;
    align-self: center;
}

/**
 * Native search field: respects system font scaling (unlike ion-searchbar’s
 * fixed MD line-height / icon offset inside shadow DOM).
 */
.items-native-search {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    box-sizing: border-box;
    background: var(--ion-color-step-100, #f4f5f8);
    border-radius: 8px;
    padding-inline-start: 0.625rem;
    padding-inline-end: 0.125rem;
    min-height: max(2.75rem, 44px);
}

.items-native-search__icon {
    flex-shrink: 0;
    width: 1.25em;
    height: 1.25em;
    color: var(--ion-color-step-600, #666666);
}

.items-native-search__input {
    flex: 1;
    min-width: 0;
    min-height: 0;
    border: none;
    margin: 0;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.35;
    padding-block: 0.5rem;
    color: var(--ion-text-color, #000);
    -webkit-appearance: none;
    appearance: none;
}

.items-native-search__input::placeholder {
    color: var(--ion-color-step-500, #737373);
    opacity: 0.9;
}

.items-native-search__input:focus {
    outline: none;
}

/* Remove Safari search decoration / clear duplicate */
.items-native-search__input::-webkit-search-decoration,
.items-native-search__input::-webkit-search-cancel-button {
    display: none;
}

.items-native-search__clear {
    flex-shrink: 0;
    --padding-start: 6px;
    --padding-end: 6px;
    margin: 0;
    height: auto;
    min-height: 2.25rem;
}
</style>
