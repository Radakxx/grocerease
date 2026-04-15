import { ref, onMounted, watch } from "vue";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const FILENAME = "itemslist.json";
const ONETIME_FILENAME = "onetimeitems.json";

const items = ref<ShoppingListItem[]>([]);

export interface OneTimeItem {
  id?: string;
  name: string;
  note: string;
  checked: boolean;
}

const oneTimeItems = ref<OneTimeItem[]>([]);

/** Ensures every item in the tree has an id; assigns UUID where missing. */
function ensureItemIds(list: ShoppingListItem[]): void {
  for (const item of list) {
    if (item.id == null) item.id = crypto.randomUUID();
    if (item.children?.length) ensureItemIds(item.children);
  }
}

function ensureOneTimeItemIds(list: OneTimeItem[]): void {
  for (const item of list) {
    if (item.id == null) item.id = crypto.randomUUID();
  }
}

/**
 * Recursively sorts items alphabetically by name (case-insensitive) at each level
 * Uses localeCompare for proper handling of accented characters (e.g., Hungarian á, é, í, ó, ö, ő, ú, ü, ű)
 */
function sortItemsAlphabetically(itemList: ShoppingListItem[]): void {
  // Sort current level using localeCompare for proper accented character handling
  // Using undefined locale uses browser's default locale, which handles accented characters correctly
  itemList.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', caseFirst: 'lower' });
  });
  
  // Recursively sort children of each item
  for (const item of itemList) {
    if (item.children && item.children.length > 0) {
      sortItemsAlphabetically(item.children);
    }
  }
}

/**
 * Finds the correct alphabetical insertion index for a new item
 * Uses localeCompare for proper handling of accented characters
 */
function findAlphabeticalInsertIndex(itemList: ShoppingListItem[], itemName: string): number {
  for (let i = 0; i < itemList.length; i++) {
    if (itemName.localeCompare(itemList[i].name, undefined, { sensitivity: 'base', caseFirst: 'lower' }) < 0) {
      return i;
    }
  }
  return itemList.length; // Insert at end if it's alphabetically last
}

const addItem = async (
  item: ShoppingListItem,
  parentItem: ShoppingListItem | null = null,
  insertAlphabetically = false
) => {
  if (parentItem) {
    parentItem.children = parentItem.children || [];
    if (insertAlphabetically) {
      const insertIndex = findAlphabeticalInsertIndex(parentItem.children, item.name);
      parentItem.children.splice(insertIndex, 0, item);
    } else {
      // When not sorting alphabetically, insert new items at the beginning
      parentItem.children.unshift(item);
    }
  } else {
    // Add to root items
    if (insertAlphabetically) {
      const insertIndex = findAlphabeticalInsertIndex(items.value, item.name);
      items.value.splice(insertIndex, 0, item);
    } else {
      // When not sorting alphabetically, insert new items at the beginning
      items.value.unshift(item);
    }
  }
};


// Get all items that can be parents (all items in the tree, excluding a specific item and its descendants)
const getPossibleParents = (excludeItem: ShoppingListItem | null = null): ShoppingListItem[] => {
  const possibleParents: ShoppingListItem[] = [];
  
  const collectItems = (itemList: ShoppingListItem[]) => {
    for (const item of itemList) {
      // Skip the item being excluded and its descendants
      if (excludeItem && (item === excludeItem || isDescendant(item, excludeItem))) {
        continue;
      }
      possibleParents.push(item);
      if (item.children) {
        collectItems(item.children);
      }
    }
  };
  
  collectItems(items.value);
  return possibleParents;
};

/**
 * Returns true if an item with the same name (case-insensitive) already exists at the given level.
 * Only checks siblings (same parent); does not check children or parents.
 * @param name - The name to check
 * @param parent - The parent of the level to check (null = root level)
 * @param excludeItem - If provided, this item is excluded from the check (e.g. when editing)
 */
function hasDuplicateNameAtLevel(
  name: string,
  parent: ShoppingListItem | null,
  excludeItem: ShoppingListItem | null = null
): boolean {
  const siblings = parent ? (parent.children || []) : items.value;
  const normalizedName = name.trim().toLowerCase();
  return siblings.some(
    (s) => s !== excludeItem && s.name.trim().toLowerCase() === normalizedName
  );
}

// Recursive helper to get all descendants of an item
const getAllDescendants = (item: ShoppingListItem): ShoppingListItem[] => {
  const descendants: ShoppingListItem[] = [];
  if (item.children) {
    for (const child of item.children) {
      descendants.push(child);
      descendants.push(...getAllDescendants(child));
    }
  }
  return descendants;
};

// Check if an item is a descendant of another item (for circular reference prevention)
const isDescendant = (item: ShoppingListItem, potentialParent: ShoppingListItem): boolean => {
  if (!potentialParent.children) return false;
  for (const child of potentialParent.children) {
    if (child === item) return true;
    if (isDescendant(item, child)) return true;
  }
  return false;
};

// Recursively check all descendants of an item
const checkAllDescendants = (item: ShoppingListItem) => {
  if (item.children) {
    for (const child of item.children) {
      if (!child.checked) {
        child.checked = true;
      }
      checkAllDescendants(child);
    }
  }
};

