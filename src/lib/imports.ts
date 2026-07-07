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

export interface ImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  issues: ImportValidationIssue[];
}

export interface ImportPreviewResult {
  title: string;
  sourceType: 'recipe' | 'sop' | 'manual';
  detectedImportType: 'recipe' | 'sop' | 'unknown';
  fileName: string;
  headers: string[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  issues: ImportValidationIssue[];
  rows: ImportPreviewRow[];
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

const REQUIRED_RECIPE_FIELDS: Array<keyof RecipeImportRow> = ['recipe_name', 'ingredients', 'preparation_steps'];
const REQUIRED_SOP_FIELDS: Array<keyof SOPImportRow> = ['sop_title', 'steps'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line, index, allLines) => line.trim().length > 0 || index === 0 || index < allLines.length - 1);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => splitCsvLine(line));
  return { headers, rows };
}

function rowObjectFromValues(headers: string[], values: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((row, header, index) => {
    row[header] = values[index]?.trim() ?? '';
    return row;
  }, {});
}

function detectImportType(headers: string[], fileName: string): 'recipe' | 'sop' | 'unknown' {
  const normalizedHeaders = headers.map(normalizeHeader);
  if (normalizedHeaders.includes('recipe_name') || fileName.toLowerCase().includes('recipe')) return 'recipe';
  if (normalizedHeaders.includes('sop_title') || fileName.toLowerCase().includes('sop')) return 'sop';
  return 'unknown';
}

function buildFieldMessage(field: string, message: string, severity: 'warning' | 'error', rowNumber: number): ImportValidationIssue {
  return {
    rowNumber,
    field,
    severity,
    message,
  };
}

function validateRecipeRow(row: Record<string, string>, rowNumber: number): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  for (const field of REQUIRED_RECIPE_FIELDS) {
    if (!row[field]?.trim()) {
      issues.push(buildFieldMessage(field, `${field.replace(/_/g, ' ')} is required.`, 'error', rowNumber));
    }
  }
  if (!row.category?.trim()) {
    issues.push(buildFieldMessage('category', 'Category is recommended.', 'warning', rowNumber));
  }
  return issues;
}

function validateSOPRow(row: Record<string, string>, rowNumber: number): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  for (const field of REQUIRED_SOP_FIELDS) {
    if (!row[field]?.trim()) {
      issues.push(buildFieldMessage(field, `${field.replace(/_/g, ' ')} is required.`, 'error', rowNumber));
    }
  }
  if (!row.department?.trim()) {
    issues.push(buildFieldMessage('department', 'Department is recommended.', 'warning', rowNumber));
  }
  if (!row.purpose?.trim()) {
    issues.push(buildFieldMessage('purpose', 'Purpose is recommended.', 'warning', rowNumber));
  }
  return issues;
}

export function buildImportPreview(fileName: string, text: string): ImportPreviewResult {
  const { headers, rows } = parseCsvText(text);
  const detectedImportType = detectImportType(headers, fileName);
  const typedHeaders =
    detectedImportType === 'recipe'
      ? (['recipe_name', 'category', 'yield', 'portion_size', 'ingredients', 'ingredient_quantity', 'ingredient_unit', 'preparation_steps', 'station_area', 'equipment', 'allergens', 'notes'] as const)
      : detectedImportType === 'sop'
        ? (['sop_title', 'department', 'role', 'area', 'category', 'purpose', 'steps', 'equipment', 'frequency', 'notes'] as const)
        : headers;

  const parsedRows = rows
    .map((values, index) => {
      const rowNumber = index + 2;
      const row = rowObjectFromValues(headers, values);
      const issues = detectedImportType === 'recipe'
        ? validateRecipeRow(row, rowNumber)
        : detectedImportType === 'sop'
          ? validateSOPRow(row, rowNumber)
          : [
              buildFieldMessage(
                'type',
                'Unable to detect import type. Use a recipe or SOP template header.',
                'warning',
                rowNumber,
              ),
            ];

      return {
        rowNumber,
        values: row,
        issues,
      };
    })
    .filter((row) => Object.values(row.values).some((value) => value.trim().length > 0));

  const validRows = parsedRows.filter((row) => !row.issues.some((issue) => issue.severity === 'error')).length;
  const warningRows = parsedRows.filter((row) => row.issues.some((issue) => issue.severity === 'warning')).length;
  const errorRows = parsedRows.filter((row) => row.issues.some((issue) => issue.severity === 'error')).length;
  const issues: ImportValidationIssue[] = [
    ...(detectedImportType === 'unknown'
      ? [
          {
            rowNumber: null,
            field: 'type',
            severity: 'warning',
            message: 'Import type could not be detected from headers. The preview will still show the rows.',
          } satisfies ImportValidationIssue,
        ]
      : []),
    ...parsedRows.flatMap((row) => row.issues),
  ];

  return {
    title: fileName,
    sourceType: detectedImportType === 'recipe' ? 'recipe' : detectedImportType === 'sop' ? 'sop' : 'manual',
    detectedImportType,
    fileName,
    headers: headers.length > 0 ? headers : Array.from(typedHeaders),
    totalRows: parsedRows.length,
    validRows,
    warningRows,
    errorRows,
    issues,
    rows: parsedRows,
  };
}
