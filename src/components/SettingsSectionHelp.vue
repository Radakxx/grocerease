<template>
  <span class="settings-section-help">
    <ion-button
      :id="triggerId"
      class="settings-section-help__button"
      fill="clear"
      size="small"
      :aria-label="label"
    >
      <ion-icon slot="icon-only" :icon="helpCircleOutline"></ion-icon>
    </ion-button>
    <ion-popover
      :trigger="triggerId"
      :trigger-action="triggerAction"
      size="auto"
      side="bottom"
      alignment="center"
      :show-backdrop="triggerAction === 'click'"
      :arrow="true"
    >
      <ion-content class="ion-padding settings-section-help__content">
        <p>{{ text }}</p>
      </ion-content>
    </ion-popover>
  </span>
</template>

<script lang="ts">
let helpSeq = 0;
</script>

<script setup lang="ts">
import { IonButton, IonIcon, IonPopover, IonContent } from '@ionic/vue';
import { helpCircleOutline } from 'ionicons/icons';

defineProps<{
  text: string;
  label: string;
}>();

const triggerId = `settings-help-${++helpSeq}`;

const triggerAction =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? 'hover'
    : 'click';
</script>

<style scoped>
.settings-section-help {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.settings-section-help__button {
  margin: 0;
  height: 28px;
  width: 28px;
  min-height: 28px;
  --padding-start: 0;
  --padding-end: 0;
  --color: var(--ion-color-medium);
}
</style>

<style>
.settings-section-help__content {
  --background: var(--ion-background-color, #fff);
}

.settings-section-help__content p {
  margin: 0;
  max-width: 240px;
  font-size: 0.875rem;
  line-height: 1.35;
  color: var(--ion-text-color, #000);
}
</style>
