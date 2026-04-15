import { ref } from 'vue';

/** Shared query for Items tab header + list (view-only filter). */
const searchQuery = ref('');

export function useItemsTabSearch() {
  return { searchQuery };
}
