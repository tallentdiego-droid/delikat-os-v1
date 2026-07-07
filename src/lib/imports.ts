export interface RecipeImportRow {
  recipe_name: string;
  category: string;
  yield: string;
  portion_size: string;
  ingredients: string;
  ingredient_quantity: string;
  ingredient_unit: string;
  preparation_steps: string;
  station_area: string;
  equipment: string;
  allergens: string;
  notes: string;
}

export interface SOPImportRow {
  sop_title: string;
  department: string;
  role: string;
  area: string;
  category: string;
  purpose: string;
  steps: string;
  equipment: string;
  frequency: string;
  notes: string;
}

export interface ImportValidationIssue {
  rowNumber: number | null;
  field: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface ImportPreviewResult<T> {
  title: string;
  sourceType: 'recipe' | 'sop' | 'manual';
  totalRows: number;
  draftRows: number;
  publishedRows: number;
  issues: ImportValidationIssue[];
  rows: T[];
}

export interface ImportField {
  key: string;
  label: string;
  example: string;
  required?: boolean;
  notes?: string;
}

export const recipeImportFields: ImportField[] = [
  { key: 'recipe_name', label: 'Recipe name', example: 'House Tomato Sauce', required: true },
  { key: 'category', label: 'Category', example: 'Sauces' },
  { key: 'yield', label: 'Yield', example: '1.5 L' },
  { key: 'portion_size', label: 'Portion size', example: '120 ml' },
  { key: 'ingredients', label: 'Ingredients', example: 'Tomatoes, onion, olive oil' },
  { key: 'ingredient_quantity', label: 'Ingredient quantity', example: '500' },
  { key: 'ingredient_unit', label: 'Ingredient unit', example: 'g' },
  { key: 'preparation_steps', label: 'Preparation steps', example: '1. Prep ingredients; 2. Simmer; 3. Finish' },
  { key: 'station_area', label: 'Station / area', example: 'Kitchen line' },
  { key: 'equipment', label: 'Equipment', example: 'Sauce pan, stove' },
  { key: 'allergens', label: 'Allergens', example: 'None' },
  { key: 'notes', label: 'Notes', example: 'Cool before storing' },
];

export const sopImportFields: ImportField[] = [
  { key: 'sop_title', label: 'SOP title', example: 'Opening Checklist', required: true },
  { key: 'department', label: 'Department', example: 'Kitchen' },
  { key: 'role', label: 'Role', example: 'Line Cook' },
  { key: 'area', label: 'Area', example: 'Prep Area' },
  { key: 'category', label: 'Category', example: 'Daily Operations' },
  { key: 'purpose', label: 'Purpose', example: 'Prepare the station for service.' },
  { key: 'steps', label: 'Steps', example: '1. Unlock area; 2. Check equipment; 3. Confirm readiness' },
  { key: 'equipment', label: 'Equipment', example: 'POS Terminal, Refrigerator' },
  { key: 'frequency', label: 'Frequency', example: 'Daily' },
  { key: 'notes', label: 'Notes', example: 'Review before publish' },
];

export const importValidationRules: ImportValidationIssue[] = [
  {
    rowNumber: null,
    field: 'title',
    severity: 'info',
    message: 'Records import as drafts first. Nothing is published automatically.',
  },
  {
    rowNumber: null,
    field: 'source',
    severity: 'info',
    message: 'Imported source stays preserved so traceability is never lost.',
  },
  {
    rowNumber: null,
    field: 'content',
    severity: 'warning',
    message: 'Keep steps and ingredients in separate cells when the sheet can support it.',
  },
  {
    rowNumber: null,
    field: 'mapping',
    severity: 'warning',
    message: 'Manual review is still required before a draft can be published.',
  },
];

