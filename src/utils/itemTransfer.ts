import type { OneTimeItem, ShoppingListItem } from '@/composables/items';

export const ITEM_EXPORT_HEADER = 'Grocerease export 1';

export type ImportMode = 'add' | 'replace';

export interface ItemTransferParseResult {
  ok: boolean;
  error?: string;
  catalog: ShoppingListItem[];
  oneTimeItems: OneTimeItem[];
  warnings: string[];
  skippedDuplicates: number;
  missingParents: number;
}

export interface AppliedItemTransfer {
  catalog: ShoppingListItem[];
  oneTimeItems: OneTimeItem[];
  skippedDuplicates: number;
}

interface StackFrame {
  item: ShoppingListItem;
  depth: number;
}

interface TreeBuilder {
  catalog: ShoppingListItem[];
  stack: StackFrame[];
  skippingDeeperThan: number | null;
  skippedDuplicates: number;
  missingParents: number;
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function createId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function createCatalogItem(name: string, note: string, checked: boolean): ShoppingListItem {
  return {
    id: createId(),
    name: name.trim(),
    note: note.trim(),
    checked,
  };
}

function createOneTimeItem(name: string, note: string, checked: boolean): OneTimeItem {
  return {
    id: createId(),
    name: name.trim(),
    note: note.trim(),
    checked,
  };
}

function emptyResult(error: string): ItemTransferParseResult {
  return {
    ok: false,
    error,
    catalog: [],
    oneTimeItems: [],
    warnings: [],
    skippedDuplicates: 0,
    missingParents: 0,
  };
}

function leadingSpaces(line: string): number {
  let count = 0;
  while (count < line.length && line[count] === ' ') count += 1;
  return count;
}

function splitNameAndNote(rest: string): { name: string; note: string } | null {
  const spaced = ' || ';
  const index = rest.indexOf(spaced);
  if (index !== -1) {
    return {
      name: rest.slice(0, index).trim(),
      note: rest.slice(index + spaced.length).trim(),
    };
  }
  if (rest.endsWith(' ||')) {
    return { name: rest.slice(0, -3).trim(), note: '' };
  }
  return null;
}

function formatLine(
  name: string,
  note: string,
  checked: boolean,
  depth: number,
  oneTime: boolean,
): string | null {
  const cleanName = oneLine(name);
  if (!cleanName) return null;
  const cleanNote = oneLine(note);
  const indent = '  '.repeat(depth);
  const marker = oneTime ? '* ' : '';
  const box = checked ? '[x]' : '[ ]';
  const notePart = cleanNote ? ` || ${cleanNote}` : ' ||';
  return `${indent}${marker}${box} ${cleanName}${notePart}`;
}

function appendCatalogLines(list: ShoppingListItem[], depth: number, lines: string[]): void {
  for (const item of list) {
    const line = formatLine(item.name, item.note, item.checked, depth, false);
    if (line) lines.push(line);
    if (item.children && item.children.length > 0) {
      appendCatalogLines(item.children, depth + 1, lines);
    }
  }
}

/** Full catalog first, then one-time items. Returns an empty string when there is nothing to copy. */
export function serializeItems(catalog: ShoppingListItem[], oneTimeItems: OneTimeItem[]): string {
  const lines: string[] = [];
  appendCatalogLines(catalog, 0, lines);
  for (const item of oneTimeItems) {
    const line = formatLine(item.name, item.note, item.checked, 0, true);
    if (line) lines.push(line);
  }
  if (lines.length === 0) return '';
  return [ITEM_EXPORT_HEADER, ...lines].join('\n');
}

function newBuilder(): TreeBuilder {
  return {
    catalog: [],
    stack: [],
    skippingDeeperThan: null,
    skippedDuplicates: 0,
    missingParents: 0,
  };
}

function siblingList(builder: TreeBuilder): ShoppingListItem[] {
  const parent = builder.stack[builder.stack.length - 1];
  if (!parent) return builder.catalog;
  if (!parent.item.children) parent.item.children = [];
  return parent.item.children;
}

/**
* Attach a catalog node at the given indent depth.
* A jump of more than one level hangs the node on the nearest ancestor already on the stack.
* A sibling with the same name is skipped, and deeper lines under it are dropped.
*/
function placeCatalogItem(builder: TreeBuilder, item: ShoppingListItem, depth: number): void {
  if (builder.skippingDeeperThan !== null) {
    if (depth > builder.skippingDeeperThan) return;
    builder.skippingDeeperThan = null;
  }

  while (builder.stack.length > 0 && builder.stack[builder.stack.length - 1].depth >= depth) {
    builder.stack.pop();
  }

  const parentDepth = builder.stack.length > 0
    ? builder.stack[builder.stack.length - 1].depth
    : -1;
  if (depth > parentDepth + 1) {
    builder.missingParents += 1;
  }

  const siblings = siblingList(builder);
  if (siblings.some((sibling) => namesMatch(sibling.name, item.name))) {
    builder.skippedDuplicates += 1;
    builder.skippingDeeperThan = depth;
    return;
  }

  siblings.push(item);
  builder.stack.push({ item, depth });
}

function buildWarnings(
  skippedDuplicates: number,
  missingParents: number,
  invalidLines: number,
  nestedOneTime: boolean,
): string[] {
  const warnings: string[] = [];
  if (missingParents > 0) {
    warnings.push('A parent line was missing. Those items were placed under the nearest parent.');
  }
  if (skippedDuplicates > 0) {
    const noun = skippedDuplicates === 1 ? 'name was' : 'names were';
    warnings.push(`${skippedDuplicates} duplicate ${noun} skipped.`);
  }
  if (invalidLines > 0) {
    const noun = invalidLines === 1 ? 'line' : 'lines';
    const verb = invalidLines === 1 ? 'was' : 'were';
    warnings.push(`${invalidLines} ${noun} did not match and ${verb} skipped.`);
  }
  if (nestedOneTime) {
    warnings.push('A one-time marker under a parent was imported as an item on the Items tab.');
  }
  return warnings;
}

function finish(
  builder: TreeBuilder,
  oneTimeItems: OneTimeItem[],
  warnings: string[],
  invalidLines: number,
): ItemTransferParseResult {
  if (builder.catalog.length === 0 && oneTimeItems.length === 0) {
    return {
      ok: false,
      error: invalidLines > 0 ? 'Could not read any items.' : 'Nothing to import.',
      catalog: [],
      oneTimeItems: [],
      warnings,
      skippedDuplicates: builder.skippedDuplicates,
      missingParents: builder.missingParents,
    };
  }
  return {
    ok: true,
    catalog: builder.catalog,
    oneTimeItems,
    warnings,
    skippedDuplicates: builder.skippedDuplicates,
    missingParents: builder.missingParents,
  };
}

function parseExport(lines: string[]): ItemTransferParseResult {
  const builder = newBuilder();
  const oneTimeItems: OneTimeItem[] = [];
  let headerSeen = false;
  let invalidLines = 0;
  let nestedOneTime = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!headerSeen && line.trim() === ITEM_EXPORT_HEADER) {
      headerSeen = true;
      continue;
    }
    if (!line.trim()) continue;

