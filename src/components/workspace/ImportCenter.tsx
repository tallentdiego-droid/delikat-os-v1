import { ChangeEvent, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Upload, X } from 'lucide-react';
import { EmptyState, OSCard } from '../os';
import {
  buildImportPreview,
  importValidationRules,
  recipeImportFields,
  sopImportFields,
  type ImportPreviewResult,
  type ImportField,
} from '../../lib/imports';

function ImportFieldList({ fields }: { fields: ImportField[] }): JSX.Element {
  return (
    <div className="importFieldGrid">
      {fields.map((field) => (
        <OSCard className="importFieldCard" key={field.key}>
          <div className="importFieldHeader">
            <strong>{field.label}</strong>
            {field.required ? <span>Required</span> : <span>Optional</span>}
          </div>
          <p>{field.example}</p>
          {field.notes ? <small>{field.notes}</small> : null}
        </OSCard>
      ))}
    </div>
  );
}

export function ImportCenter(): JSX.Element {
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const previewRows = useMemo(() => preview?.rows.slice(0, 5) ?? [], [preview]);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const text = await file.text();
      const nextPreview = buildImportPreview(file.name, text);
      setPreview(nextPreview);
      setFileName(file.name);
    } catch (reason) {
      setPreview(null);
      setFileName('');
      setParseError(reason instanceof Error ? reason.message : 'The CSV could not be parsed.');
    } finally {
      setIsParsing(false);
    }
  }

  function clearPreview(): void {
    setPreview(null);
    setFileName('');
    setParseError(null);
  }

  return (
    <section className="workspaceSection importCenterSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>Import Center</h3>
          <p>Plan recipe and SOP imports before Studio turns them into draft records.</p>
        </div>
        <label className="iconTextButton">
          <Upload aria-hidden="true" size={16} />
          {isParsing ? 'Parsing…' : 'Upload CSV'}
          <input accept=".csv,text/csv" className="screenReaderOnly" onChange={handleFileUpload} type="file" />
        </label>
      </div>

      <div className="importWarning">
        Preview only. Nothing is saved yet. Imports will create drafts in a later sprint, and imported source stays preserved.
      </div>

      <div className="importPlanGrid">
        <OSCard className="importPlanCard">
          <div className="importPlanHeader">
            <FileSpreadsheet aria-hidden="true" size={18} />
            <div>
              <strong>Recipes from Excel / CSV</strong>
              <p>Plan structured recipe imports for menus, prep, and station work.</p>
            </div>
          </div>
          <div className="importPlanActions">
            <a className="iconTextButton" href="/templates/recipe_import_template.csv" download>
              <Download aria-hidden="true" size={16} />
              Download recipe template
            </a>
            <span className="quietText">Simple human-editable CSV.</span>
          </div>
          <ImportFieldList fields={recipeImportFields} />
        </OSCard>

        <OSCard className="importPlanCard">
          <div className="importPlanHeader">
            <FileText aria-hidden="true" size={18} />
            <div>
              <strong>SOPs from spreadsheet / CSV</strong>
              <p>Plan SOP imports with role, department, area, and steps.</p>
            </div>
          </div>
          <div className="importPlanActions">
            <a className="iconTextButton" href="/templates/sop_import_template.csv" download>
              <Download aria-hidden="true" size={16} />
              Download SOP template
            </a>
            <span className="quietText">Drafts first, publish later.</span>
          </div>
          <ImportFieldList fields={sopImportFields} />
        </OSCard>
      </div>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Validation preview</h3>
            <p>These are the checks we’ll apply before turning rows into drafts.</p>
          </div>
        </div>
        <div className="importValidationList">
          {importValidationRules.map((issue, index) => (
            <OSCard className={`importValidationCard ${issue.severity}`} key={`${issue.field}-${index}`}>
              <div className="importValidationHeader">
                <strong>{issue.field}</strong>
                <span>{issue.severity}</span>
              </div>
              <p>{issue.message}</p>
            </OSCard>
          ))}
        </div>
      </section>

      {parseError ? (
        <OSCard className="importPreviewCard error">
          <div className="importPreviewHeader">
            <div>
              <strong>Preview unavailable</strong>
              <p>{parseError}</p>
            </div>
            <button className="iconTextButton" onClick={clearPreview} type="button">
              <X aria-hidden="true" size={16} />
              Clear
            </button>
          </div>
        </OSCard>
      ) : null}

      {preview ? (
        <OSCard className="importPreviewCard">
          <div className="importPreviewHeader">
            <div>
              <strong>{preview.fileName}</strong>
              <p>
                Detected import type: <span>{preview.detectedImportType === 'unknown' ? 'Unknown' : preview.detectedImportType.toUpperCase()}</span>
              </p>
            </div>
            <div className="importPreviewActions">
              <button className="iconTextButton" onClick={clearPreview} type="button">
                <X aria-hidden="true" size={16} />
                Clear preview
              </button>
            </div>
          </div>
          <div className="importPreviewStats">
            <span><strong>{preview.totalRows}</strong> rows</span>
            <span><strong>{preview.validRows}</strong> valid</span>
            <span><strong>{preview.warningRows}</strong> with warnings</span>
            <span><strong>{preview.errorRows}</strong> with errors</span>
          </div>
          <div className="importPreviewSafety">
            This is preview only. Nothing is saved yet. Imported rows will create drafts in a later sprint, never published automatically.
          </div>
          {preview.issues.length > 0 ? (
            <div className="importPreviewIssues">
              {preview.issues.map((issue, index) => (
                <div className={`importPreviewIssue ${issue.severity}`} key={`${issue.field}-${index}`}>
                  <strong>{issue.rowNumber ? `Row ${issue.rowNumber}` : 'Preview'}</strong>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="importPreviewTableWrap">
            <table className="importPreviewTable">
              <thead>
                <tr>
                  <th>Row</th>
                  {preview.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length > 0 ? (
                  previewRows.map((row) => {
                    const hasError = row.issues.some((issue) => issue.severity === 'error');
                    const hasWarning = row.issues.some((issue) => issue.severity === 'warning');
                    const statusLabel = hasError ? 'Errors' : hasWarning ? 'Warnings' : 'Ready';
                    return (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        {preview.headers.map((header) => (
                          <td key={`${row.rowNumber}-${header}`}>{row.values[header] ?? ''}</td>
                        ))}
                        <td>{statusLabel}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={preview.headers.length + 2}>No preview rows yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </OSCard>
      ) : (
        <EmptyState
          title={fileName ? `Preview ready for ${fileName}` : 'Upload a CSV to preview rows'}
          description="Choose a recipe or SOP CSV to inspect row counts, warnings, and a safe draft preview before any import work is built."
          action={
            <label className="iconTextButton">
              <Upload aria-hidden="true" size={16} />
              {isParsing ? 'Parsing…' : 'Upload CSV'}
              <input accept=".csv,text/csv" className="screenReaderOnly" onChange={handleFileUpload} type="file" />
            </label>
          }
        />
      )}

    </section>
  );
}
