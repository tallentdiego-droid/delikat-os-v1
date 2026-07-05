import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  FileText,
  GitBranch,
  Layers3,
  ListTree,
  Search,
} from 'lucide-react';
import {
  createKnowledgeRelationship,
  getKnowledgeEngineData,
  previewText,
  type KnowledgeCategory,
  type KnowledgeEngineData,
  type KnowledgeManual,
  type KnowledgeObject,
  type KnowledgeRelationship,
  type KnowledgeRelationshipType,
  type KnowledgeVersion,
  type ManualFilter,
} from '../../lib/knowledge';

type KnowledgeTab = 'search' | 'manuals' | 'objects' | 'categories' | 'relationships' | 'versions';

const manualOptions: Array<ManualFilter> = ['all', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];

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

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function matchesObject(object: KnowledgeObject, query: string): boolean {
  const needle = normalized(query);
  if (!needle) return true;

  return [
    object.title,
    object.summary ?? '',
    object.category,
    object.manualTitle,
    object.sourceSectionHeading,
    object.approvedVersion.body,
    ...object.evidence.map((item) => item.sourceSectionBody),
  ].some((value) => value.toLowerCase().includes(needle));
}

function filterObjects(
  objects: KnowledgeObject[],
  query: string,
  manualCode: ManualFilter,
  category: string,
): KnowledgeObject[] {
  return objects
    .filter((object) => manualCode === 'all' || object.manualCode === manualCode)
    .filter((object) => category === 'all' || object.category === category)
    .filter((object) => matchesObject(object, query));
}

function EngineShell({
  children,
  data,
  error,
  isLoading,
}: {
  children: ReactNode;
  data: KnowledgeEngineData | null;
  error: string | null;
  isLoading: boolean;
}): JSX.Element {
  return (
    <section className="pageStack knowledgeEngine">
      <div className="sectionHeader">
        <div>
          <h2>Knowledge</h2>
          <p>Permanent source of truth for approved Delikat OS knowledge.</p>
        </div>
        <div className="engineStats" aria-label="Knowledge engine counts">
          <span>{data?.manuals.length ?? '...'} manuals</span>
          <span>{data?.objects.length ?? '...'} objects</span>
          <span>{data?.categories.length ?? '...'} categories</span>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? <div className="loadingPanel">Loading Knowledge Engine...</div> : children}
    </section>
  );
}

