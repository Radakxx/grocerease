<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { App } from '@capacitor/app';
import { onMounted, onUnmounted } from 'vue';
import { useSettings } from '@/composables/settings';

const handleBackButton = (event: CustomEvent) => {
  event.detail.register(50, () => {
    App.exitApp();
  });
};

onMounted(async () => {
  document.addEventListener('ionBackButton', handleBackButton);
  
  // Load settings on app startup
  const { loadSettings } = useSettings();
  await loadSettings();
});

onUnmounted(() => {
  document.removeEventListener('ionBackButton', handleBackButton);
});
</script>
