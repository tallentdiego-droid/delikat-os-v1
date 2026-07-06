import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Boxes, FileText, GitBranch, Layers3, ListTree, Search, X } from 'lucide-react';
import {
  getKnowledgeEngineData,
  previewText,
  type KnowledgeEngineData,
  type KnowledgeCoverageSummary,
  type KnowledgeObject,
  type KnowledgeOntologyEntity,
  type KnowledgeOntologyGroups,
  type ManualFilter,
} from '../../lib/knowledge';
import {
  SOPCard,
  SOPCoverageWarning,
  SOPEvidencePanel,
  SOPRelatedKnowledge,
} from '../os';

type KnowledgeTab = 'search' | 'manuals' | 'objects' | 'categories' | 'relationships' | 'versions';
type ObjectTab = 'knowledge' | 'ontology';
type OntologyFilters = Record<'department' | 'role' | 'area' | 'equipment' | 'businessProcess' | 'documentType' | 'tag', string>;

const manualOptions: ManualFilter[] = ['all', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];
const emptyOntologyFilters: OntologyFilters = {
  department: 'all',
  role: 'all',
  area: 'all',
  equipment: 'all',
  businessProcess: 'all',
  documentType: 'all',
  tag: 'all',
};

const tabs: Array<{ id: KnowledgeTab; label: string; icon: typeof Search }> = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'manuals', label: 'Manuals', icon: BookOpen },
  { id: 'objects', label: 'Knowledge Objects', icon: Boxes },
  { id: 'categories', label: 'Categories', icon: Layers3 },
  { id: 'relationships', label: 'Relationships', icon: GitBranch },
  { id: 'versions', label: 'Versions', icon: ListTree },
];

function dateLabel(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function fileLabel(sourceUri: string): string {
  return sourceUri.split('/').pop() || sourceUri || 'Source file';
}

function objectCoverageSummary(object: KnowledgeObject, coverage: KnowledgeCoverageSummary): {
  coveragePercent: number;
  label: string;
  detail: string;
  missingCount: number;
  satisfiedCount: number;
} {
  const matches = [...coverage.missing, ...coverage.satisfied].filter((result) => result.matchedObjects.some((matched) => matched.id === object.id));
  if (matches.length === 0) {
    return {
      coveragePercent: 0,
      label: 'Missing SOP coverage',
      detail: 'This approved SOP has not been mapped to any training requirement yet.',
      missingCount: 0,
      satisfiedCount: 0,
    };
  }

  const satisfiedCount = matches.filter((result) => result.status === 'satisfied').length;
  const missingCount = matches.filter((result) => result.status === 'missing').length;
  const coveragePercent = Math.round((satisfiedCount / matches.length) * 100);

  return {
    coveragePercent,
    label: missingCount > 0 ? 'Coverage gaps remain' : 'Coverage ready',
    detail: missingCount > 0
      ? `${missingCount} training requirement${missingCount === 1 ? '' : 's'} still need approved SOP coverage.`
      : 'All mapped training requirements are covered by approved SOPs.',
    missingCount,
    satisfiedCount,
  };
}

function objectContext(object: KnowledgeObject): Array<{ label: string; value: string }> {
  const firstDepartment = object.ontology.departments[0];
  const firstRole = object.ontology.roles[0];
  const firstArea = object.ontology.areas[0];
  const firstProcess = object.ontology.businessProcesses[0];
  const firstDocumentType = object.ontology.documentTypes[0];

  return [
    firstDepartment ? { label: 'Department', value: firstDepartment.name } : null,
    firstRole ? { label: 'Role', value: firstRole.name } : null,
    firstArea ? { label: 'Area', value: firstArea.name } : null,
    firstProcess ? { label: 'Process', value: firstProcess.name } : null,
    firstDocumentType ? { label: 'Document type', value: firstDocumentType.name } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && (reason.message.includes('Supabase') || reason.message.includes('deployment environment'))) {
    return reason.message;
  }
  return 'Knowledge Engine could not reach the approved SOP database. Ask an administrator to check the Supabase connection and read policies.';
}

function ontologyValues(groups: KnowledgeOntologyGroups): KnowledgeOntologyEntity[] {
  return [
    ...groups.departments,
    ...groups.roles,
    ...groups.areas,
    ...groups.equipment,
    ...groups.businessProcesses,
    ...groups.documentTypes,
    ...groups.tags,
  ];
}

function matchesObject(object: KnowledgeObject, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    object.title,
    object.summary ?? '',
    object.category,
    object.manualTitle,
    object.sourceFileUri,
    object.sourceSectionHeading,
    object.approvedVersion.body,
    ...ontologyValues(object.ontology).map((item) => `${item.name} ${item.code}`),
    ...object.evidence.map((item) => item.sourceSectionBody),
  ].some((value) => value.toLowerCase().includes(needle));
}

