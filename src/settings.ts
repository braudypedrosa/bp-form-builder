import { FormField, FormItem, FormRow, getAllFields, getFieldDef, isRow } from './fields';

type UpdateCallback = (field: FormField) => void;
type UpdateRowCallback = (row: FormRow) => void;

export function renderSettings(
  field: FormField,
  container: HTMLElement,
  allItems: FormItem[],
  onUpdate: UpdateCallback,
): void {
  const def = getFieldDef(field.type);
  const allFields = getAllFields(allItems).filter(f => f.id !== field.id);

  // Static types: heading, paragraph, section, divider
  if (field.type === 'divider') {
    container.innerHTML = '<p class="settings-placeholder">Divider has no settings</p>';
    return;
  }

  if (field.type === 'heading' || field.type === 'paragraph' || field.type === 'section') {
    container.innerHTML = `
      <div class="settings-group">
        <label>${field.type === 'paragraph' ? 'Text' : 'Title'}</label>
        <textarea id="set-content">${escapeHtml(field.content || '')}</textarea>
      </div>
      <div class="settings-group">
        <label>CSS Class</label>
        <input type="text" id="set-css" value="${escapeAttr(field.cssClass)}" placeholder="e.g. my-heading" />
      </div>
    `;
    container.querySelector('#set-content')!.addEventListener('input', (e) => {
      field.content = (e.target as HTMLTextAreaElement).value;
      onUpdate(field);
    });
    container.querySelector('#set-css')!.addEventListener('input', (e) => {
      field.cssClass = (e.target as HTMLInputElement).value;
      onUpdate(field);
    });
    return;
  }

  let html = `
    <div class="settings-tabs">
      <button class="tab-btn active" data-tab="general">General</button>
      <button class="tab-btn" data-tab="validation">Validation</button>
      <button class="tab-btn" data-tab="logic">Logic</button>
    </div>

    <div class="tab-content" data-tab-content="general">
      <div class="settings-group">
        <label>Label</label>
        <input type="text" id="set-label" value="${escapeAttr(field.label)}" />
      </div>
      <div class="settings-group">
        <label>Placeholder</label>
        <input type="text" id="set-placeholder" value="${escapeAttr(field.placeholder)}" />
      </div>
      <div class="settings-group">
        <label>Help Text</label>
        <input type="text" id="set-help" value="${escapeAttr(field.helpText)}" placeholder="Shown below the field" />
      </div>
      <div class="settings-group">
        <label class="checkbox-row">
          <input type="checkbox" id="set-required" ${field.required ? 'checked' : ''} />
          Required
        </label>
      </div>
      ${field.type === 'hidden' ? `
        <div class="settings-group">
          <label>Default Value</label>
          <input type="text" id="set-default" value="${escapeAttr(field.defaultValue || '')}" />
        </div>
      ` : ''}
      <div class="settings-group">
        <label>CSS Class</label>
        <input type="text" id="set-css" value="${escapeAttr(field.cssClass)}" placeholder="e.g. col-half" />
      </div>
  `;

  if (def?.hasOptions && field.options) {
    html += `
      <div class="settings-group">
        <label>Options</label>
        <div class="options-editor" id="options-editor">
          ${field.options.map((o, i) => `
            <div class="option-row" data-index="${i}">
              <input type="text" value="${escapeAttr(o.label)}" data-field="label" />
              <button class="btn-remove-option" data-index="${i}">&times;</button>
            </div>
          `).join('')}
        </div>
        <button class="btn-add-option" id="btn-add-option">+ Add option</button>
      </div>
    `;
  }

  html += '</div>'; // close general tab

  // Validation tab
  const v = field.validation || {};
  const showMinMax = ['text', 'email', 'phone', 'url', 'password', 'textarea'].includes(field.type);
  const showNumRange = field.type === 'number';

  html += `
    <div class="tab-content hidden" data-tab-content="validation">
      ${showMinMax ? `
        <div class="settings-group">
          <label>Min Length</label>
          <input type="number" id="set-minlen" value="${v.minLength ?? ''}" min="0" />
        </div>
        <div class="settings-group">
          <label>Max Length</label>
          <input type="number" id="set-maxlen" value="${v.maxLength ?? ''}" min="0" />
        </div>
      ` : ''}
      ${showNumRange ? `
        <div class="settings-group">
          <label>Min Value</label>
          <input type="number" id="set-min" value="${v.min ?? ''}" />
        </div>
        <div class="settings-group">
          <label>Max Value</label>
          <input type="number" id="set-max" value="${v.max ?? ''}" />
        </div>
      ` : ''}
      <div class="settings-group">
        <label>Regex Pattern</label>
        <input type="text" id="set-pattern" value="${escapeAttr(v.pattern || '')}" placeholder="e.g. ^[A-Z]+" />
      </div>
      <div class="settings-group">
        <label>Pattern Error Message</label>
        <input type="text" id="set-pattern-msg" value="${escapeAttr(v.patternMessage || '')}" placeholder="Must start with uppercase" />
      </div>
    </div>
  `;

  // Conditional logic tab
  const cond = field.conditional;
  html += `
    <div class="tab-content hidden" data-tab-content="logic">
      <div class="settings-group">
        <label class="checkbox-row">
          <input type="checkbox" id="set-cond-enabled" ${cond ? 'checked' : ''} />
          Show this field conditionally
        </label>
      </div>
      <div id="cond-rules" class="${cond ? '' : 'hidden'}">
        <div class="settings-group">
          <label>When field</label>
          <select id="set-cond-field">
            <option value="">-- Select field --</option>
            ${allFields.filter(f => !getFieldDef(f.type)?.isStatic).map(f =>
              `<option value="${f.id}" ${cond?.fieldId === f.id ? 'selected' : ''}>${escapeHtml(f.label)} (${f.type})</option>`
            ).join('')}
          </select>
        </div>
        <div class="settings-group">
          <label>Operator</label>
          <select id="set-cond-op">
            <option value="equals" ${cond?.operator === 'equals' ? 'selected' : ''}>Equals</option>
            <option value="not_equals" ${cond?.operator === 'not_equals' ? 'selected' : ''}>Not equals</option>
            <option value="contains" ${cond?.operator === 'contains' ? 'selected' : ''}>Contains</option>
            <option value="is_empty" ${cond?.operator === 'is_empty' ? 'selected' : ''}>Is empty</option>
            <option value="is_not_empty" ${cond?.operator === 'is_not_empty' ? 'selected' : ''}>Is not empty</option>
          </select>
        </div>
        <div class="settings-group" id="cond-value-group">
          <label>Value</label>
          <input type="text" id="set-cond-value" value="${escapeAttr(cond?.value || '')}" />
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = (btn as HTMLElement).dataset.tab!;
      container.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.toggle('hidden', (tc as HTMLElement).dataset.tabContent !== tab);
      });
    });
  });

  // General bindings
  bindInput(container, '#set-label', (val) => { field.label = val; onUpdate(field); });
  bindInput(container, '#set-placeholder', (val) => { field.placeholder = val; onUpdate(field); });
  bindInput(container, '#set-help', (val) => { field.helpText = val; onUpdate(field); });
  bindInput(container, '#set-css', (val) => { field.cssClass = val; onUpdate(field); });
  bindInput(container, '#set-default', (val) => { field.defaultValue = val; onUpdate(field); });

  const requiredInput = container.querySelector('#set-required') as HTMLInputElement | null;
  requiredInput?.addEventListener('change', () => {
    field.required = requiredInput.checked;
    onUpdate(field);
  });

  // Options handling
  if (def?.hasOptions && field.options) {
    const editor = container.querySelector('#options-editor')!;
    editor.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const row = target.closest('.option-row') as HTMLElement;
      if (!row || !field.options) return;
      const idx = parseInt(row.dataset.index!);
      field.options[idx].label = target.value;
      field.options[idx].value = target.value.toLowerCase().replace(/\s+/g, '_');
      onUpdate(field);
    });
    editor.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.btn-remove-option') as HTMLElement;
      if (!btn || !field.options) return;
      const idx = parseInt(btn.dataset.index!);
      field.options.splice(idx, 1);
      renderSettings(field, container, allItems, onUpdate);
      onUpdate(field);
    });
    container.querySelector('#btn-add-option')?.addEventListener('click', () => {
      if (!field.options) return;
      const n = field.options.length + 1;
      field.options.push({ label: `Option ${n}`, value: `option${n}` });
      renderSettings(field, container, allItems, onUpdate);
      onUpdate(field);
    });
  }

  // Validation bindings
  bindNumInput(container, '#set-minlen', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.minLength = val;
    onUpdate(field);
  });
  bindNumInput(container, '#set-maxlen', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.maxLength = val;
    onUpdate(field);
  });
  bindNumInput(container, '#set-min', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.min = val;
    onUpdate(field);
  });
  bindNumInput(container, '#set-max', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.max = val;
    onUpdate(field);
  });
  bindInput(container, '#set-pattern', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.pattern = val || undefined;
    onUpdate(field);
  });
  bindInput(container, '#set-pattern-msg', (val) => {
    if (!field.validation) field.validation = {};
    field.validation.patternMessage = val || undefined;
    onUpdate(field);
  });

  // Conditional logic bindings
  const condEnabled = container.querySelector('#set-cond-enabled') as HTMLInputElement;
  const condRules = container.querySelector('#cond-rules')!;
  condEnabled?.addEventListener('change', () => {
    if (condEnabled.checked) {
      field.conditional = { fieldId: '', operator: 'equals', value: '' };
      condRules.classList.remove('hidden');
    } else {
      field.conditional = undefined;
      condRules.classList.add('hidden');
    }
    onUpdate(field);
  });

  bindSelect(container, '#set-cond-field', (val) => {
    if (field.conditional) field.conditional.fieldId = val;
    onUpdate(field);
  });
  bindSelect(container, '#set-cond-op', (val) => {
    if (field.conditional) field.conditional.operator = val as any;
    const valueGroup = container.querySelector('#cond-value-group') as HTMLElement;
    if (valueGroup) {
      valueGroup.classList.toggle('hidden', val === 'is_empty' || val === 'is_not_empty');
    }
    onUpdate(field);
  });
  bindInput(container, '#set-cond-value', (val) => {
    if (field.conditional) field.conditional.value = val;
    onUpdate(field);
  });

  // Initial show/hide of value field
  if (cond && (cond.operator === 'is_empty' || cond.operator === 'is_not_empty')) {
    container.querySelector('#cond-value-group')?.classList.add('hidden');
  }
}

export function renderRowSettings(
  row: FormRow,
  container: HTMLElement,
  onUpdate: UpdateRowCallback,
): void {
  container.innerHTML = `
    <div class="settings-group">
      <label>Columns</label>
      <select id="set-row-cols">
        <option value="2" ${row.columns === 2 ? 'selected' : ''}>2 Columns</option>
        <option value="3" ${row.columns === 3 ? 'selected' : ''}>3 Columns</option>
        <option value="4" ${row.columns === 4 ? 'selected' : ''}>4 Columns</option>
      </select>
    </div>
    <p style="font-size:12px;color:#9ca3af;margin-top:8px">Drag fields into column drop zones. Changing column count will preserve existing fields where possible.</p>
  `;

  const colSelect = container.querySelector('#set-row-cols') as HTMLSelectElement;
  colSelect.addEventListener('change', () => {
    const newCols = parseInt(colSelect.value);
    // Adjust children array
    while (row.children.length < newCols) {
      row.children.push([]);
    }
    // If reducing, move overflow fields to last column
    if (newCols < row.children.length) {
      const overflow: FormField[] = [];
      for (let i = newCols; i < row.children.length; i++) {
        overflow.push(...row.children[i]);
      }
      row.children.length = newCols;
      row.children[newCols - 1].push(...overflow);
    }
    row.columns = newCols;
    onUpdate(row);
  });
}

function bindInput(container: HTMLElement, selector: string, cb: (val: string) => void) {
  const el = container.querySelector(selector) as HTMLInputElement | null;
  el?.addEventListener('input', () => cb(el.value));
}

function bindNumInput(container: HTMLElement, selector: string, cb: (val: number | undefined) => void) {
  const el = container.querySelector(selector) as HTMLInputElement | null;
  el?.addEventListener('input', () => {
    const val = el.value.trim();
    cb(val === '' ? undefined : parseInt(val));
  });
}

function bindSelect(container: HTMLElement, selector: string, cb: (val: string) => void) {
  const el = container.querySelector(selector) as HTMLSelectElement | null;
  el?.addEventListener('change', () => cb(el.value));
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
