import { Search, BookOpen } from 'lucide-react';
import { SOPCard, EmptyState } from '../os';
import type { KnowledgeManual, KnowledgeObject, KnowledgeOntologyEntity, ManualFilter } from '../../lib/knowledge';
import { previewText } from '../../lib/knowledge';

function labelFromEntity(entity: KnowledgeOntologyEntity | null | undefined): string {
  return entity ? entity.name : 'Not set';
}

function manualLabel(manual: KnowledgeManual): string {
  return manual.manualCode ? `${manual.manualCode} · ${manual.title}` : manual.title;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function needsImprovementLabel(object: KnowledgeObject): string {
  if (object.status !== 'active') return 'Needs improvement';
  if (object.approvedVersion.status !== 'approved') return 'Needs improvement';
  if (object.evidence.length === 0) return 'Needs improvement';
  return 'Ready';
}

export function SOPLibrary({
  query,
  onQueryChange,
  folderLabel,
  objects,
  recentlyEdited,
  drafts,
  selectedObjectId,
  manualFilter,
  onManualFilterChange,
  manualOptions,
  departmentFilter,
  onDepartmentFilterChange,
  departmentOptions,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  statusFilter,
  onStatusFilterChange,
  needsImprovementOnly,
  onNeedsImprovementChange,
  resultSummary,
  onSelectObject,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  folderLabel: string;
  objects: KnowledgeObject[];
  recentlyEdited: KnowledgeObject[];
  drafts: KnowledgeObject[];
  selectedObjectId: string | null;
  manualFilter: ManualFilter;
  onManualFilterChange: (value: ManualFilter) => void;
  manualOptions: KnowledgeManual[];
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  departmentOptions: KnowledgeOntologyEntity[];
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roleOptions: KnowledgeOntologyEntity[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  needsImprovementOnly: boolean;
  onNeedsImprovementChange: (value: boolean) => void;
  resultSummary: string;
  onSelectObject: (id: string) => void;
}): JSX.Element {
  const hasFilters =
    query.trim().length > 0 ||
    manualFilter !== 'all' ||
    departmentFilter !== 'all' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    needsImprovementOnly;

  return (
    <div className="workspaceCenter">
      <section className="workspaceSection workspaceSearchSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>SOP search</h3>
            <p>Search live SOPs by title, summary, body, tags, source document, role, department, or related content.</p>
          </div>
          <div className="workspaceSearchMeta">{resultSummary}</div>
        </div>

        <label className="searchField workspaceSearch">
          <Search aria-hidden="true" size={17} />
          <input
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Search ${folderLabel} and approved SOPs`}
            value={query}
          />
        </label>

        <div className="workspaceFilterGrid">
          <label className="selectField workspaceFilter">
            <span>Department</span>
            <select onChange={(event) => onDepartmentFilterChange(event.target.value)} value={departmentFilter}>
              <option value="all">All departments</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="selectField workspaceFilter">
            <span>Role</span>
            <select onChange={(event) => onRoleFilterChange(event.target.value)} value={roleFilter}>
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="selectField workspaceFilter">
            <span>Status</span>
            <select onChange={(event) => onStatusFilterChange(event.target.value)} value={statusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="selectField workspaceFilter">
            <span>Source manual</span>
            <select onChange={(event) => onManualFilterChange(event.target.value as ManualFilter)} value={manualFilter}>
              <option value="all">All manuals</option>
              {manualOptions.map((manual) => (
                <option key={manual.id} value={manual.manualCode ?? 'all'}>
                  {manualLabel(manual)}
                </option>
              ))}
            </select>
          </label>
          <label className="selectField workspaceFilter">
            <span>Needs improvement</span>
            <select onChange={(event) => onNeedsImprovementChange(event.target.value === 'only')} value={needsImprovementOnly ? 'only' : 'all'}>
              <option value="all">Show all SOPs</option>
              <option value="only">Needs improvement only</option>
            </select>
          </label>
        </div>

        {hasFilters ? (
          <div className="workspaceFilterSummary">
            <span>Active filters:</span>
            <strong>
              {query.trim() ? `Search "${query.trim()}"` : 'Search off'} · {manualFilter === 'all' ? 'All manuals' : manualFilter} ·{' '}
              {departmentFilter === 'all' ? 'All departments' : labelFromEntity(departmentOptions.find((department) => department.id === departmentFilter))} ·{' '}
              {roleFilter === 'all' ? 'All roles' : labelFromEntity(roleOptions.find((role) => role.id === roleFilter))} ·{' '}
              {statusFilter === 'all' ? 'All statuses' : statusFilter} · {needsImprovementOnly ? 'Needs improvement only' : 'All quality states'}
            </strong>
          </div>
        ) : null}
      </section>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>SOP results</h3>
            <p>{objects.length} SOP{objects.length === 1 ? '' : 's'} in view</p>
          </div>
        </div>
        {objects.length === 0 ? (
          <EmptyState
            title="No SOP found"
            description="Try a different title, source manual, department, or role. If this is new work, check the source manuals first and add a new SOP later when creation is ready."
            icon={BookOpen}
          />
        ) : (
          <div className="workspaceCardGrid">
            {objects.map((object) => {
              const department = object.ontology.departments[0] ?? null;
              const role = object.ontology.roles[0] ?? null;
              const area = object.ontology.areas[0] ?? null;
              const process = object.ontology.businessProcesses[0] ?? null;
              const evidenceLabel = `${object.evidence.length} evidence link${object.evidence.length === 1 ? '' : 's'}`;
              const isSelected = selectedObjectId === object.id;
              return (
                <SOPCard
                  action={
                    <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                      Open SOP
                    </button>
                  }
                  className={isSelected ? 'workspaceResultCard selected' : 'workspaceResultCard'}
                  key={object.id}
                  metadata={[
                    { label: 'Source manual', value: object.manualCode ?? object.manualTitle },
                    { label: 'Evidence', value: evidenceLabel },
                    { label: 'Department', value: labelFromEntity(department) },
                    { label: 'Role', value: labelFromEntity(role) },
                    { label: 'Area', value: labelFromEntity(area) },
                    { label: 'Process', value: labelFromEntity(process) },
                    { label: 'Updated', value: formatDate(object.updatedAt) },
                    { label: 'Version', value: `v${object.approvedVersion.versionNumber}` },
                    { label: 'Version status', value: object.approvedVersion.status },
                  ]}
                  onClick={() => onSelectObject(object.id)}
                  selected={isSelected}
                  sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                  sourceLabel="Approved SOP"
                  status={needsImprovementLabel(object) === 'Ready' ? object.status : 'pending'}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 180)}
                  title={object.title}
                >
                  <div className="workspaceResultBody">
                    <p>{previewText(object.approvedVersion.body, 240)}</p>
                    <div className="workspaceResultHints">
                      <span>{object.evidence.length > 0 ? 'Evidence attached' : 'Evidence missing'}</span>
                      <span>{object.related.length > 0 ? `${object.related.length} related SOPs` : 'No related SOPs yet'}</span>
                      <span>{needsImprovementLabel(object)}</span>
                    </div>
                  </div>
                </SOPCard>
              );
            })}
          </div>
        )}
      </section>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Recently edited</h3>
            <p>Latest approved SOP updates in the catalog.</p>
          </div>
        </div>
        {recentlyEdited.length === 0 ? (
          <div className="workspaceEmpty">No recently edited SOPs visible.</div>
        ) : (
          <div className="workspaceMiniList">
            {recentlyEdited.map((object) => (
              <SOPCard
                key={object.id}
                title={object.title}
                summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                sourceLabel="Updated SOP"
                sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                status={object.status}
                action={
                  <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                    Preview
                  </button>
                }
                onClick={() => onSelectObject(object.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="workspaceSection">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Drafts</h3>
            <p>Work in progress and not-yet-active knowledge records.</p>
          </div>
        </div>
        {drafts.length === 0 ? (
          <div className="workspaceEmpty">No drafts are visible in the imported catalog.</div>
        ) : (
          <div className="workspaceMiniList">
            {drafts.map((object) => (
              <SOPCard
                key={object.id}
                title={object.title}
                summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                sourceLabel="Draft SOP"
                sourceDetail={`${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                status={object.status}
                action={
                  <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                    Preview
                  </button>
                }
                onClick={() => onSelectObject(object.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