function FilterBar({
  categories,
  category,
  manualCode,
  query,
  onCategoryChange,
  onManualChange,
  onQueryChange,
}: {
  categories: KnowledgeCategory[];
  category: string;
  manualCode: ManualFilter;
  query: string;
  onCategoryChange: (value: string) => void;
  onManualChange: (value: ManualFilter) => void;
  onQueryChange: (value: string) => void;
}): JSX.Element {
  return (
    <div className="toolbar knowledgeToolbar" role="search">
      <label className="searchField">
        <Search aria-hidden="true" size={17} />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Full text search across title, body, evidence, manual, and section"
          value={query}
        />
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
          {categories.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EvidenceBlock({ object }: { object: KnowledgeObject }): JSX.Element {
  return (
    <div className="evidenceList">
      {object.evidence.map((item) => (
        <div className="evidencePanel" key={item.id}>
          <div className="evidenceGrid">
            <span>Source manual</span>
            <strong>{item.sourceManualTitle}</strong>
            <span>Source file</span>
            <strong>{item.sourceFileUri}</strong>
            <span>Source section</span>
            <strong>{item.sourceSectionHeading}</strong>
            <span>Hash</span>
            <strong className="hashLine">{item.sourceSectionHash}</strong>
          </div>
          <pre>{item.sourceSectionBody}</pre>
        </div>
      ))}
    </div>
  );
}

function VersionTimeline({
  currentVersionId,
  versions,
}: {
  currentVersionId: string;
  versions: KnowledgeVersion[];
}): JSX.Element {
  return (
    <div className="timeline">
      {versions.map((version) => (
        <div className={version.id === currentVersionId ? 'timelineItem current' : 'timelineItem'} key={version.id}>
          <div>
            <strong>Version {version.versionNumber}</strong>
            <span>{version.status}</span>
          </div>
          <p>{dateLabel(version.approvedAt ?? version.updatedAt)}</p>
          {version.id === currentVersionId && <span className="currentBadge">Current approved</span>}
        </div>
      ))}
    </div>
  );
}

function RelatedKnowledgeList({
  object,
  onOpenObject,
}: {
  object: KnowledgeObject;
  onOpenObject?: (knowledgeId: string) => void;
}): JSX.Element {
  if (object.related.length === 0) {
    return <div className="emptyInline">No relationships recorded in Supabase yet.</div>;
  }

  return (
    <div className="relatedList">
      {object.related.map((item) => (
        <div className="relatedRow" key={`${item.relationship.id}-${item.direction}`}>
          <span className={item.direction === 'incoming' ? 'relationshipBadge incoming' : 'relationshipBadge outgoing'}>
            {item.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
          </span>
          <strong>{item.object.title}</strong>
          <span>{item.relationship.typeName}</span>
          <span>{item.object.status}</span>
          <span>{item.object.manualCode ?? item.object.manualTitle}</span>
          {onOpenObject && (
            <button className="tableLink" onClick={() => onOpenObject(item.object.id)} type="button">
              Open
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ObjectDetail({
  object,
  onOpenObject,
}: {
  object: KnowledgeObject;
  onOpenObject?: (knowledgeId: string) => void;
}): JSX.Element {
  return (
    <article className="detailPanel">
      <div className="detailHeader">
        <div>
          <h3>{object.title}</h3>
          <div className="sourceLine">
            <span>{object.category}</span>
            <span>{object.status}</span>
            <span>Version {object.approvedVersion.versionNumber}</span>
          </div>
        </div>
      </div>

      <div className="detailGrid">
        <div>
          <h4>Approved version</h4>
          <pre>{object.approvedVersion.body}</pre>
        </div>
        <div>
          <h4>Version history</h4>
          <VersionTimeline currentVersionId={object.currentApprovedVersionId} versions={object.versions} />
        </div>
      </div>

      <h4>Evidence</h4>
      <EvidenceBlock object={object} />

      <h4>Related knowledge</h4>
      <RelatedKnowledgeList object={object} onOpenObject={onOpenObject} />
    </article>
  );
}

function SearchScreen({
  categories,
  objects,
}: {
  categories: KnowledgeCategory[];
  objects: KnowledgeObject[];
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [category, setCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const results = useMemo(
    () => filterObjects(objects, query, manualCode, category),
    [category, manualCode, objects, query],
  );

  return (
    <div className="tabPanel">
      <FilterBar
        categories={categories}
        category={category}
        manualCode={manualCode}
        onCategoryChange={setCategory}
        onManualChange={setManualCode}
        onQueryChange={setQuery}
        query={query}
      />
      <div className="resultsMeta">{results.length} approved knowledge object{results.length === 1 ? '' : 's'}</div>
      <div className="resultList">
        {results.map((object) => {
          const isExpanded = expandedId === object.id;
          return (
            <article className="resultCard" key={object.id}>
              <div className="resultHeader">
                <div>
                  <h3>{object.title}</h3>
                  <div className="sourceLine">
                    <span>{object.category}</span>
                    <span>Approved v{object.approvedVersion.versionNumber}</span>
                    <span>{object.sourceSectionHeading}</span>
                  </div>
                </div>
                <button className="iconTextButton" onClick={() => setExpandedId(isExpanded ? null : object.id)} type="button">
                  {isExpanded ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
                  <span>{isExpanded ? 'Close' : 'Open'}</span>
                </button>
              </div>
              <p className="previewText">{object.preview}</p>
              <div className="evidenceSummary">
                <strong>{object.manualTitle}</strong>
                <span>{object.sourceFileUri}</span>
              </div>
              {isExpanded && <ObjectDetail object={object} onOpenObject={setExpandedId} />}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ManualsScreen({
  manuals,
  objects,
}: {
  manuals: KnowledgeManual[];
  objects: KnowledgeObject[];
}): JSX.Element {
  const [selectedManualId, setSelectedManualId] = useState<string | null>(manuals[0]?.id ?? null);
  const selectedManual = manuals.find((manual) => manual.id === selectedManualId) ?? manuals[0];
  const objectsById = new Map(objects.map((object) => [object.id, object]));

  return (
    <div className="splitPanel">
      <div className="listPanel">
        {manuals.map((manual) => (
          <button
            className={manual.id === selectedManual?.id ? 'listButton active' : 'listButton'}
            key={manual.id}
            onClick={() => setSelectedManualId(manual.id)}
            type="button"
          >
            <span>{manual.manualCode ?? 'Manual'}</span>
            <strong>{manual.title}</strong>
            <small>{manual.sections.length} sections</small>
          </button>
        ))}
      </div>
      {selectedManual && (
        <div className="detailPanel">
          <h3>{selectedManual.title}</h3>
          <div className="evidenceGrid compact">
            <span>Manual</span>
            <strong>{selectedManual.category}</strong>
            <span>Source file</span>
            <strong>{selectedManual.sourceUri}</strong>
            <span>Captured</span>
            <strong>{dateLabel(selectedManual.capturedAt)}</strong>
          </div>

          <div className="sectionTree">
            {selectedManual.sections.map((section) => (
              <article className="sectionNode" key={section.id}>
                <h4>{section.heading}</h4>
                <p>{previewText(section.body, 180)}</p>
                <div className="nestedObjects">
                  {section.knowledgeIds.map((knowledgeId) => {
                    const object = objectsById.get(knowledgeId);
                    if (!object) return null;
                    return (
                      <div className="miniObject" key={knowledgeId}>
                        <FileText aria-hidden="true" size={15} />
                        <span>{object.title}</span>
                        <small>{object.evidence.length} evidence link{object.evidence.length === 1 ? '' : 's'}</small>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectsScreen({ objects }: { objects: KnowledgeObject[] }): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(objects[0]?.id ?? null);
  const selectedObject = objects.find((object) => object.id === selectedId) ?? objects[0];

  return (
    <div className="objectLayout">
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
              <tr className={object.id === selectedObject?.id ? 'selectedRow' : ''} key={object.id}>
                <td>
                  <button className="tableLink" onClick={() => setSelectedId(object.id)} type="button">
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
      {selectedObject && <ObjectDetail object={selectedObject} onOpenObject={setSelectedId} />}
    </div>
  );
}

function CategoriesScreen({ categories }: { categories: KnowledgeCategory[] }): JSX.Element {
  return (
    <div className="categoryGrid">
      {categories.map((category) => (
        <article className="categoryPanel" key={category.name}>
          <div className="categoryHeader">
            <h3>{category.name}</h3>
            <strong>{category.count}</strong>
          </div>
          <div className="categoryObjects">
            {category.objects.slice(0, 8).map((object) => (
              <span key={object.id}>{object.title}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function RelationshipList({
  direction,
  relationships,
  onOpenObject,
}: {
  direction: 'incoming' | 'outgoing';
  relationships: KnowledgeRelationship[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  if (relationships.length === 0) {
    return <div className="emptyInline">No {direction} relationships.</div>;
  }

  return (
    <div className="graphList">
      {relationships.map((relationship) => {
        const relatedId = direction === 'incoming' ? relationship.fromKnowledgeId : relationship.toKnowledgeId;
        const relatedTitle = direction === 'incoming' ? relationship.sourceTitle : relationship.targetTitle;
        const relatedStatus = direction === 'incoming' ? relationship.sourceStatus : relationship.targetStatus;
        const relatedManual = direction === 'incoming' ? relationship.sourceManual : relationship.targetManual;

        return (
          <article className="graphRow" key={relationship.id}>
            <span className="relationshipBadge">{relationship.typeName}</span>
            <div>
              <strong>{relatedTitle}</strong>
              <p>{relationship.notes || 'No notes'}</p>
            </div>
            <span>{relatedStatus}</span>
            <span>{relatedManual}</span>
            <button className="tableLink" onClick={() => onOpenObject(relatedId)} type="button">
              Open
            </button>
          </article>
        );
      })}
    </div>
  );
}

function RelationshipModal({
  objects,
  relationshipTypes,
  selectedSourceId,
  onClose,
  onSaved,
}: {
  objects: KnowledgeObject[];
  relationshipTypes: KnowledgeRelationshipType[];
  selectedSourceId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}): JSX.Element {
  const [sourceKnowledgeId, setSourceKnowledgeId] = useState(selectedSourceId);
  const [targetKnowledgeId, setTargetKnowledgeId] = useState(objects.find((object) => object.id !== selectedSourceId)?.id ?? '');
  const [relationshipTypeId, setRelationshipTypeId] = useState(relationshipTypes[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveRelationship(): Promise<void> {
    setError(null);

    if (sourceKnowledgeId === targetKnowledgeId) {
      setError('Source and target must be different knowledge objects.');
      return;
    }

    const sourceObject = objects.find((object) => object.id === sourceKnowledgeId);
    if (
      sourceObject?.related.some(
        (item) =>
          item.direction === 'outgoing' &&
          item.object.id === targetKnowledgeId &&
          item.relationship.typeId === relationshipTypeId,
      )
    ) {
      setError('That relationship already exists.');
      return;
    }

    try {
      setIsSaving(true);
      await createKnowledgeRelationship({
        sourceKnowledgeId,
        targetKnowledgeId,
        relationshipTypeId,
        notes,
      });
      await onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save relationship.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <div aria-modal="true" className="modalPanel" role="dialog">
        <div className="detailHeader">
          <div>
            <h3>Create relationship</h3>
            <p>Manual Knowledge Graph link</p>
          </div>
          <button className="iconTextButton" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <label className="formField">
          <span>Source</span>
          <select onChange={(event) => setSourceKnowledgeId(event.target.value)} value={sourceKnowledgeId}>
            {objects.map((object) => (
              <option key={object.id} value={object.id}>
                {object.title}
              </option>
            ))}
          </select>
        </label>

        <label className="formField">
          <span>Relationship Type</span>
          <select onChange={(event) => setRelationshipTypeId(event.target.value)} value={relationshipTypeId}>
            {relationshipTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        <label className="formField">
          <span>Target</span>
          <select onChange={(event) => setTargetKnowledgeId(event.target.value)} value={targetKnowledgeId}>
            {objects.map((object) => (
              <option disabled={object.id === sourceKnowledgeId} key={object.id} value={object.id}>
                {object.title}
              </option>
            ))}
          </select>
        </label>

        <label className="formField">
          <span>Notes</span>
          <textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
        </label>

        {error && (
          <div className="notice error">
            <AlertCircle aria-hidden="true" size={18} />
            <span>{error}</span>
          </div>
        )}

        <button className="primaryButton" disabled={isSaving} onClick={saveRelationship} type="button">
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function RelationshipsScreen({
  data,
  onRefresh,
}: {
  data: KnowledgeEngineData;
  onRefresh: () => Promise<void>;
}): JSX.Element {
  const { objects, relationships, relationshipTypes } = data;
  const [selectedId, setSelectedId] = useState<string>(objects[0]?.id ?? '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const selectedObject = objects.find((object) => object.id === selectedId) ?? objects[0];
  const incoming = relationships.filter((relationship) => relationship.toKnowledgeId === selectedObject?.id);
  const outgoing = relationships.filter((relationship) => relationship.fromKnowledgeId === selectedObject?.id);
  const countByType = new Map(relationshipTypes.map((type) => [type.code, 0]));
  for (const relationship of relationships) {
    countByType.set(relationship.kind, (countByType.get(relationship.kind) ?? 0) + 1);
  }

  return (
    <div className="tabPanel">
      <div className="relationshipMatrix">
        {relationshipTypes.map((type) => (
          <div className="relationshipCard" key={type.id}>
            <span>{type.name}</span>
            <strong>{countByType.get(type.code) ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className="graphLayout">
        <div className="listPanel">
          {objects.map((object) => (
            <button
              className={object.id === selectedObject?.id ? 'listButton active' : 'listButton'}
              key={object.id}
              onClick={() => setSelectedId(object.id)}
              type="button"
            >
              <span>{object.manualCode ?? 'Knowledge'}</span>
              <strong>{object.title}</strong>
              <small>{object.related.length} relationship{object.related.length === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>

        {selectedObject && (
          <div className="detailPanel">
            <div className="detailHeader">
              <div>
                <h3>{selectedObject.title}</h3>
                <div className="sourceLine">
                  <span>{selectedObject.status}</span>
                  <span>{selectedObject.manualTitle}</span>
                  <span>{selectedObject.related.length} relationships</span>
                </div>
              </div>
              <button className="iconTextButton" onClick={() => setIsModalOpen(true)} type="button">
                <GitBranch aria-hidden="true" size={16} />
                <span>New Relationship</span>
              </button>
            </div>

            <div className="relationshipColumns">
              <section>
                <h4>Incoming relationships</h4>
                <RelationshipList direction="incoming" onOpenObject={setSelectedId} relationships={incoming} />
              </section>
              <section>
                <h4>Outgoing relationships</h4>
                <RelationshipList direction="outgoing" onOpenObject={setSelectedId} relationships={outgoing} />
              </section>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && selectedObject && (
        <RelationshipModal
          objects={objects}
          onClose={() => setIsModalOpen(false)}
          onSaved={onRefresh}
          relationshipTypes={relationshipTypes}
          selectedSourceId={selectedObject.id}
        />
      )}
    </div>
  );
}

function VersionsScreen({ objects, versions }: { objects: KnowledgeObject[]; versions: KnowledgeVersion[] }): JSX.Element {
  const objectsById = new Map(objects.map((object) => [object.id, object]));

  return (
    <div className="versionList">
      {versions.map((version) => {
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
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function KnowledgeEngineModule(): JSX.Element {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('search');
  const [data, setData] = useState<KnowledgeEngineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshData(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await getKnowledgeEngineData();
      setData(nextData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load Knowledge Engine.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getKnowledgeEngineData()
      .then((nextData) => {
        if (isMounted) setData(nextData);
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(reason instanceof Error ? reason.message : 'Unable to load Knowledge Engine.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <EngineShell data={data} error={error} isLoading={isLoading}>
      {data && (
        <>
          <div className="tabs" role="tablist" aria-label="Knowledge views">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  aria-selected={activeTab === tab.id}
                  className={activeTab === tab.id ? 'tabButton active' : 'tabButton'}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'search' && <SearchScreen categories={data.categories} objects={data.objects} />}
          {activeTab === 'manuals' && <ManualsScreen manuals={data.manuals} objects={data.objects} />}
          {activeTab === 'objects' && <ObjectsScreen objects={data.objects} />}
          {activeTab === 'categories' && <CategoriesScreen categories={data.categories} />}
          {activeTab === 'relationships' && <RelationshipsScreen data={data} onRefresh={refreshData} />}
          {activeTab === 'versions' && <VersionsScreen objects={data.objects} versions={data.versions} />}
        </>
      )}
    </EngineShell>
  );
}
