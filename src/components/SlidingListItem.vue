<template>
  <ion-item-sliding>
    <ion-item>
      <ion-button slot="start">
        <ion-icon slot="icon-only" :icon="caretDownOutline"></ion-icon>
      </ion-button>
      <ion-title slot="start">{{ item.name }}</ion-title>
    </ion-item>

    <ion-item-options side="start">
      <ion-item-option color="success">
        <ion-icon slot="start" :icon="bagAdd"></ion-icon>
        Add with note
      </ion-item-option>
    </ion-item-options>
    <ion-item-options side="end">
      <ion-item-option color="danger">
        <ion-icon slot="start" :icon="trash"></ion-icon>
        Delete
      </ion-item-option>
    </ion-item-options>

    <!-- Recursive rendering for children -->
    <IonList v-if="item.children && item.children.length">
      <SlidingListItem v-for="(child, index) in item.children" :key="index" :item="child" class="child-item">
      </SlidingListItem>
    </IonList>
  </ion-item-sliding>
</template>

<script>
import { bagAdd, trash, caretDownOutline } from "ionicons/icons";
import { defineComponent } from "vue";
import {
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonList
} from '@ionic/vue';

export default defineComponent({
  name: 'SlidingListItem',
  components: {
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonList,
  },
  props: {
    item: {
      type: Object,
      required: true,
    }
  },
  methods: {

  }
});
</script>

<style scoped>
.child-item {
  margin-left: 16px;
  /* Adjust as needed for desired indentation */
}
</style>