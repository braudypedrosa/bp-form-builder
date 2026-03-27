import { createIcons, icons } from 'lucide';
import Sortable from 'sortablejs';
import { FIELD_TYPES, FormField, FormItem, FormRow, createFormField, createFormRow, getAllFields, isRow } from './fields';
import { getIconSvg } from './icons';
import { renderCanvasField, renderCanvasRow, renderPreviewItem } from './renderer';
import { renderSettings, renderRowSettings } from './settings';

// State
const formItems: FormItem[] = [];
let selectedId: string | null = null;

// DOM refs
const paletteBasic = document.getElementById('palette-basic')!;
const paletteAdvanced = document.getElementById('palette-advanced')!;
const paletteLayout = document.getElementById('palette-layout')!;
const canvas = document.getElementById('canvas')!;
const settingsPanel = document.getElementById('settings-panel')!;
const previewModal = document.getElementById('preview-modal')!;
const previewForm = document.getElementById('preview-form')!;

// ─── Palette ───

function initPalette() {
  for (const field of FIELD_TYPES) {
    const el = document.createElement('div');
    el.className = 'palette-item';
    el.dataset.type = field.type;
    el.innerHTML = `<span class="icon">${getIconSvg(field.icon, 16)}</span>${field.label}`;

    if (field.category === 'basic') {
      paletteBasic.appendChild(el);
    } else if (field.category === 'advanced') {
      paletteAdvanced.appendChild(el);
    } else {
      paletteLayout.appendChild(el);
    }
  }

  for (const list of [paletteBasic, paletteAdvanced, paletteLayout]) {
    Sortable.create(list, {
      group: { name: 'palette', pull: 'clone', put: false },
      sort: false,
      animation: 150,
    });
  }
}

// ─── Canvas ───

function initCanvas() {
  Sortable.create(canvas, {
    group: { name: 'canvas', pull: true, put: ['palette', 'columns'] },
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    filter: '.canvas-placeholder, .row-column',
    preventOnFilter: false,
    onAdd(evt) {
      const item = evt.item as HTMLElement;
      const type = item.dataset.type;

      // Item dragged out of a column back to canvas top-level
      if (item.classList.contains('canvas-field') && item.dataset.id) {
        const fieldId = item.dataset.id;
        // Remove from any row it was in (data model)
        const field = findAndRemoveField(fieldId);
        if (field) {
          const idx = evt.newIndex ?? formItems.length;
          formItems.splice(idx, 0, field);
          bindFieldEvents(item, field);
        }
        syncItemOrder();
        return;
      }

      if (!type) return;

      const idx = evt.newIndex ?? formItems.length;

      // Layout types create rows
      if (type.startsWith('row-')) {
        const cols = parseInt(type.split('-')[1]);
        const row = createFormRow(cols);
        formItems.splice(idx, 0, row);
        const rendered = renderCanvasRow(row);
        canvas.replaceChild(rendered, item);
        bindRowEvents(rendered, row);
        initColumnSortables(rendered, row);
        selectRow(row.id);
      } else {
        const field = createFormField(type);
        formItems.splice(idx, 0, field);
        const rendered = renderCanvasField(field);
        canvas.replaceChild(rendered, item);
        bindFieldEvents(rendered, field);
        selectField(field.id);
      }
    },
    onEnd() {
      syncItemOrder();
    },
  });
}

function initColumnSortables(rowEl: HTMLElement, row: FormRow) {
  rowEl.querySelectorAll('.row-column').forEach((col) => {
    const colEl = col as HTMLElement;
    const colIndex = parseInt(colEl.dataset.colIndex!);

    Sortable.create(colEl, {
      group: { name: 'columns', pull: true, put: ['palette', 'columns', 'canvas'] },
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      filter: '.column-placeholder',
      onAdd(evt) {
        const item = evt.item as HTMLElement;
        const type = item.dataset.type;

        // Don't allow rows inside columns
        if (type?.startsWith('row-')) {
          item.remove();
          return;
        }

        // If it's a palette item, create a new field
        if (item.classList.contains('palette-item') && type) {
          const field = createFormField(type);
          const rendered = renderCanvasField(field);
          colEl.replaceChild(rendered, item);
          row.children[colIndex].splice(evt.newIndex ?? row.children[colIndex].length, 0, field);
          bindFieldEvents(rendered, field, row.id);
          selectField(field.id);
          return;
        }

        // If it's an existing canvas-field being moved in (from another column or from canvas)
        const fieldId = item.dataset.id;
        if (fieldId) {
          const field = findAndRemoveField(fieldId);
          if (field) {
            row.children[colIndex].splice(evt.newIndex ?? row.children[colIndex].length, 0, field);
            bindFieldEvents(item, field, row.id);
          }
        }
      },
      onEnd() {
        // Sync all columns in this row after any reorder
        syncColumnOrder(row, rowEl);
      },
      onSort() {
        // Also sync on reorder within same column
        syncColumnOrder(row, rowEl);
      },
    });
  });
}

