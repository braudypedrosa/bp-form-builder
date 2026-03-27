export interface FieldOption {
  label: string;
  value: string;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldDefinition {
  type: string;
  label: string;
  icon: string;
  category: 'basic' | 'advanced' | 'layout';
  hasOptions?: boolean;
  defaultOptions?: FieldOption[];
  isLayout?: boolean;
  isStatic?: boolean;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  helpText: string;
  cssClass: string;
  options?: FieldOption[];
  conditional?: ConditionalRule;
  validation?: ValidationRules;
  // For heading/paragraph
  content?: string;
  // For hidden field
  defaultValue?: string;
}

export interface FormRow {
  id: string;
  type: 'row';
  columns: number;
  children: FormField[][];
}

export type FormItem = FormField | FormRow;

export function isRow(item: FormItem): item is FormRow {
  return item.type === 'row';
}

export const FIELD_TYPES: FieldDefinition[] = [
  // Basic
  { type: 'text', label: 'Text', icon: 'type', category: 'basic' },
  { type: 'email', label: 'Email', icon: 'mail', category: 'basic' },
  { type: 'phone', label: 'Phone', icon: 'phone', category: 'basic' },
  { type: 'number', label: 'Number', icon: 'hash', category: 'basic' },
  { type: 'textarea', label: 'Text Area', icon: 'align-left', category: 'basic' },
  { type: 'select', label: 'Dropdown', icon: 'chevron-down-circle', category: 'basic', hasOptions: true, defaultOptions: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
  { type: 'radio', label: 'Radio', icon: 'circle-dot', category: 'basic', hasOptions: true, defaultOptions: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
  { type: 'checkbox', label: 'Checkbox', icon: 'square-check', category: 'basic', hasOptions: true, defaultOptions: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
  { type: 'date', label: 'Date', icon: 'calendar', category: 'basic' },
  // Advanced
  { type: 'file', label: 'File Upload', icon: 'paperclip', category: 'advanced' },
  { type: 'creditcard', label: 'Credit Card', icon: 'credit-card', category: 'advanced' },
  { type: 'address', label: 'Address', icon: 'map-pin', category: 'advanced' },
  { type: 'url', label: 'URL', icon: 'link', category: 'advanced' },
  { type: 'password', label: 'Password', icon: 'lock', category: 'advanced' },
  { type: 'hidden', label: 'Hidden', icon: 'eye-off', category: 'advanced' },
  // Layout
  { type: 'row-2', label: '2 Columns', icon: 'columns-2', category: 'layout', isLayout: true },
  { type: 'row-3', label: '3 Columns', icon: 'columns-3', category: 'layout', isLayout: true },
  { type: 'row-4', label: '4 Columns', icon: 'columns-4', category: 'layout', isLayout: true },
  { type: 'section', label: 'Section', icon: 'layers', category: 'layout', isStatic: true },
  { type: 'heading', label: 'Heading', icon: 'heading', category: 'layout', isStatic: true },
  { type: 'paragraph', label: 'Paragraph', icon: 'text', category: 'layout', isStatic: true },
  { type: 'divider', label: 'Divider', icon: 'minus', category: 'layout', isStatic: true },
];

let counter = 0;

export function createFormField(type: string): FormField {
  const def = FIELD_TYPES.find(f => f.type === type);
  if (!def) throw new Error(`Unknown field type: ${type}`);

  counter++;
  const id = `field_${Date.now()}_${counter}`;

  const base: FormField = {
    id,
    type: def.type,
    label: def.label,
    placeholder: '',
    required: false,
    helpText: '',
    cssClass: '',
  };

  if (def.hasOptions) {
    base.options = [...(def.defaultOptions || [])].map(o => ({ ...o }));
  }
  if (type === 'heading') {
    base.content = 'Section Heading';
  }
  if (type === 'paragraph') {
    base.content = 'Add your descriptive text here.';
  }
  if (type === 'section') {
    base.content = 'Section Title';
  }
  if (type === 'hidden') {
    base.defaultValue = '';
  }

  return base;
}

export function createFormRow(columns: number): FormRow {
  counter++;
  const children: FormField[][] = [];
  for (let i = 0; i < columns; i++) {
    children.push([]);
  }
  return {
    id: `row_${Date.now()}_${counter}`,
    type: 'row',
    columns,
    children,
  };
}

export function getFieldDef(type: string): FieldDefinition | undefined {
  return FIELD_TYPES.find(f => f.type === type);
}

/** Collect all FormFields in the form (including inside rows) for conditional logic dropdowns */
export function getAllFields(items: FormItem[]): FormField[] {
  const result: FormField[] = [];
  for (const item of items) {
    if (isRow(item)) {
      for (const col of item.children) {
        result.push(...col);
      }
    } else {
      result.push(item);
    }
  }
  return result;
}