function hasOntologyMatch(object: KnowledgeObject, filters: OntologyFilters): boolean {
  return (
    (filters.department === 'all' || object.ontology.departments.some((item) => item.id === filters.department)) &&
    (filters.role === 'all' || object.ontology.roles.some((item) => item.id === filters.role)) &&
    (filters.area === 'all' || object.ontology.areas.some((item) => item.id === filters.area)) &&
    (filters.equipment === 'all' || object.ontology.equipment.some((item) => item.id === filters.equipment)) &&
    (filters.businessProcess === 'all' || object.ontology.businessProcesses.some((item) => item.id === filters.businessProcess)) &&
    (filters.documentType === 'all' || object.ontology.documentTypes.some((item) => item.id === filters.documentType)) &&
    (filters.tag === 'all' || object.ontology.tags.some((item) => item.id === filters.tag))
  );
}

function EmptyState({ title, message }: { title: string; message: string }): JSX.Element {
  return (
    <div className="emptyState refined">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function GlobalSearch({
  categories,
  query,
  manualCode,
  category,
  onCategoryChange,
  onManualChange,
  onQueryChange,
}: {
  categories: string[];
  query: string;
  manualCode: ManualFilter;
  category: string;
  onCategoryChange: (value: string) => void;
  onManualChange: (value: ManualFilter) => void;
  onQueryChange: (value: string) => void;
}): JSX.Element {
  return (
    <div className="toolbar knowledgeToolbar globalSearch" role="search">
      <label className="searchField">
        <Search aria-hidden="true" size={17} />
        <input onChange={(event) => onQueryChange(event.target.value)} placeholder="Search approved SOPs, evidence, manuals, and headings" value={query} />
      </label>
      <label className="selectField">
        <span>Manual</span>
        <select onChange={(event) => onManualChange(event.target.value as ManualFilter)} value={manualCode}>
          {manualOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All' : option}
            </option>
          ))}
        </select>
      </label>
      <label className="selectField wideSelect">
        <span>Category</span>
        <select onChange={(event) => onCategoryChange(event.target.value)} value={category}>
          <option value="all">All</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function OntologySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: KnowledgeOntologyEntity[];
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="selectField ontologySelect">
      <span>{label}</span>
      <select disabled={options.length === 0} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="all">{options.length === 0 ? 'None linked' : 'All'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function OntologyFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: OntologyFilters;
  options: KnowledgeOntologyGroups;
  onChange: (filters: OntologyFilters) => void;
}): JSX.Element {
  return (
    <div className="ontologyFilterGrid" aria-label="Ontology filters">
      <OntologySelect label="Department" options={options.departments} value={filters.department} onChange={(department) => onChange({ ...filters, department })} />
      <OntologySelect label="Role" options={options.roles} value={filters.role} onChange={(role) => onChange({ ...filters, role })} />
      <OntologySelect label="Area" options={options.areas} value={filters.area} onChange={(area) => onChange({ ...filters, area })} />
      <OntologySelect label="Equipment" options={options.equipment} value={filters.equipment} onChange={(equipment) => onChange({ ...filters, equipment })} />
      <OntologySelect label="Process" options={options.businessProcesses} value={filters.businessProcess} onChange={(businessProcess) => onChange({ ...filters, businessProcess })} />
      <OntologySelect label="Document Type" options={options.documentTypes} value={filters.documentType} onChange={(documentType) => onChange({ ...filters, documentType })} />
      <OntologySelect label="Tags" options={options.tags} value={filters.tag} onChange={(tag) => onChange({ ...filters, tag })} />
    </div>
  );
}

function SearchScreen({
  objects,
  coverage,
  onOpenObject,
}: {
  objects: KnowledgeObject[];
  coverage: KnowledgeCoverageSummary;
  onOpenObject: (id: string) => void;
}): JSX.Element {
  if (objects.length === 0) return <EmptyState title="No SOPs found" message="No approved SOPs match the current filters." />;
  return (
    <div className="resultList">
      {objects.map((object) => (
        <SOPCard
          action={
            <button className="iconTextButton" onClick={() => onOpenObject(object.id)} type="button">
              <FileText aria-hidden="true" size={16} />
              <span>Open SOP</span>
            </button>
          }
          className="resultCard"
          coverageLabel={objectCoverageSummary(object, coverage).label}
          coveragePercent={objectCoverageSummary(object, coverage).coveragePercent}
          metadata={objectContext(object).map((item) => ({ label: item.label, value: item.value }))}
          sourceDetail={`${object.manualTitle} · ${object.sourceSectionHeading}`}
          sourceLabel="Source document"
          status={object.status}
          summary={object.summary ?? object.preview}
          key={object.id}
          title={object.title}
        />
      ))}
    </div>
  );
}

function ManualsScreen({ data, onOpenObject }: { data: KnowledgeEngineData; onOpenObject: (id: string) => void }): JSX.Element {
  const [selectedId, setSelectedId] = useState(data.manuals[0]?.id ?? '');
  const selected = data.manuals.find((manual) => manual.id === selectedId) ?? data.manuals[0];
  const objectsById = new Map(data.objects.map((object) => [object.id, object]));

  if (!selected) return <EmptyState title="No manuals visible" message="Approved source manuals are not visible through the current read policy." />;
  return (
    <div className="manualBrowser">
      <div className="listPanel">
        {data.manuals.map((manual) => (
          <button className={manual.id === selected.id ? 'listButton active' : 'listButton'} key={manual.id} onClick={() => setSelectedId(manual.id)} type="button">
            <span>{manual.manualCode ?? 'File'}</span>
            <strong>{fileLabel(manual.sourceUri)}</strong>
            <small>{manual.sections.length} source sections</small>
          </button>
        ))}
      </div>
      <div className="detailPanel">
        <h3>{selected.title}</h3>
        <div className="evidenceGrid compact">
          <span>Manual</span>
          <strong>{selected.category}</strong>
          <span>Source file</span>
          <strong>{selected.sourceUri}</strong>
        </div>
        <div className="sectionTree">
          {selected.sections.map((section) => (
            <article className="sectionNode" key={section.id}>
              <h4>{section.heading}</h4>
              <p>{previewText(section.body, 180)}</p>
              <div className="nestedObjects">
                {section.knowledgeIds.length === 0 ? (
                  <span className="quietText">No visible approved objects for this section.</span>
                ) : (
                  section.knowledgeIds.map((id) => {
                    const object = objectsById.get(id);
                    return object ? (
                      <button className="miniObject" key={id} onClick={() => onOpenObject(id)} type="button">
                        <FileText aria-hidden="true" size={15} />
                        <span>{object.title}</span>
                      </button>
                    ) : null;
                  })
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectsScreen({ objects, onOpenObject }: { objects: KnowledgeObject[]; onOpenObject: (id: string) => void }): JSX.Element {
  if (objects.length === 0) return <EmptyState title="No objects found" message="No approved objects match the current filters." />;
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Manual</th>
            <th>Version</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((object) => (
            <tr key={object.id}>
              <td>
                <button className="tableLink" onClick={() => onOpenObject(object.id)} type="button">
                  {object.title}
                </button>
              </td>
              <td>{object.category}</td>
              <td>{object.status}</td>
              <td>{object.manualCode ?? object.manualTitle}</td>
              <td>{object.approvedVersion.versionNumber}</td>
              <td>{dateLabel(object.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesScreen({ data, objects, onOpenObject }: { data: KnowledgeEngineData; objects: KnowledgeObject[]; onOpenObject: (id: string) => void }): JSX.Element {
  const filtered = data.categories
    .map((category) => ({ ...category, objects: objects.filter((object) => object.category === category.name) }))
    .filter((category) => category.objects.length > 0);
  if (filtered.length === 0) return <EmptyState title="No categories found" message="Categories are derived from approved SOPs and current filters." />;
  return (
    <div className="categoryGrid">
      {filtered.map((category) => (
        <article className="categoryPanel" key={category.name}>
          <div className="categoryHeader">
            <h3>{category.name}</h3>
            <strong>{category.objects.length}</strong>
          </div>
          <div className="categoryObjects">
            {category.objects.map((object) => (
              <button key={object.id} onClick={() => onOpenObject(object.id)} type="button">
                {object.title}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RelationshipsScreen({ objects, onOpenObject }: { objects: KnowledgeObject[]; onOpenObject: (id: string) => void }): JSX.Element {
  const [selectedId, setSelectedId] = useState(objects[0]?.id ?? '');
  const selected = objects.find((object) => object.id === selectedId) ?? objects[0];
  const incoming = selected?.related.filter((item) => item.direction === 'incoming') ?? [];
  const outgoing = selected?.related.filter((item) => item.direction === 'outgoing') ?? [];
  if (!selected) return <EmptyState title="No SOP graph visible" message="Approved SOPs are required before relationships can display." />;
  return (
    <div className="graphLayout">
      <div className="listPanel">
        {objects.map((object) => (
          <button className={object.id === selected.id ? 'listButton active' : 'listButton'} key={object.id} onClick={() => setSelectedId(object.id)} type="button">
            <span>{object.manualCode ?? 'SOP'}</span>
            <strong>{object.title}</strong>
            <small>{object.related.length} relationships</small>
          </button>
        ))}
      </div>
      <div className="detailPanel">
        <div className="detailHeader">
          <h3>{selected.title}</h3>
          <button className="iconTextButton" onClick={() => onOpenObject(selected.id)} type="button">
            Open SOP
          </button>
        </div>
        <RelationshipList title="Incoming SOPs" rows={incoming} onOpenObject={onOpenObject} />
        <RelationshipList title="Outgoing SOPs" rows={outgoing} onOpenObject={onOpenObject} />
      </div>
    </div>
  );
}

function RelationshipList({
  title,
  rows,
  onOpenObject,
}: {
  title: string;
  rows: KnowledgeObject['related'];
  onOpenObject: (id: string) => void;
}): JSX.Element {
  if (rows.length === 0) return <EmptyState title={`No ${title.toLowerCase()}`} message="No approved SOP relationships are recorded for this object yet." />;
  return (
    <section className="relatedList">
      <h4>{title}</h4>
      {rows.map((row) => (
        <div className="relatedRow" key={row.relationship.id}>
          <span className={`relationshipBadge ${row.direction}`}>{row.relationship.typeName}</span>
          <strong>{row.object.title}</strong>
          <span>{row.object.status}</span>
            <span>{row.object.manualCode ?? row.object.manualTitle}</span>
            <button className="tableLink" onClick={() => onOpenObject(row.object.id)} type="button">
            Open SOP
          </button>
        </div>
      ))}
    </section>
  );
}

function VersionsScreen({ data, onOpenObject }: { data: KnowledgeEngineData; onOpenObject: (id: string) => void }): JSX.Element {
  const objectsById = new Map(data.objects.map((object) => [object.id, object]));
  if (data.versions.length === 0) return <EmptyState title="No versions visible" message="No approved version records are available through the current policy." />;
  return (
    <div className="versionList">
      {data.versions.map((version) => {
        const object = objectsById.get(version.knowledgeId);
        if (!object) return null;
        const isCurrent = object.currentApprovedVersionId === version.id;
        return (
          <SOPCard
            action={
              <button className="tableLink" onClick={() => onOpenObject(object.id)} type="button">
                Open SOP
              </button>
            }
            className={isCurrent ? 'versionCard current' : 'versionCard'}
            key={version.id}
            metadata={[
              { label: 'Version', value: `v${version.versionNumber}` },
              { label: 'Manual', value: object.manualCode ?? object.manualTitle },
              { label: 'Updated', value: dateLabel(version.approvedAt ?? version.updatedAt) },
            ]}
            sourceDetail={object.category}
            sourceLabel={isCurrent ? 'Current approved' : 'Version'}
            status={version.status}
            summary={previewText(version.body, 180)}
            title={object.title}
          />
        );
      })}
    </div>
  );
}

function OntologyGroup({ label, items }: { label: string; items: KnowledgeOntologyEntity[] }): JSX.Element {
  return (
    <section className="ontologyGroup">
      <div>
        <h4>{label}</h4>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p>No linked {label.toLowerCase()}.</p>
      ) : (
        <div className="ontologyPills">
          {items.map((item) => (
            <span key={item.id}>
              {item.name}
              <small>{item.code}</small>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ObjectDrawer({
  object,
  coverage,
  onClose,
  onOpenObject,
}: {
  object: KnowledgeObject | null;
  coverage: KnowledgeCoverageSummary;
  onClose: () => void;
  onOpenObject: (id: string) => void;
}): JSX.Element | null {
  const [tab, setTab] = useState<ObjectTab>('knowledge');
  if (!object) return null;
  const incoming = object.related.filter((item) => item.direction === 'incoming');
  const outgoing = object.related.filter((item) => item.direction === 'outgoing');
  const coverageSummary = objectCoverageSummary(object, coverage);
  const relatedIncoming = incoming.map((entry) => ({
    id: `${entry.direction}:${entry.relationship.id}:${entry.object.id}`,
    title: entry.object.title,
    subtitle: entry.relationship.typeName,
    summary: entry.object.manualTitle,
    status: entry.object.status,
    notes: entry.relationship.notes ?? entry.object.manualCode ?? undefined,
    action: (
      <button className="tableLink" onClick={() => onOpenObject(entry.object.id)} type="button">
        Open SOP
      </button>
    ),
  }));
  const relatedOutgoing = outgoing.map((entry) => ({
    id: `${entry.direction}:${entry.relationship.id}:${entry.object.id}`,
    title: entry.object.title,
    subtitle: entry.relationship.typeName,
    summary: entry.object.manualTitle,
    status: entry.object.status,
    notes: entry.relationship.notes ?? entry.object.manualCode ?? undefined,
    action: (
      <button className="tableLink" onClick={() => onOpenObject(entry.object.id)} type="button">
        Open SOP
      </button>
    ),
  }));
  return (
    <div className="drawerBackdrop" role="presentation">
      <aside aria-label="Knowledge object detail" className="detailDrawer">
        <button className="drawerClose" onClick={onClose} type="button">
          <X aria-hidden="true" size={16} />
          Close
        </button>
        <div className="objectDetailContent">
          <SOPCard
            className="objectSummaryCard"
            coverageLabel={coverageSummary.label}
            coveragePercent={coverageSummary.coveragePercent}
            metadata={objectContext(object).map((item) => ({ label: item.label, value: item.value }))}
            sourceDetail={`${object.manualTitle} · ${object.sourceSectionHeading}`}
            sourceLabel="Source document"
            status={object.status}
            summary={object.summary ?? previewText(object.approvedVersion.body, 220)}
            title={object.title}
          />
          <div className="objectTabs" role="tablist">
            {(['knowledge', 'ontology'] as ObjectTab[]).map((nextTab) => (
              <button className={tab === nextTab ? 'objectTab active' : 'objectTab'} key={nextTab} onClick={() => setTab(nextTab)} role="tab" type="button">
                {nextTab === 'knowledge' ? 'SOP' : 'Context'}
              </button>
            ))}
          </div>
          {tab === 'knowledge' ? (
            <>
              {coverageSummary.missingCount > 0 && (
                <SOPCoverageWarning
                  coveragePercent={coverageSummary.coveragePercent}
                  detail={coverageSummary.detail}
                  description="This SOP is still missing some coverage links."
                  title={coverageSummary.label}
                  action={<span className="quietText">Review the related SOPs below.</span>}
                />
              )}
              <section className="detailSection">
                <h4>Approved body</h4>
                <SOPCard
                  className="approvedSopBody"
                  metadata={[
                    { label: 'Version', value: `v${object.approvedVersion.versionNumber}` },
                    { label: 'Updated', value: dateLabel(object.updatedAt) },
                  ]}
                  sourceDetail={object.sourceFileUri}
                  sourceLabel="Approved body"
                  status={object.approvedVersion.status}
                  summary={previewText(object.approvedVersion.body, 260)}
                  title={object.title}
                >
                  <pre>{object.approvedVersion.body}</pre>
                </SOPCard>
              </section>
              <SOPEvidencePanel emptyLabel="No source evidence is visible for this SOP." evidence={object.evidence} title="Source evidence" />
              <SOPRelatedKnowledge emptyLabel="No incoming SOP relationships are recorded yet." items={relatedIncoming} title="Incoming SOPs" />
              <SOPRelatedKnowledge emptyLabel="No outgoing SOP relationships are recorded yet." items={relatedOutgoing} title="Outgoing SOPs" />
              <section className="detailSection">
                <h4>Version history</h4>
                <div className="timeline">
                  {object.versions.map((version) => (
                    <SOPCard
                      className={version.id === object.currentApprovedVersionId ? 'versionSopCard current' : 'versionSopCard'}
                      key={version.id}
                      metadata={[
                        { label: 'Version', value: `v${version.versionNumber}` },
                        { label: 'Updated', value: dateLabel(version.approvedAt ?? version.updatedAt) },
                      ]}
                      sourceDetail={version.status}
                      sourceLabel={version.id === object.currentApprovedVersionId ? 'Current approved' : 'Version'}
                      status={version.status}
                      summary={previewText(version.body, 180)}
                      title={object.title}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="ontologyPanel">
              <div className="readOnlyBanner">
                <strong>Context editing prepared</strong>
                <span>These classifications stay read-only until users and permissions are added.</span>
              </div>
              <div className="ontologyGrid">
                <OntologyGroup label="Departments" items={object.ontology.departments} />
                <OntologyGroup label="Roles" items={object.ontology.roles} />
                <OntologyGroup label="Areas" items={object.ontology.areas} />
                <OntologyGroup label="Equipment" items={object.ontology.equipment} />
                <OntologyGroup label="Business Processes" items={object.ontology.businessProcesses} />
                <OntologyGroup label="Document Types" items={object.ontology.documentTypes} />
                <OntologyGroup label="Tags" items={object.ontology.tags} />
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function KnowledgeEngineModule(): JSX.Element {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('search');
  const [data, setData] = useState<KnowledgeEngineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [category, setCategory] = useState('all');
  const [ontologyFilters, setOntologyFilters] = useState<OntologyFilters>(emptyOntologyFilters);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  async function refreshData(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getKnowledgeEngineData());
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const filteredObjects = useMemo(
    () =>
      data
        ? data.objects
            .filter((object) => manualCode === 'all' || object.manualCode === manualCode)
            .filter((object) => category === 'all' || object.category === category)
            .filter((object) => hasOntologyMatch(object, ontologyFilters))
            .filter((object) => matchesObject(object, query))
        : [],
    [category, data, manualCode, ontologyFilters, query],
  );
  const selectedObject = data?.objects.find((object) => object.id === selectedObjectId) ?? null;
  const hasFilters = query || manualCode !== 'all' || category !== 'all' || Object.values(ontologyFilters).some((value) => value !== 'all');

  function clearFilters(): void {
    setQuery('');
    setManualCode('all');
    setCategory('all');
    setOntologyFilters(emptyOntologyFilters);
  }

  return (
    <section className="pageStack knowledgeEngine">
      <div className="sectionHeader">
        <div>
          <h2>Knowledge</h2>
          <p>Read-only operating knowledge from approved Supabase records.</p>
        </div>
        <div className="engineStats" aria-label="Knowledge engine counts">
          <span>{data?.manuals.length ?? '...'} files</span>
          <span>{data?.objects.length ?? '...'} objects</span>
          <span>{data?.relationships.length ?? '...'} relationships</span>
        </div>
      </div>

      {error && (
        <div className="notice error actionNotice">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
          <button className="tableLink" onClick={() => void refreshData()} type="button">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loadingPanel">
          <div className="loadingPulse" />
          <div>
            <strong>Loading Knowledge Engine</strong>
            <p>Fetching approved SOPs, evidence, versions, relationships, and context links.</p>
          </div>
        </div>
      ) : (
        data && (
          <>
            <GlobalSearch
              categories={data.categories.map((item) => item.name)}
              category={category}
              manualCode={manualCode}
              onCategoryChange={setCategory}
              onManualChange={setManualCode}
              onQueryChange={setQuery}
              query={query}
            />
            <OntologyFilterBar filters={ontologyFilters} onChange={setOntologyFilters} options={data.ontologyOptions} />
            <div className="resultsMeta">
              Showing {filteredObjects.length} of {data.objects.length} approved SOPs
              {hasFilters && (
                <button className="tableLink inlineAction" onClick={clearFilters} type="button">
                  Clear filters
                </button>
              )}
            </div>
            <div className="tabs" role="tablist" aria-label="Knowledge views">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'tabButton active' : 'tabButton'} key={tab.id} onClick={() => setActiveTab(tab.id)} role="tab" type="button">
                    <Icon aria-hidden="true" size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="tabPanel">
              {activeTab === 'search' && <SearchScreen coverage={data.coverage} objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'manuals' && <ManualsScreen data={data} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'objects' && <ObjectsScreen objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'categories' && <CategoriesScreen data={data} objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'relationships' && <RelationshipsScreen objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'versions' && <VersionsScreen data={data} onOpenObject={setSelectedObjectId} />}
            </div>
            <ObjectDrawer coverage={data.coverage} object={selectedObject} onClose={() => setSelectedObjectId(null)} onOpenObject={setSelectedObjectId} />
          </>
        )
      )}
    </section>
  );
}
