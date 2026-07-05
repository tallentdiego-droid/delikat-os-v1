import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  Boxes,
  ChevronRight,
  FileText,
  GitBranch,
  Layers3,
  ListTree,
  Search,
  X,
} from 'lucide-react';
import {
  getKnowledgeEngineData,
  previewText,
  type KnowledgeCategory,
  type KnowledgeEngineData,
  type KnowledgeManual,
  type KnowledgeObject,
  type KnowledgeRelationship,
  type KnowledgeRelationshipType,
  type KnowledgeVersion,
  type ManualCode,
  type ManualFilter,
} from '../../lib/knowledge';

type KnowledgeTab = 'search' | 'manuals' | 'objects' | 'categories' | 'relationships' | 'versions';

interface CountItem {
  label: string;
  count: number;
}

interface KnowledgeCounts {
  byManual: CountItem[];
  byCategory: CountItem[];
  byRelationshipType: CountItem[];
}

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

function fileLabel(sourceUri: string): string {
  const parts = sourceUri.split('/');
  return parts[parts.length - 1] || sourceUri || 'Source file';
}

function matchesObject(object: KnowledgeObject, query: string): boolean {
  const needle = normalized(query);
  if (!needle) return true;

  return [
    object.title,
    object.summary ?? '',
    object.category,
    object.manualTitle,
    object.sourceFileUri,
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

function buildCounts(data: KnowledgeEngineData): KnowledgeCounts {
  const manualCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const relationshipCounts = new Map<string, number>();

  for (const object of data.objects) {
    const manual = object.manualCode ?? 'Uncoded';
    manualCounts.set(manual, (manualCounts.get(manual) ?? 0) + 1);
    categoryCounts.set(object.category, (categoryCounts.get(object.category) ?? 0) + 1);
  }

  for (const type of data.relationshipTypes) {
    relationshipCounts.set(type.name, 0);
  }

  for (const relationship of data.relationships) {
    relationshipCounts.set(relationship.typeName, (relationshipCounts.get(relationship.typeName) ?? 0) + 1);
  }

  const byManual = Array.from(manualCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const byCategory = Array.from(categoryCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const byRelationshipType = Array.from(relationshipCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { byManual, byCategory, byRelationshipType };
}

function friendlyError(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Knowledge Engine could not load. Please try again in a moment.';
  }

  if (reason.message.includes('Supabase') || reason.message.includes('deployment environment')) {
    return reason.message;
  }

  return 'Knowledge Engine could not reach the approved knowledge database. Ask an administrator to check the Supabase connection and read policies.';
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element {
  return (
    <div className="emptyState refined">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function EngineShell({
  children,
  data,
  error,
  isLoading,
  onRetry,
}: {
  children: ReactNode;
  data: KnowledgeEngineData | null;
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
}): JSX.Element {
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
          <button className="tableLink" onClick={onRetry} type="button">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loadingPanel">
          <div className="loadingPulse" />
          <div>
            <strong>Loading Knowledge Engine</strong>
            <p>Fetching approved objects, evidence, versions, and relationships.</p>
          </div>
        </div>
      ) : (
        children
      )}
    </section>
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
  categories: KnowledgeCategory[];
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
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search all knowledge objects, evidence, manuals, and headings"
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

function CountStrip({ counts }: { counts: KnowledgeCounts }): JSX.Element {
  return (
    <div className="countGrid">
      <section className="countPanel">
        <h3>By manual</h3>
        <div className="countList compactCounts">
          {counts.byManual.map((item) => (
            <span key={item.label}>
              <strong>{item.label}</strong>
              {item.count}
            </span>
          ))}
        </div>
      </section>
      <section className="countPanel">
        <h3>By category</h3>
        <div className="countList">
          {counts.byCategory.slice(0, 6).map((item) => (
            <span key={item.label}>
              <strong>{item.label}</strong>
              {item.count}
            </span>
          ))}
        </div>
      </section>
      <section className="countPanel">
        <h3>By relationship type</h3>
        <div className="countList compactCounts">
          {counts.byRelationshipType.map((item) => (
            <span key={item.label}>
              <strong>{item.label}</strong>
              {item.count}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function EvidenceBlock({ object }: { object: KnowledgeObject }): JSX.Element {
  if (object.evidence.length === 0) {
    return <EmptyState title="No evidence attached" message="This object is approved but has no visible source evidence." />;
  }

  return (
    <div className="evidenceList">
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
    return (
      <EmptyState
        title={`No ${direction} relationships`}
        message="No approved graph relationships are recorded for this object yet."
      />
    );
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
            <span className={direction === 'incoming' ? 'relationshipBadge incoming' : 'relationshipBadge outgoing'}>
              {relationship.typeName}
            </span>
            <div>
              <strong>{relatedTitle}</strong>
              <p>{relationship.notes || 'No notes recorded'}</p>
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

function ObjectDetailContent({
  object,
  relationships,
  onOpenObject,
}: {
  object: KnowledgeObject;
  relationships: KnowledgeRelationship[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  const incoming = relationships.filter((relationship) => relationship.toKnowledgeId === object.id);
  const outgoing = relationships.filter((relationship) => relationship.fromKnowledgeId === object.id);

  return (
    <article className="objectDetailContent">
      <div className="detailHeader">
        <div>
          <h3>{object.title}</h3>
          <div className="sourceLine">
            <span>{object.status}</span>
            <span>{object.manualCode ?? object.manualTitle}</span>
            <span>{object.category}</span>
            <span>Approved v{object.approvedVersion.versionNumber}</span>
          </div>
        </div>
      </div>

      <div className="detailGrid">
        <section>
          <h4>Approved body</h4>
          <pre>{object.approvedVersion.body}</pre>
        </section>
        <section>
          <h4>Version history</h4>
          <VersionTimeline currentVersionId={object.currentApprovedVersionId} versions={object.versions} />
        </section>
      </div>

      <section>
        <h4>Source evidence</h4>
        <EvidenceBlock object={object} />
      </section>

      <div className="relationshipColumns">
        <section>
          <h4>Incoming relationships</h4>
          <RelationshipList direction="incoming" onOpenObject={onOpenObject} relationships={incoming} />
        </section>
        <section>
          <h4>Outgoing relationships</h4>
          <RelationshipList direction="outgoing" onOpenObject={onOpenObject} relationships={outgoing} />
        </section>
      </div>
    </article>
  );
}

function ObjectDrawer({
  object,
  relationships,
  onClose,
  onOpenObject,
}: {
  object: KnowledgeObject | null;
  relationships: KnowledgeRelationship[];
  onClose: () => void;
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element | null {
  if (!object) return null;

  return (
    <div className="drawerBackdrop" role="presentation">
      <aside aria-label="Knowledge object detail" className="detailDrawer">
        <button className="drawerClose" onClick={onClose} type="button">
          <X aria-hidden="true" size={18} />
          <span>Close</span>
        </button>
        <ObjectDetailContent object={object} onOpenObject={onOpenObject} relationships={relationships} />
      </aside>
    </div>
  );
}

function ObjectCard({
  object,
  onOpenObject,
}: {
  object: KnowledgeObject;
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  return (
    <article className="resultCard">
      <div className="resultHeader">
        <div>
          <h3>{object.title}</h3>
          <div className="sourceLine">
            <span>{object.category}</span>
            <span>{object.sourceSectionHeading}</span>
            <span>{object.related.length} relationships</span>
          </div>
        </div>
        <button className="iconTextButton" onClick={() => onOpenObject(object.id)} type="button">
          <ChevronRight aria-hidden="true" size={16} />
          <span>Open</span>
        </button>
      </div>
      <p className="previewText">{object.preview}</p>
      <div className="evidenceSummary">
        <strong>{object.manualTitle}</strong>
        <span>{fileLabel(object.sourceFileUri)}</span>
      </div>
    </article>
  );
}

function SearchScreen({
  objects,
  onOpenObject,
}: {
  objects: KnowledgeObject[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  if (objects.length === 0) {
    return <EmptyState title="No knowledge found" message="No approved knowledge objects match the current filters." />;
  }

  return (
    <div className="resultList">
      {objects.map((object) => (
        <ObjectCard key={object.id} object={object} onOpenObject={onOpenObject} />
      ))}
    </div>
  );
}

function ManualsScreen({
  manuals,
  objects,
  onOpenObject,
}: {
  manuals: KnowledgeManual[];
  objects: KnowledgeObject[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  const manualCodes = useMemo(() => {
    const byCode = new Map<string, KnowledgeManual[]>();
    for (const manual of manuals) {
      const code = manual.manualCode ?? 'Uncoded';
      byCode.set(code, [...(byCode.get(code) ?? []), manual]);
    }
    return Array.from(byCode.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [manuals]);

  const [selectedCode, setSelectedCode] = useState<string>(manualCodes[0]?.[0] ?? '');
  const files = manualCodes.find(([code]) => code === selectedCode)?.[1] ?? manualCodes[0]?.[1] ?? [];
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id ?? '');
  const selectedFile = files.find((manual) => manual.id === selectedFileId) ?? files[0];
  const objectsById = new Map(objects.map((object) => [object.id, object]));

  useEffect(() => {
    if (!manualCodes.some(([code]) => code === selectedCode)) {
      setSelectedCode(manualCodes[0]?.[0] ?? '');
    }
  }, [manualCodes, selectedCode]);

  useEffect(() => {
    const nextFiles = manualCodes.find(([code]) => code === selectedCode)?.[1] ?? [];
    if (!nextFiles.some((manual) => manual.id === selectedFileId)) {
      setSelectedFileId(nextFiles[0]?.id ?? '');
    }
  }, [manualCodes, selectedCode, selectedFileId]);

  if (manualCodes.length === 0) {
    return <EmptyState title="No manuals visible" message="No source manuals are available through the approved knowledge policy." />;
  }

  return (
    <div className="manualBrowser">
      <div className="listPanel">
        {manualCodes.map(([code, codeFiles]) => (
          <button
            className={code === selectedCode ? 'listButton active' : 'listButton'}
            key={code}
            onClick={() => setSelectedCode(code)}
            type="button"
          >
            <span>Manual</span>
            <strong>{code}</strong>
            <small>{codeFiles.length} file{codeFiles.length === 1 ? '' : 's'}</small>
          </button>
        ))}
      </div>

      <div className="listPanel">
        {files.map((manual) => (
          <button
            className={manual.id === selectedFile?.id ? 'listButton active' : 'listButton'}
            key={manual.id}
            onClick={() => setSelectedFileId(manual.id)}
            type="button"
          >
            <span>{manual.manualCode ?? 'File'}</span>
            <strong>{fileLabel(manual.sourceUri)}</strong>
            <small>{manual.sections.length} source sections</small>
          </button>
        ))}
      </div>

      {selectedFile ? (
        <div className="detailPanel">
          <h3>{selectedFile.title}</h3>
          <div className="evidenceGrid compact">
            <span>Manual</span>
            <strong>{selectedFile.category}</strong>
            <span>Source file</span>
            <strong>{selectedFile.sourceUri}</strong>
            <span>Captured</span>
            <strong>{dateLabel(selectedFile.capturedAt)}</strong>
          </div>

          <div className="sectionTree">
            {selectedFile.sections.map((section) => (
              <article className="sectionNode" key={section.id}>
                <h4>{section.heading}</h4>
                <p>{previewText(section.body, 180)}</p>
                <div className="nestedObjects">
                  {section.knowledgeIds.length === 0 ? (
                    <span className="quietText">No visible approved objects for this section.</span>
                  ) : (
                    section.knowledgeIds.map((knowledgeId) => {
                      const object = objectsById.get(knowledgeId);
                      if (!object) return null;
                      return (
                        <button className="miniObject" key={knowledgeId} onClick={() => onOpenObject(knowledgeId)} type="button">
                          <FileText aria-hidden="true" size={15} />
                          <span>{object.title}</span>
                          <small>{object.evidence.length} evidence link{object.evidence.length === 1 ? '' : 's'}</small>
                        </button>
                      );
                    })
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No file selected" message="Choose a manual file to inspect its sections and approved objects." />
      )}
    </div>
  );
}

function ObjectsScreen({
  objects,
  onOpenObject,
}: {
  objects: KnowledgeObject[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  if (objects.length === 0) {
    return <EmptyState title="No objects found" message="No approved knowledge objects match the current filters." />;
  }

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
            <th>Relationships</th>
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
              <td>{object.related.length}</td>
              <td>{dateLabel(object.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesScreen({
  categories,
  onOpenObject,
}: {
  categories: KnowledgeCategory[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  if (categories.length === 0) {
    return <EmptyState title="No categories found" message="Categories are derived from approved imported knowledge." />;
  }

  return (
    <div className="categoryGrid">
      {categories.map((category) => (
        <article className="categoryPanel" key={category.name}>
          <div className="categoryHeader">
            <h3>{category.name}</h3>
            <strong>{category.count}</strong>
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

function RelationshipsScreen({
  objects,
  relationships,
  relationshipTypes,
  onOpenObject,
}: {
  objects: KnowledgeObject[];
  relationships: KnowledgeRelationship[];
  relationshipTypes: KnowledgeRelationshipType[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(objects[0]?.id ?? '');
  const selectedObject = objects.find((object) => object.id === selectedId) ?? objects[0];
  const incoming = selectedObject ? relationships.filter((relationship) => relationship.toKnowledgeId === selectedObject.id) : [];
  const outgoing = selectedObject ? relationships.filter((relationship) => relationship.fromKnowledgeId === selectedObject.id) : [];
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

        {selectedObject ? (
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
              <button className="iconTextButton" onClick={() => onOpenObject(selectedObject.id)} type="button">
                <ChevronRight aria-hidden="true" size={16} />
                <span>Open Object</span>
              </button>
            </div>

            <div className="relationshipColumns">
              <section>
                <h4>Incoming relationships</h4>
                <RelationshipList direction="incoming" onOpenObject={onOpenObject} relationships={incoming} />
              </section>
              <section>
                <h4>Outgoing relationships</h4>
                <RelationshipList direction="outgoing" onOpenObject={onOpenObject} relationships={outgoing} />
              </section>
            </div>
          </div>
        ) : (
          <EmptyState title="No relationship graph visible" message="Approved objects are required before relationships can display." />
        )}
      </div>
    </div>
  );
}

function VersionsScreen({
  objects,
  versions,
  onOpenObject,
}: {
  objects: KnowledgeObject[];
  versions: KnowledgeVersion[];
  onOpenObject: (knowledgeId: string) => void;
}): JSX.Element {
  const objectsById = new Map(objects.map((object) => [object.id, object]));

  if (versions.length === 0) {
    return <EmptyState title="No versions visible" message="No approved version records are available through the current policy." />;
  }

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

export function KnowledgeEngineModule(): JSX.Element {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('search');
  const [data, setData] = useState<KnowledgeEngineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [category, setCategory] = useState('all');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  async function refreshData(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await getKnowledgeEngineData();
      setData(nextData);
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
    () => (data ? filterObjects(data.objects, query, manualCode, category) : []),
    [category, data, manualCode, query],
  );
  const filteredCategories = useMemo(
    () => (data ? buildCounts({ ...data, objects: filteredObjects }).byCategory : []),
    [data, filteredObjects],
  );
  const counts = useMemo(() => (data ? buildCounts(data) : null), [data]);
  const selectedObject = data?.objects.find((object) => object.id === selectedObjectId) ?? null;

  function openObject(knowledgeId: string): void {
    setSelectedObjectId(knowledgeId);
  }

  function clearFilters(): void {
    setQuery('');
    setManualCode('all');
    setCategory('all');
  }

  return (
    <EngineShell data={data} error={error} isLoading={isLoading} onRetry={() => void refreshData()}>
      {data && (
        <>
          <GlobalSearch
            categories={data.categories}
            category={category}
            manualCode={manualCode}
            onCategoryChange={setCategory}
            onManualChange={setManualCode}
            onQueryChange={setQuery}
            query={query}
          />

          <div className="resultsMeta">
            Showing {filteredObjects.length} of {data.objects.length} approved knowledge objects
            {(query || manualCode !== 'all' || category !== 'all') && (
              <button className="tableLink inlineAction" onClick={clearFilters} type="button">
                Clear filters
              </button>
            )}
          </div>

          {counts && <CountStrip counts={counts} />}

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

          <div className="tabPanel">
            {activeTab === 'search' && <SearchScreen objects={filteredObjects} onOpenObject={openObject} />}
            {activeTab === 'manuals' && (
              <ManualsScreen manuals={data.manuals} objects={data.objects} onOpenObject={openObject} />
            )}
            {activeTab === 'objects' && <ObjectsScreen objects={filteredObjects} onOpenObject={openObject} />}
            {activeTab === 'categories' && (
              <CategoriesScreen
                categories={filteredCategories.map((item) => ({
                  name: item.label,
                  count: item.count,
                  manualCode: null as ManualCode | null,
                  objects: filteredObjects.filter((object) => object.category === item.label),
                }))}
                onOpenObject={openObject}
              />
            )}
            {activeTab === 'relationships' && (
              <RelationshipsScreen
                objects={filteredObjects}
                onOpenObject={openObject}
                relationships={data.relationships}
                relationshipTypes={data.relationshipTypes}
              />
            )}
            {activeTab === 'versions' && (
              <VersionsScreen objects={data.objects} onOpenObject={openObject} versions={data.versions} />
            )}
          </div>

          <ObjectDrawer
            object={selectedObject}
            onClose={() => setSelectedObjectId(null)}
            onOpenObject={openObject}
            relationships={data.relationships}
          />
        </>
      )}
    </EngineShell>
  );
}
