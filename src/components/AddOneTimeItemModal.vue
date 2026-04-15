<template>
    <ion-modal ref="oneTimeItemModal" @ionModalDidPresent="focusNameInput">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="closeModal()">Cancel</ion-button>
                </ion-buttons>
                <ion-title>Add One-Time Item</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" @click="confirm()">Add</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <ion-item>
                <ion-input 
                    label="Item name" 
                    label-placement="stacked" 
                    ref="nameInput" 
                    type="text"
                    v-model="itemName"
                ></ion-input>
            </ion-item>
            <ion-item>
                <ion-input 
                    label="Note" 
                    label-placement="stacked"
                    v-model="itemNote" 
                    placeholder="Add a note (optional)"
                    type="text"
                ></ion-input>
            </ion-item>
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
    IonInput,
    IonItem,
} from '@ionic/vue';
import { ref, defineEmits } from 'vue';

const emit = defineEmits<{
    (e: 'item-added', name: string, note: string): void;
}>();

const oneTimeItemModal = ref();
const itemName = ref('');
const itemNote = ref('');
const nameInput = ref();

const openModal = () => {
    itemName.value = '';
    itemNote.value = '';
    oneTimeItemModal.value.$el.present();
}

function focusNameInput() {
    const el = nameInput.value?.$el ?? nameInput.value;
    if (el?.setFocus) {
        el.setFocus();
    } else {
        const nativeInput = el?.shadowRoot?.querySelector('input') ?? el?.querySelector('input');
        nativeInput?.focus();
    }
}

const closeModal = () => {
    oneTimeItemModal.value.$el.dismiss();
    itemName.value = '';
    itemNote.value = '';
};

const confirm = () => {
    if (nameInput.value && itemName.value.trim()) {
        emit('item-added', itemName.value.trim(), itemNote.value.trim());
        closeModal();
    }
};

defineExpose({
    openModal
})
</script>


