import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Boxes, FileText, GitBranch, Layers3, ListTree, Search, X } from 'lucide-react';
import {
  getKnowledgeEngineData,
  previewText,
  type KnowledgeEngineData,
  type KnowledgeObject,
  type KnowledgeOntologyEntity,
  type KnowledgeOntologyGroups,
  type ManualFilter,
} from '../../lib/knowledge';

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

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && (reason.message.includes('Supabase') || reason.message.includes('deployment environment'))) {
    return reason.message;
  }
  return 'Knowledge Engine could not reach the approved knowledge database. Ask an administrator to check the Supabase connection and read policies.';
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
        <input onChange={(event) => onQueryChange(event.target.value)} placeholder="Search approved knowledge, evidence, manuals, and headings" value={query} />
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

function SearchScreen({ objects, onOpenObject }: { objects: KnowledgeObject[]; onOpenObject: (id: string) => void }): JSX.Element {
  if (objects.length === 0) return <EmptyState title="No knowledge found" message="No approved knowledge objects match the current filters." />;
  return (
    <div className="resultList">
      {objects.map((object) => (
        <article className="resultCard" key={object.id}>
          <div className="resultHeader">
            <div>
              <h3>{object.title}</h3>
              <div className="sourceLine">
                <span>{object.manualCode ?? 'Manual'}</span>
                <span>{object.sourceSectionHeading}</span>
                <span>Version {object.approvedVersion.versionNumber}</span>
              </div>
            </div>
            <button className="iconTextButton" onClick={() => onOpenObject(object.id)} type="button">
              <FileText aria-hidden="true" size={16} />
              <span>Open</span>
            </button>
          </div>
          <p className="previewText">{object.preview}</p>
          <div className="evidenceSummary">
            <span>Source manual: {object.manualTitle}</span>
            <span>Evidence: {object.evidence.length} source section{object.evidence.length === 1 ? '' : 's'}</span>
          </div>
        </article>
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
  if (filtered.length === 0) return <EmptyState title="No categories found" message="Categories are derived from approved knowledge and current filters." />;
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
  if (!selected) return <EmptyState title="No relationship graph visible" message="Approved objects are required before relationships can display." />;
  return (
    <div className="graphLayout">
      <div className="listPanel">
        {objects.map((object) => (
          <button className={object.id === selected.id ? 'listButton active' : 'listButton'} key={object.id} onClick={() => setSelectedId(object.id)} type="button">
            <span>{object.manualCode ?? 'Knowledge'}</span>
            <strong>{object.title}</strong>
            <small>{object.related.length} relationships</small>
          </button>
        ))}
      </div>
      <div className="detailPanel">
        <div className="detailHeader">
          <h3>{selected.title}</h3>
          <button className="iconTextButton" onClick={() => onOpenObject(selected.id)} type="button">
            Open Object
          </button>
        </div>
        <RelationshipList title="Incoming relationships" rows={incoming} onOpenObject={onOpenObject} />
        <RelationshipList title="Outgoing relationships" rows={outgoing} onOpenObject={onOpenObject} />
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
  if (rows.length === 0) return <EmptyState title={`No ${title.toLowerCase()}`} message="No approved graph relationships are recorded for this object yet." />;
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
            Open
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
          <article className={isCurrent ? 'versionCard current' : 'versionCard'} key={version.id}>
            <div>
              <h3>{object.title}</h3>
              <div className="sourceLine">
                <span>Version {version.versionNumber}</span>
                <span>{version.status}</span>
                <span>{object.category}</span>
              </div>
            </div>
            <p>{previewText(version.body, 180)}</p>
            <div className="versionFooter">
              <span>{dateLabel(version.approvedAt ?? version.updatedAt)}</span>
              {isCurrent && <strong>Current approved</strong>}
              <button className="tableLink" onClick={() => onOpenObject(object.id)} type="button">
                Open object
              </button>
            </div>
          </article>
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
  onClose,
  onOpenObject,
}: {
  object: KnowledgeObject | null;
  onClose: () => void;
  onOpenObject: (id: string) => void;
}): JSX.Element | null {
  const [tab, setTab] = useState<ObjectTab>('knowledge');
  if (!object) return null;
  const incoming = object.related.filter((item) => item.direction === 'incoming');
  const outgoing = object.related.filter((item) => item.direction === 'outgoing');
  return (
    <div className="drawerBackdrop" role="presentation">
      <aside aria-label="Knowledge object detail" className="detailDrawer">
        <button className="drawerClose" onClick={onClose} type="button">
          <X aria-hidden="true" size={16} />
          Close
        </button>
        <div className="objectDetailContent">
          <div>
            <h3>{object.title}</h3>
            <div className="sourceLine">
              <span>{object.status}</span>
              <span>{object.manualTitle}</span>
              <span>{object.category}</span>
            </div>
          </div>
          <div className="objectTabs" role="tablist">
            {(['knowledge', 'ontology'] as ObjectTab[]).map((nextTab) => (
              <button className={tab === nextTab ? 'objectTab active' : 'objectTab'} key={nextTab} onClick={() => setTab(nextTab)} role="tab" type="button">
                {nextTab === 'knowledge' ? 'Knowledge' : 'Ontology'}
              </button>
            ))}
          </div>
          {tab === 'knowledge' ? (
            <>
              <section>
                <h4>Approved version</h4>
                <pre>{object.approvedVersion.body}</pre>
              </section>
              <section>
                <h4>Source evidence</h4>
                {object.evidence.map((item) => (
                  <div className="evidencePanel" key={item.id}>
                    <div className="evidenceGrid">
                      <span>Source manual</span>
                      <strong>{item.sourceManualTitle}</strong>
                      <span>Source file</span>
                      <strong>{fileLabel(item.sourceFileUri)}</strong>
                      <span>Source section</span>
                      <strong>{item.sourceSectionHeading}</strong>
                      <span>Hash</span>
                      <strong className="hashLine">{item.sourceSectionHash}</strong>
                    </div>
                    <pre>{item.sourceSectionBody}</pre>
                  </div>
                ))}
              </section>
              <section>
                <h4>Version history</h4>
                <div className="timeline">
                  {object.versions.map((version) => (
                    <div className={version.id === object.currentApprovedVersionId ? 'timelineItem current' : 'timelineItem'} key={version.id}>
                      <div>
                        <strong>Version {version.versionNumber}</strong>
                        <span>{version.status}</span>
                      </div>
                      <p>{dateLabel(version.approvedAt ?? version.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              </section>
              <RelationshipList title="Incoming relationships" rows={incoming} onOpenObject={onOpenObject} />
              <RelationshipList title="Outgoing relationships" rows={outgoing} onOpenObject={onOpenObject} />
            </>
          ) : (
            <div className="ontologyPanel">
              <div className="readOnlyBanner">
                <strong>Ontology editing prepared</strong>
                <span>Classifications are read-only until users and permissions are added.</span>
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
            <p>Fetching approved objects, evidence, versions, relationships, and ontology links.</p>
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
              Showing {filteredObjects.length} of {data.objects.length} approved knowledge objects
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
              {activeTab === 'search' && <SearchScreen objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'manuals' && <ManualsScreen data={data} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'objects' && <ObjectsScreen objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'categories' && <CategoriesScreen data={data} objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'relationships' && <RelationshipsScreen objects={filteredObjects} onOpenObject={setSelectedObjectId} />}
              {activeTab === 'versions' && <VersionsScreen data={data} onOpenObject={setSelectedObjectId} />}
            </div>
            <ObjectDrawer object={selectedObject} onClose={() => setSelectedObjectId(null)} onOpenObject={setSelectedObjectId} />
          </>
        )
      )}
    </section>
  );
}
