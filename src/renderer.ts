import { FormField, FormItem, FormRow, getFieldDef, isRow } from './fields';
import { getIconSvg } from './icons';

const gripIcon = () => getIconSvg('grip-vertical', 14);
const copyIcon = () => getIconSvg('copy', 14);
const trashIcon = () => getIconSvg('trash-2', 14);

export function renderCanvasField(field: FormField): HTMLElement {
  const el = document.createElement('div');
  el.className = 'canvas-field';
  el.dataset.id = field.id;
  el.dataset.type = field.type;

  const def = getFieldDef(field.type);
  const actions = `
    <div class="field-actions">
      <button class="btn-icon btn-duplicate" title="Duplicate">${copyIcon()}</button>
      <button class="btn-icon btn-delete" title="Delete">${trashIcon()}</button>
    </div>
  `;

  if (field.type === 'divider') {
    el.innerHTML = `
      <span class="drag-handle">${gripIcon()}</span>
      <div class="field-body"><hr class="canvas-divider" /></div>
      ${actions}
    `;
    return el;
  }

  if (field.type === 'heading') {
    el.innerHTML = `
      <span class="drag-handle">${gripIcon()}</span>
      <div class="field-body"><h3 class="canvas-heading">${escapeHtml(field.content || 'Heading')}</h3></div>
      ${actions}
    `;
    return el;
  }

  if (field.type === 'paragraph') {
    el.innerHTML = `
      <span class="drag-handle">${gripIcon()}</span>
      <div class="field-body"><p class="canvas-paragraph">${escapeHtml(field.content || '')}</p></div>
      ${actions}
    `;
    return el;
  }

  if (field.type === 'section') {
    el.classList.add('canvas-section');
    el.innerHTML = `
      <span class="drag-handle">${gripIcon()}</span>
      <div class="field-body">
        <div class="section-title">${escapeHtml(field.content || 'Section')}</div>
      </div>
      ${actions}
    `;
    return el;
  }

  const condBadge = field.conditional
    ? `<span class="cond-badge" title="Has conditional logic">${getIconSvg('zap', 10)}</span>` : '';
  const validBadge = field.validation && Object.keys(field.validation).some(k => (field.validation as any)[k] !== undefined && (field.validation as any)[k] !== '')
    ? `<span class="valid-badge" title="Has validation">${getIconSvg('shield-check', 10)}</span>` : '';

  const fieldIcon = def ? getIconSvg(def.icon, 14) : '';

  el.innerHTML = `
    <span class="drag-handle">${gripIcon()}</span>
    <div class="field-body">
      <div class="field-label">${escapeHtml(field.label)} ${condBadge} ${validBadge}</div>
      <span class="field-type-badge">${fieldIcon} ${escapeHtml(def?.label || field.type)}${field.required ? ' *' : ''}</span>
      ${field.helpText ? `<div class="field-help">${escapeHtml(field.helpText)}</div>` : ''}
      <div class="field-preview">${renderFieldPreview(field)}</div>
    </div>
    ${actions}
  `;

  return el;
}