function syncItemOrder() {
  const els = Array.from(canvas.children).filter(
    el => el.classList.contains('canvas-field') || el.classList.contains('canvas-row')
  );

  const map = new Map(formItems.map(item => [item.id, item]));
  formItems.length = 0;

  for (const el of els) {
    const id = (el as HTMLElement).dataset.id!;
    const item = map.get(id);
    if (item) formItems.push(item);
  }
}

function syncColumnOrder(row: FormRow, rowEl: HTMLElement) {
  rowEl.querySelectorAll('.row-column').forEach((col) => {
    const colEl = col as HTMLElement;
    const colIndex = parseInt(colEl.dataset.colIndex!);
    const ids = Array.from(colEl.querySelectorAll('.canvas-field'))
      .map(el => (el as HTMLElement).dataset.id!);

    const allFields = getAllFields(formItems);
    const fieldMap = new Map(allFields.map(f => [f.id, f]));

    row.children[colIndex] = ids.map(id => fieldMap.get(id)!).filter(Boolean);
  });
}

// ─── Find & Remove ───

function findField(id: string): FormField | undefined {
  return getAllFields(formItems).find(f => f.id === id);
}

function findAndRemoveField(id: string): FormField | undefined {
  // Check top-level
  for (let i = 0; i < formItems.length; i++) {
    const item = formItems[i];
    if (!isRow(item) && item.id === id) {
      formItems.splice(i, 1);
      return item;
    }
    if (isRow(item)) {
      for (const col of item.children) {
        const idx = col.findIndex(f => f.id === id);
        if (idx !== -1) {
          return col.splice(idx, 1)[0];
        }
      }
    }
  }
  return undefined;
}

function findRow(id: string): FormRow | undefined {
  return formItems.find(item => isRow(item) && item.id === id) as FormRow | undefined;
}

// ─── Events ───

function bindFieldEvents(el: HTMLElement, field: FormField, _rowId?: string) {
  el.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.btn-delete')) {
      deleteField(field.id);
      return;
    }
    if (target.closest('.btn-duplicate')) {
      duplicateField(field);
      return;
    }
    selectField(field.id);
  });
}

function bindRowEvents(el: HTMLElement, row: FormRow) {
  el.querySelector('.row-header')!.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.btn-delete-row')) {
      deleteRow(row.id);
      return;
    }
    selectRow(row.id);
  });
}

// ─── Selection ───

function clearSelection() {
  canvas.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
}

function selectField(id: string) {
  selectedId = id;
  clearSelection();

  const el = canvas.querySelector(`[data-id="${id}"]`);
  el?.classList.add('selected');

  const field = findField(id);
  if (!field) return;

  renderSettings(field, settingsPanel, formItems, () => {
    // Re-render this field on the canvas
    const old = canvas.querySelector(`[data-id="${field.id}"]`);
    if (old) {
      const fresh = renderCanvasField(field);
      fresh.classList.add('selected');
      old.replaceWith(fresh);
      // Find which row it might be in
      const parentRow = formItems.find(item =>
        isRow(item) && item.children.some(col => col.some(f => f.id === field.id))
      );
      bindFieldEvents(fresh, field, parentRow?.id);
    }
  });
}

function selectRow(id: string) {
  selectedId = id;
  clearSelection();

  const el = canvas.querySelector(`[data-id="${id}"]`);
  el?.classList.add('selected');

  const row = findRow(id);
  if (!row) return;

  renderRowSettings(row, settingsPanel, () => {
    // Re-render the entire row
    const old = canvas.querySelector(`[data-id="${row.id}"]`);
    if (old) {
      const fresh = renderCanvasRow(row);
      fresh.classList.add('selected');
      old.replaceWith(fresh);
      bindRowEvents(fresh, row);
      initColumnSortables(fresh, row);
      // Re-bind events for fields inside columns
      fresh.querySelectorAll('.canvas-field').forEach(fieldEl => {
        const fid = (fieldEl as HTMLElement).dataset.id!;
        const field = findField(fid);
        if (field) bindFieldEvents(fieldEl as HTMLElement, field, row.id);
      });
    }
  });
}

// ─── Delete ───

function deleteField(id: string) {
  findAndRemoveField(id);
  const el = canvas.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
  if (selectedId === id) {
    selectedId = null;
    settingsPanel.innerHTML = '<p class="settings-placeholder">Select a field to edit its settings</p>';
  }
}

