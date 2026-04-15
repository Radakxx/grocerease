<template>
    <ion-modal ref="addNoteModal" @ionModalDidPresent="focusNameInput">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="closeAddNoteModal()">Cancel</ion-button>
                </ion-buttons>
                <ion-title>{{ title }}</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" @click="confirmAddNote()">Confirm</ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <ion-item>
                <ion-input label="Enter your text here" label-placement="stacked" ref="noteInput" type="text"
                    v-model="noteText"></ion-input>
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
import { ref, defineProps, defineEmits } from 'vue';

const { title } = defineProps({ title: String }); // Accept title as a prop
const emit = defineEmits(['note-confirmed']);
const addNoteModal = ref();
const noteText = ref('');
const noteInput = ref();

const openModal = (initialNote = '') => {
    noteText.value = initialNote || '';
    addNoteModal.value.$el.present();
}

function focusNameInput() {
    const el = noteInput.value?.$el ?? noteInput.value;
    if (el?.setFocus) {
        el.setFocus();
    } else {
        const nativeInput = el?.shadowRoot?.querySelector('input') ?? el?.querySelector('input');
        nativeInput?.focus();
    }
}

const closeAddNoteModal = () => {
    addNoteModal.value.$el.dismiss();
};

const confirmAddNote = () => {
    // Emit the note text (may be empty to delete the note); item stays, note is updated or cleared
    emit('note-confirmed', noteText.value.trim());
    closeAddNoteModal();
};

defineExpose({
    openModal
})
</script>
  