export function renderCanvasRow(row: FormRow): HTMLElement {
  const el = document.createElement('div');
  el.className = 'canvas-row';
  el.dataset.id = row.id;
  el.dataset.type = 'row';

  const colIcon = getIconSvg(`columns-${row.columns}` as any, 14);

  const header = document.createElement('div');
  header.className = 'row-header';
  header.innerHTML = `
    <span class="drag-handle row-drag-handle">${gripIcon()}</span>
    <span class="row-label">${colIcon} ${row.columns}-Column Row</span>
    <div class="field-actions">
      <button class="btn-icon btn-delete-row" title="Delete row">${trashIcon()}</button>
    </div>
  `;
  el.appendChild(header);

  const columnsContainer = document.createElement('div');
  columnsContainer.className = 'row-columns';
  columnsContainer.style.gridTemplateColumns = `repeat(${row.columns}, 1fr)`;

  for (let i = 0; i < row.columns; i++) {
    const col = document.createElement('div');
    col.className = 'row-column';
    col.dataset.rowId = row.id;
    col.dataset.colIndex = String(i);

    for (const field of row.children[i]) {
      const fieldEl = renderCanvasField(field);
      col.appendChild(fieldEl);
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'column-placeholder';
    placeholder.textContent = 'Drop here';
    col.appendChild(placeholder);

    columnsContainer.appendChild(col);
  }

  el.appendChild(columnsContainer);
  return el;
}

function renderFieldPreview(field: FormField): string {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
    case 'password':
    case 'date':
      return `<input type="${field.type === 'phone' ? 'tel' : field.type}" placeholder="${escapeAttr(field.placeholder || field.label)}" />`;

    case 'textarea':
      return `<textarea placeholder="${escapeAttr(field.placeholder || field.label)}"></textarea>`;

    case 'select':
      return `<select><option>${field.options?.map(o => escapeHtml(o.label)).join('</option><option>') || ''}</option></select>`;

    case 'file':
      return `<input type="file" />`;

    case 'creditcard':
      return `
        <div class="cc-preview">
          <input class="cc-number" placeholder="Card number" />
          <input placeholder="MM/YY" />
          <input placeholder="CVV" />
        </div>`;

    case 'address':
      return `<input placeholder="Street address" style="margin-bottom:4px" /><input placeholder="City, State, ZIP" />`;

    case 'radio':
      return (field.options || []).map(o =>
        `<label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="radio" name="${field.id}" style="pointer-events:none" />${escapeHtml(o.label)}</label>`
      ).join('');

    case 'checkbox':
      return (field.options || []).map(o =>
        `<label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" style="pointer-events:none" />${escapeHtml(o.label)}</label>`
      ).join('');

    case 'hidden':
      return `<span style="font-size:11px;color:#9ca3af;font-style:italic">Hidden field (value: ${escapeHtml(field.defaultValue || 'empty')})</span>`;

    default:
      return `<input placeholder="${escapeAttr(field.placeholder || '')}" />`;
  }
}

// Preview rendering (for the modal)
export function renderPreviewItem(item: FormItem): string {
  if (isRow(item)) {
    return renderPreviewRow(item);
  }
  return renderPreviewField(item);
}

function renderPreviewRow(row: FormRow): string {
  let html = `<div class="preview-row" style="display:grid;grid-template-columns:repeat(${row.columns},1fr);gap:16px;">`;
  for (const col of row.children) {
    html += '<div class="preview-col">';
    for (const field of col) {
      html += renderPreviewField(field);
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

export function renderPreviewField(field: FormField): string {
  const req = field.required ? '<span class="required"> *</span>' : '';
  const help = field.helpText ? `<div class="preview-help">${escapeHtml(field.helpText)}</div>` : '';

  switch (field.type) {
    case 'heading':
      return `<h3 class="preview-heading">${escapeHtml(field.content || '')}</h3>`;

    case 'paragraph':
      return `<p class="preview-paragraph">${escapeHtml(field.content || '')}</p>`;

    case 'section':
      return `<div class="preview-section"><h3>${escapeHtml(field.content || '')}</h3><hr /></div>`;

    case 'divider':
      return `<hr class="preview-divider" />`;

    case 'hidden':
      return '';

    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'url':
    case 'password':
    case 'date':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><input type="${field.type === 'phone' ? 'tel' : field.type}" placeholder="${escapeAttr(field.placeholder)}" />${help}</div>`;

    case 'textarea':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><textarea placeholder="${escapeAttr(field.placeholder)}"></textarea>${help}</div>`;

    case 'select':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><select>${field.options?.map(o => `<option value="${escapeAttr(o.value)}">${escapeHtml(o.label)}</option>`).join('') || ''}</select>${help}</div>`;

    case 'radio':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><div class="radio-group">${(field.options || []).map(o => `<label><input type="radio" name="${field.id}" value="${escapeAttr(o.value)}" />${escapeHtml(o.label)}</label>`).join('')}</div>${help}</div>`;

    case 'checkbox':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><div class="checkbox-group">${(field.options || []).map(o => `<label><input type="checkbox" value="${escapeAttr(o.value)}" />${escapeHtml(o.label)}</label>`).join('')}</div>${help}</div>`;

    case 'file':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><input type="file" />${help}</div>`;

    case 'creditcard':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><div class="cc-block"><div class="cc-full"><input placeholder="Card number" /></div><input placeholder="MM/YY" /><input placeholder="CVV" /></div>${help}</div>`;

    case 'address':
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><input placeholder="Street address" style="margin-bottom:6px" /><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><input placeholder="City" /><input placeholder="State" /><input placeholder="ZIP" /></div>${help}</div>`;

    default:
      return `<div class="preview-field"><label>${escapeHtml(field.label)}${req}</label><input placeholder="${escapeAttr(field.placeholder)}" />${help}</div>`;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