function deleteRow(id: string) {
  const idx = formItems.findIndex(item => item.id === id);
  if (idx !== -1) formItems.splice(idx, 1);
  const el = canvas.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
  if (selectedId === id) {
    selectedId = null;
    settingsPanel.innerHTML = '<p class="settings-placeholder">Select a field to edit its settings</p>';
  }
}

// ─── Duplicate ───

function duplicateField(field: FormField) {
  const clone: FormField = JSON.parse(JSON.stringify(field));
  clone.id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  clone.label = field.label + ' (copy)';

  // Find where the original is
  const topIdx = formItems.findIndex(item => !isRow(item) && item.id === field.id);
  if (topIdx !== -1) {
    formItems.splice(topIdx + 1, 0, clone);
    const rendered = renderCanvasField(clone);
    const origEl = canvas.querySelector(`[data-id="${field.id}"]`);
    origEl?.after(rendered);
    bindFieldEvents(rendered, clone);
    selectField(clone.id);
    return;
  }

  // Check inside rows
  for (const item of formItems) {
    if (isRow(item)) {
      for (const col of item.children) {
        const idx = col.findIndex(f => f.id === field.id);
        if (idx !== -1) {
          col.splice(idx + 1, 0, clone);
          const origEl = canvas.querySelector(`[data-id="${field.id}"]`);
          const rendered = renderCanvasField(clone);
          origEl?.after(rendered);
          bindFieldEvents(rendered, clone, item.id);
          selectField(clone.id);
          return;
        }
      }
    }
  }
}

// ─── Preview ───

function showPreview() {
  previewForm.innerHTML = formItems.map(item => renderPreviewItem(item)).join('');
  previewModal.classList.remove('hidden');
}

function hidePreview() {
  previewModal.classList.add('hidden');
}

// ─── Export ───

function exportJSON() {
  const json = JSON.stringify(formItems, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'form-schema.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Undo / Redo ───

const undoStack: string[] = [];
const redoStack: string[] = [];
let ignoreSnapshot = false;

function snapshot() {
  if (ignoreSnapshot) return;
  undoStack.push(JSON.stringify(formItems));
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(formItems));
  const prev = JSON.parse(undoStack.pop()!);
  restoreState(prev);
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(formItems));
  const next = JSON.parse(redoStack.pop()!);
  restoreState(next);
}

function restoreState(items: FormItem[]) {
  ignoreSnapshot = true;
  formItems.length = 0;
  formItems.push(...items);
  rebuildCanvas();
  selectedId = null;
  settingsPanel.innerHTML = '<p class="settings-placeholder">Select a field to edit its settings</p>';
  ignoreSnapshot = false;
}

function rebuildCanvas() {
  // Remove all children except placeholder
  const placeholder = canvas.querySelector('.canvas-placeholder');
  canvas.innerHTML = '';
  if (placeholder) canvas.appendChild(placeholder);

  for (const item of formItems) {
    if (isRow(item)) {
      const el = renderCanvasRow(item);
      canvas.appendChild(el);
      bindRowEvents(el, item);
      initColumnSortables(el, item);
      el.querySelectorAll('.canvas-field').forEach(fieldEl => {
        const fid = (fieldEl as HTMLElement).dataset.id!;
        const field = findField(fid);
        if (field) bindFieldEvents(fieldEl as HTMLElement, field, item.id);
      });
    } else {
      const el = renderCanvasField(item);
      canvas.appendChild(el);
      bindFieldEvents(el, item);
    }
  }
}

// Wrap mutations to auto-snapshot
const origSplice = Array.prototype.splice;
const itemsProxy = new Proxy(formItems, {
  get(target, prop) {
    return Reflect.get(target, prop);
  }
});

// Take snapshots on key user actions via MutationObserver on canvas
const observer = new MutationObserver(() => {
  snapshot();
});

// ─── Keyboard shortcuts ───

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  }
  if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Only delete if not focused on an input
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;
    if (selectedId) {
      e.preventDefault();
      const row = findRow(selectedId);
      if (row) {
        deleteRow(selectedId);
      } else {
        deleteField(selectedId);
      }
    }
  }
});

// ─── Init ───

initPalette();
initCanvas();

// Replace data-lucide attributes with SVGs in the static HTML
createIcons({ icons });

// Start observing canvas for undo snapshots
observer.observe(canvas, { childList: true, subtree: true });

document.getElementById('btn-preview')!.addEventListener('click', showPreview);
document.getElementById('btn-close-preview')!.addEventListener('click', hidePreview);
document.querySelector('.modal-overlay')!.addEventListener('click', hidePreview);
document.getElementById('btn-export')!.addEventListener('click', exportJSON);
document.getElementById('btn-undo')!.addEventListener('click', undo);
document.getElementById('btn-redo')!.addEventListener('click', redo);
