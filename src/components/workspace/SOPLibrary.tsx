import { Plus, Search } from 'lucide-react';
import { SOPCard, EmptyState } from '../os';
import type { KnowledgeManual, KnowledgeObject, KnowledgeOntologyEntity, ManualFilter } from '../../lib/knowledge';
import { previewText } from '../../lib/knowledge';

function manualLabel(manual: KnowledgeManual): string {
  return manual.manualCode ? `${manual.manualCode} · ${manual.title}` : manual.title;
}

function needsImprovementLabel(object: KnowledgeObject): string {
  if (object.status !== 'active') return 'Needs improvement';
  if (object.approvedVersion.status !== 'approved') return 'Needs improvement';
  if (object.evidence.length === 0) return 'Needs improvement';
  return 'Ready';
}

function entityLabel(entity: KnowledgeOntologyEntity | undefined): string {
  return entity?.name ?? 'All';
}

export function SOPLibrary({
  query,
  onQueryChange,
  folderLabel,
  objects,
  selectedObjectId,
  folderFilter,
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
  sortMode,
  onSortModeChange,
  resultSummary,
  onSelectObject,
  onOpenNewSOP,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  folderLabel: string;
  objects: KnowledgeObject[];
  selectedObjectId: string | null;
  folderFilter: 'all' | 'imported' | 'drafts' | 'user_created' | 'recent';
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
  sortMode: 'recent' | 'title' | 'manual';
  onSortModeChange: (value: 'recent' | 'title' | 'manual') => void;
  resultSummary: string;
  onSelectObject: (id: string) => void;
  onOpenNewSOP?: () => void;
}): JSX.Element {
  const hasFilters =
    query.trim().length > 0 ||
    folderFilter !== 'all' ||
    manualFilter !== 'all' ||
    departmentFilter !== 'all' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    needsImprovementOnly;

  return (
    <div className="workspaceCenter">
      <section className="workspaceSection workspaceSearchSection" id="studio-search">
        <div className="workspaceSectionHeader workspaceSearchHeader">
          <div>
            <h3>SOP Library</h3>
            <p>Search live SOPs by title, summary, body, tags, source document, role, department, or related content.</p>
          </div>
          <div className="workspaceSearchActions">
            <div className="workspaceSearchMeta">{resultSummary}</div>
            {onOpenNewSOP ? (
              <button className="iconTextButton" onClick={onOpenNewSOP} type="button">
                <Plus aria-hidden="true" size={16} />
                New SOP
              </button>
            ) : null}
          </div>
        </div>

        <label className="searchField workspaceSearch">
          <Search aria-hidden="true" size={17} />
          <input
            aria-label="Search SOPs"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Search ${folderLabel} and approved SOPs`}
            value={query}
          />
        </label>

        <div className="workspaceFilterGrid">
          <label className="selectField workspaceFilter">
            <span>Sort</span>
            <select onChange={(event) => onSortModeChange(event.target.value as 'recent' | 'title' | 'manual')} value={sortMode}>
              <option value="recent">Most recent</option>
              <option value="title">Title</option>
              <option value="manual">Manual</option>
            </select>
          </label>
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
              {query.trim() ? `Search "${query.trim()}"` : 'Search off'} · {sortMode === 'recent' ? 'Most recent' : sortMode === 'title' ? 'Title' : 'Manual'} ·{' '}
              {folderFilter === 'all'
                ? 'All folders'
                : folderFilter === 'imported'
                  ? 'Imported manuals'
                  : folderFilter === 'drafts'
                    ? 'Drafts'
                    : folderFilter === 'user_created'
                      ? 'User-created'
                      : 'Recently edited'} ·{' '}
              {manualFilter === 'all' ? 'All manuals' : manualFilter} ·{' '}
              {departmentFilter === 'all' ? 'All departments' : entityLabel(departmentOptions.find((department) => department.id === departmentFilter))} ·{' '}
              {roleFilter === 'all' ? 'All roles' : entityLabel(roleOptions.find((role) => role.id === roleFilter))} ·{' '}
              {statusFilter === 'all' ? 'All statuses' : statusFilter} · {needsImprovementOnly ? 'Needs improvement only' : 'All quality states'}
            </strong>
          </div>
        ) : null}

        <div className="workspaceFavoritesPlaceholder">
          <div className="workspaceSectionHeader">
            <div>
              <h3>Favorites</h3>
              <p>Favorites are not persisted yet. This area will surface the SOPs you return to most often.</p>
            </div>
          </div>
          <div className="workspaceEmpty">No favorites yet.</div>
        </div>
      </section>

      <section className="workspaceSection" id="studio-library">
        <div className="workspaceSectionHeader">
          <div>
            <h3>Results</h3>
            <p>{objects.length} SOP{objects.length === 1 ? '' : 's'} in view</p>
          </div>
        </div>
        {objects.length === 0 ? (
          <EmptyState
            title="No SOP found"
            description="Try a different title, source manual, department, or role. If this is new work, check the source manuals first and add a new SOP later when creation is ready."
            icon={Search}
            action={onOpenNewSOP ? (
              <button className="iconTextButton" onClick={onOpenNewSOP} type="button">
                <Plus aria-hidden="true" size={16} />
                New SOP
              </button>
            ) : undefined}
          />
        ) : (
          <div className="workspaceCardGrid">
            {objects.map((object) => {
              const isSelected = selectedObjectId === object.id;
              const stateLabel = needsImprovementLabel(object);
              const sourceLabel = object.sourceType === 'user_created' ? 'Studio draft' : 'Source manual';
              const sourceDetail = object.sourceType === 'user_created' ? 'Created in Studio' : object.manualCode ?? object.manualTitle;
              return (
                <SOPCard
                  action={
                    <button className="tableLink" onClick={() => onSelectObject(object.id)} type="button">
                      Open
                    </button>
                  }
                  className={isSelected ? 'workspaceResultCard selected' : 'workspaceResultCard'}
                  key={object.id}
                  onClick={() => onSelectObject(object.id)}
                  selected={isSelected}
                  sourceDetail={sourceDetail}
                  sourceLabel={sourceLabel}
                  status={stateLabel === 'Ready' ? 'active' : 'draft'}
                  statusLabel={stateLabel}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 180)}
                  title={object.title}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
