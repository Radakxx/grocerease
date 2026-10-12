import { ref, computed, watch } from 'vue';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { flushHistory } from '@/composables/history';

const SETTINGS_FILENAME = "settings.json";

interface Settings {
    customSortEnabled: boolean;
    alphabeticalSortEnabled: boolean;
    historyEnabled: boolean;
    wrapNameAndNote?: boolean;
}

// Sorting state - mutually exclusive
const customSortEnabled = ref(false);
const alphabeticalSortEnabled = ref(false);

// History state
const historyEnabled = ref(false);

// When off, name and note sit on two ellipsized lines. When on, both wrap.
const wrapNameAndNote = ref(false);
const noteRowLayoutClass = computed(() => (wrapNameAndNote.value ? 'wrap' : 'stack'));

// Creation order sort is computed: it's ON when the other two are OFF
const creationOrderSortEnabled = computed(() => {
    return !customSortEnabled.value && !alphabeticalSortEnabled.value;
});

const loadSettings = async () => {
    try {
        const readFile = await Filesystem.readFile({
            path: SETTINGS_FILENAME,
            directory: Directory.Data,
            encoding: Encoding.UTF16,
        });
        const settings = JSON.parse(readFile.data.toString()) as Settings;
        if (settings.customSortEnabled !== undefined) {
            customSortEnabled.value = settings.customSortEnabled;
        }
        if (settings.alphabeticalSortEnabled !== undefined) {
            alphabeticalSortEnabled.value = settings.alphabeticalSortEnabled;
        }
        if (settings.historyEnabled !== undefined) {
            historyEnabled.value = settings.historyEnabled;
        }
        if (typeof settings.wrapNameAndNote === 'boolean') {
            wrapNameAndNote.value = settings.wrapNameAndNote;
        }
    } catch {
        // File doesn't exist yet; use defaults
    }
};

const saveSettings = async () => {
    await Filesystem.writeFile({
        path: SETTINGS_FILENAME,
        data: JSON.stringify({
            customSortEnabled: customSortEnabled.value,
            alphabeticalSortEnabled: alphabeticalSortEnabled.value,
            historyEnabled: historyEnabled.value,
            wrapNameAndNote: wrapNameAndNote.value,
        }),
        directory: Directory.Data,
        encoding: Encoding.UTF16,
    });
};

// Watch for changes and auto-save
watch([customSortEnabled, alphabeticalSortEnabled, historyEnabled, wrapNameAndNote], saveSettings);

// When history is disabled, clear persisted history as well.
watch(historyEnabled, async (enabled) => {
    if (!enabled) {
        await flushHistory();
    }
});

export function useSettings() {
    function handleCustomSortingChange(isChecked: boolean) {
        if (isChecked) {
            // Turn off other options
            alphabeticalSortEnabled.value = false;
            customSortEnabled.value = true;
        } else {
            customSortEnabled.value = false;
        }
    }

    function handleAlphabeticalSortChange(isChecked: boolean) {
        if (isChecked) {
            // Turn off other options
            customSortEnabled.value = false;
            alphabeticalSortEnabled.value = true;
        } else {
            alphabeticalSortEnabled.value = false;
        }
    }

    function handleHistoryChange(isChecked: boolean) {
        historyEnabled.value = isChecked;
    }

    function handleWrapNameAndNoteChange(isChecked: boolean) {
        wrapNameAndNote.value = isChecked;
    }

    return {
        customSortEnabled,
        alphabeticalSortEnabled,
        creationOrderSortEnabled,
        historyEnabled,
        wrapNameAndNote,
        noteRowLayoutClass,
        handleCustomSortingChange,
        handleAlphabeticalSortChange,
        handleHistoryChange,
        handleWrapNameAndNoteChange,
        loadSettings,
    };
}
