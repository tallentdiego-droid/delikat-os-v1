import { Download, FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { EmptyState, OSCard } from '../os';
import {
  importValidationRules,
  recipeImportFields,
  sopImportFields,
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
  return (
    <section className="workspaceSection importCenterSection">
      <div className="workspaceSectionHeader">
        <div>
          <h3>Import Center</h3>
          <p>Plan recipe and SOP imports before Studio turns them into draft records.</p>
        </div>
        <button className="iconTextButton" type="button" disabled>
          <Upload aria-hidden="true" size={16} />
          Upload coming next
        </button>
      </div>

      <div className="importWarning">
        Imports always create draft records first. Imported source stays preserved, and nothing publishes automatically.
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

      <EmptyState
        title="Upload coming next"
        description="This Studio section is ready for template planning now. Upload and mapping will land in the next import sprint."
      />
    </section>
  );
}