// Recursively uncheck all descendants of an item
const uncheckAllDescendants = (item: ShoppingListItem) => {
  if (item.children) {
    for (const child of item.children) {
      child.checked = false;
      uncheckAllDescendants(child);
    }
  }
};

// Find item in the tree structure
const findItemInTree = (
  items: ShoppingListItem[],
  targetItem: ShoppingListItem
): { item: ShoppingListItem; parent: ShoppingListItem | null; index: number } | null => {
  for (let i = 0; i < items.length; i++) {
    if (items[i] === targetItem) {
      return { item: items[i], parent: null, index: i };
    }
    const children = items[i].children;
    if (children) {
      for (let j = 0; j < children.length; j++) {
        if (children[j] === targetItem) {
          return { item: children[j], parent: items[i], index: j };
        }
        const found = findItemInTree([children[j]], targetItem);
        if (found) return found;
      }
    }
  }
  return null;
};

const deleteItem = async (
  item: ShoppingListItem
) => {
  // Recursively delete all descendants first
  if (item.children) {
    const descendants = getAllDescendants(item);
    for (const descendant of descendants) {
      const found = findItemInTree(items.value, descendant);
      if (found && !found.parent) {
        // Remove from root items
        const rootIndex = items.value.indexOf(descendant);
        if (rootIndex !== -1) {
          items.value.splice(rootIndex, 1);
        }
      }
    }
  }
  
  // Find and remove the item itself
  const found = findItemInTree(items.value, item);
  if (found) {
    if (found.parent) {
      // Remove from parent's children
      found.parent.children?.splice(found.index, 1);
      
      // Collapse parent if it now has no children
      if (found.parent.children?.length === 0) {
        found.parent.expanded = false;
      }
    } else {
      // Remove from root items
      const rootIndex = items.value.indexOf(item);
      if (rootIndex !== -1) {
        items.value.splice(rootIndex, 1);
      }
    }
  }
};

const loadSaved = async () => {
  try {
    const itemList = await readList(FILENAME);

    if (itemList !== null) {
      ensureItemIds(itemList);
      items.value = itemList;
      console.log("Loaded items:", items.value);
    } else {
      console.log("Error loading items from file.");
    }
  } catch (error) {
    console.error("Error in loadSaved:", error);
  }
};

const loadOneTimeSaved = async () => {
  try {
    const readFile = await Filesystem.readFile({
      path: ONETIME_FILENAME,
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });
    const list = JSON.parse(readFile.data.toString()) as OneTimeItem[];
    if (Array.isArray(list)) {
      ensureOneTimeItemIds(list);
      oneTimeItems.value = list;
    }
  } catch {
    // File may not exist yet; leave oneTimeItems empty
  }
};

const saveOneTimeToStorage = async () => {
  await Filesystem.writeFile({
    path: ONETIME_FILENAME,
    data: JSON.stringify(oneTimeItems.value),
    directory: Directory.Data,
    encoding: Encoding.UTF16,
  });
};

/** Add a one-time item and persist immediately so it survives reload. */
const addOneTimeItem = async (name: string, note: string) => {
  const item: OneTimeItem = {
    id: crypto.randomUUID(),
    name,
    note,
    checked: false,
  };
  oneTimeItems.value.push(item);
  await saveOneTimeToStorage();
};

/** Remove a one-time item by index and persist immediately. */
const removeOneTimeItem = async (index: number) => {
  oneTimeItems.value.splice(index, 1);
  await saveOneTimeToStorage();
};

const saveListToStorage = async () => {
  await saveList(items.value, FILENAME);
};

const saveList = async (
  list: Array<ShoppingListItem>,
  fileName: string
): Promise<void> => {
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: JSON.stringify(list),
    directory: Directory.Data,
    encoding: Encoding.UTF16,
  });
  console.log("Saved file: ", savedFile);
};

const readList = async (
  fileName: string
): Promise<Array<ShoppingListItem> | null> => {
  try {
    const readFile = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Data,
      encoding: Encoding.UTF16,
    });

    // Parse the JSON data from the file
    const list = JSON.parse(
      readFile.data.toString()
    ) as Array<ShoppingListItem>;
    return list;
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
};


// Watch for changes in the 'items' property and save the list when it changes
watch(items, saveListToStorage, { deep: true });
watch(oneTimeItems, saveOneTimeToStorage, { deep: true });

export const useItemsList = () => {
  onMounted(async () => {
    await loadSaved();
    await loadOneTimeSaved();
  });

  return {
    addItem,
    deleteItem,
    items,
    oneTimeItems,
    addOneTimeItem,
    removeOneTimeItem,
    ensureItemIds,
    getAllDescendants,
    checkAllDescendants,
    uncheckAllDescendants,
    isDescendant,
    getPossibleParents,
    findItemInTree,
    sortItemsAlphabetically,
    findAlphabeticalInsertIndex,
    hasDuplicateNameAtLevel,
  };
};

export interface ShoppingListItem {
  id?: string;
  name: string;
  note: string;
  checked: boolean;
  expanded?: boolean; // Expansion state for Items tab (Tab1Page)
  expandedShoppingList?: boolean; // Expansion state for Shopping List tab (Tab2Page)
  children?: ShoppingListItem[];
}