    const depth = Math.floor(leadingSpaces(line) / 2);
    const rest = line.slice(leadingSpaces(line)).trim();
    const match = /^(\*\s+)?\[(x| )\]\s+(.*)$/.exec(rest);
    if (!match) {
      invalidLines += 1;
      continue;
    }
    const split = splitNameAndNote(match[3]);
    if (!split || !split.name) {
      invalidLines += 1;
      continue;
    }

    const checked = match[2] === 'x';
    const oneTime = Boolean(match[1]);
    if (oneTime && depth === 0) {
      if (oneTimeItems.some((item) => namesMatch(item.name, split.name))) {
        builder.skippedDuplicates += 1;
      } else {
        oneTimeItems.push(createOneTimeItem(split.name, split.note, checked));
      }
      continue;
    }

    if (oneTime && depth > 0) nestedOneTime = true;
    placeCatalogItem(builder, createCatalogItem(split.name, split.note, checked), depth);
  }

  const warnings = buildWarnings(
    builder.skippedDuplicates,
    builder.missingParents,
    invalidLines,
    nestedOneTime,
  );
  return finish(builder, oneTimeItems, warnings, invalidLines);
}

function parseLegacy(lines: string[]): ItemTransferParseResult {
  const builder = newBuilder();
  let invalidLines = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue;

    const spaces = leadingSpaces(line);
    const depth = Math.floor(spaces / 2);
    let rest = line.slice(spaces).trim();
    if (rest.endsWith(',')) rest = rest.slice(0, -1).trim();
    if (!rest) {
      invalidLines += 1;
      continue;
    }

    // Old share glues an optional note onto the name and does not record checked state.
    placeCatalogItem(builder, createCatalogItem(rest, '', false), depth);
  }

  const warnings = buildWarnings(builder.skippedDuplicates, builder.missingParents, invalidLines, false);
  return finish(builder, [], warnings, invalidLines);
}

export function parseItemTransfer(text: string): ItemTransferParseResult {
  const lines = text.split(/\r?\n/);
  const firstContent = lines.find((line) => line.trim().length > 0);
  if (!firstContent) return emptyResult('Nothing to import.');
  if (firstContent.trim() === ITEM_EXPORT_HEADER) return parseExport(lines);
  return parseLegacy(lines);
}

function countNodes(item: ShoppingListItem): number {
  let count = 1;
  if (item.children) {
    for (const child of item.children) count += countNodes(child);
  }
  return count;
}

export function countCatalogItems(list: ShoppingListItem[]): number {
  let count = 0;
  for (const item of list) count += countNodes(item);
  return count;
}

/**
* Replace swaps both lists for the paste. Add appends items whose sibling name
* is not already present; children of a skipped name are not merged.
*/
export function applyItemTransfer(
  existingCatalog: ShoppingListItem[],
  existingOneTime: OneTimeItem[],
  parsed: ItemTransferParseResult,
  mode: ImportMode,
): AppliedItemTransfer {
  if (mode === 'replace') {
    return {
      catalog: parsed.catalog,
      oneTimeItems: parsed.oneTimeItems,
      skippedDuplicates: 0,
    };
  }

  const catalog = existingCatalog.slice();
  let skippedDuplicates = 0;
  for (const item of parsed.catalog) {
    if (catalog.some((sibling) => namesMatch(sibling.name, item.name))) {
      skippedDuplicates += countNodes(item);
      continue;
    }
    catalog.push(item);
  }

  const oneTimeItems = existingOneTime.slice();
  for (const item of parsed.oneTimeItems) {
    if (oneTimeItems.some((existing) => namesMatch(existing.name, item.name))) {
      skippedDuplicates += 1;
      continue;
    }
    oneTimeItems.push(item);
  }

  return { catalog, oneTimeItems, skippedDuplicates };
}
