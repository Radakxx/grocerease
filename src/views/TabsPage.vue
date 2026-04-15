<template>
  <ion-page id="main-content">

    <ion-tabs>

      <MainHeader @open-settings="openSettingsModal" />

      <SettingsModal ref="settingsModal" />

      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" class="tab-bar-with-add">
        <ion-tab-button tab="tab1" href="/tabs/tab1">
          <ion-icon aria-hidden="true" :icon="storefront" />
          <ion-label>Items</ion-label>
        </ion-tab-button>

        <div class="tab-bar-add-slot" aria-hidden="true"></div>

        <ion-tab-button tab="tab2" href="/tabs/tab2">
          <ion-icon aria-hidden="true" :icon="cart" />
          <ion-label>Shopping list</ion-label>
        </ion-tab-button>
      </ion-tab-bar>

      <!-- Add button outside tab bar so it isn't clipped by the tab bar container -->
      <div class="tab-bar-add-button-wrapper">
        <ion-fab-button
          class="tab-bar-add-button"
          :class="addButtonClass"
          aria-label="Add"
          @click="handleAddClick"
        >
          <ion-icon :icon="add"></ion-icon>
        </ion-fab-button>
      </div>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet, IonFabButton } from '@ionic/vue';
import { storefront, cart, add } from 'ionicons/icons';
import { ref, provide, computed } from 'vue';
import { useRoute } from 'vue-router';
import MainHeader from '@/components/MainHeader.vue';
import SettingsModal from '@/components/SettingsModal.vue';

const route = useRoute();
const settingsModal = ref<InstanceType<typeof SettingsModal>>();
const openHandlers = ref<Record<string, (() => void) | null>>({});

function registerAddHandler(path: string, fn: (() => void) | null) {
  openHandlers.value[path] = fn;
  openHandlers.value = { ...openHandlers.value };
}

provide('registerAddHandler', registerAddHandler);

function handleAddClick() {
  const path = route.path;
  openHandlers.value[path]?.();
}

const addButtonClass = computed(() => {
  if (route.path.includes('tab1')) return 'add-button-items';
  if (route.path.includes('tab2')) return 'add-button-shopping';
  return '';
});

function openSettingsModal() {
    settingsModal.value?.openModal();
}
</script>

<style scoped>
.tab-bar-with-add {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  position: relative;
  z-index: 100;
  padding: 0 16px;
  column-gap: 16px;
}

.tab-bar-with-add ion-tab-button {
  justify-self: center;
}

/* Empty slot keeps tab bar layout centered so the two tab buttons don't cover the add button area */
.tab-bar-add-slot {
  width: 80px; /* Reserve space for the floating add button */
  justify-self: center;
}

/* Add button lives outside the tab bar so it isn't clipped by the tab bar container */
.tab-bar-add-button-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
  z-index: 101;
}

.tab-bar-add-button-wrapper .tab-bar-add-button {
  pointer-events: auto;
}

.tab-bar-add-button {
  --size: 56px;
  --box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px; /* sit slightly above the tab bar */
}

.add-button-items {
  --background: #b7f399;
  --background-activated: #87d361;
  --background-hover: #a3e681;
  --color: black;
}

.add-button-shopping {
  --background: #ff8c69;
  --background-activated: #ff6b47;
  --background-hover: #ff7a5a;
  --color: white;
}

/* Slightly larger than default tab bar icons (visually) */
@media (min-width: 360px) {
  .tab-bar-add-button {
    --size: 64px;
  }
}
</style>
