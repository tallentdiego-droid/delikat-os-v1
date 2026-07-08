import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, RotateCcw, Search } from 'lucide-react';
import { EmptyState, OSCard, SOPCard, SOPStepList, SOPEvidencePanel, StatusBadge } from '../components/os';
import {
  getKnowledgeEngineData,
  knowledgeOriginLabel,
  previewText,
  type KnowledgeEngineData,
  type KnowledgeManual,
  type KnowledgeObject,
  type ManualFilter,
} from '../lib/knowledge';

interface KnowledgeBasePageProps {
  initialSearchQuery?: string;
  initialSearchRequestId?: number;
}

const manualOptions: ManualFilter[] = ['all', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fileLabel(sourceUri: string): string {
  return sourceUri.split('/').pop() || sourceUri || 'Source file';
}

function matchesQuery(object: KnowledgeObject, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  return [
    object.title,
    object.summary ?? '',
    object.approvedVersion.body,
    object.manualTitle,
    object.sourceSectionHeading,
    object.sourceFileUri,
    ...object.evidence.map((item) => `${item.sourceSectionHeading} ${item.sourceSectionBody}`),
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

function sourceSectionsForObject(manual: KnowledgeManual | null, object: KnowledgeObject) {
  if (!manual) return [];
  return manual.sections.filter((section) => section.knowledgeIds.includes(object.id));
}

export function KnowledgeBasePage({ initialSearchQuery, initialSearchRequestId }: KnowledgeBasePageProps): JSX.Element {
  const [data, setData] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [manualCode, setManualCode] = useState<ManualFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const knowledge = await getKnowledgeEngineData();
        setData(knowledge);
        setSelectedId((current) => current ?? knowledge.objects[0]?.id ?? null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Knowledge Base could not load live Supabase data.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof initialSearchRequestId !== 'number') return;
    setQuery(initialSearchQuery?.trim() ?? '');
    setManualCode('all');
  }, [initialSearchQuery, initialSearchRequestId]);

  const filteredObjects = useMemo(() => {
    if (!data) return [];
    const filtered = data.objects.filter((object) => (manualCode === 'all' || object.manualCode === manualCode) && matchesQuery(object, query));
    return [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
  }, [data, manualCode, query]);

  useEffect(() => {
    if (!data) return;
    if (filteredObjects.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filteredObjects.some((object) => object.id === selectedId)) {
      setSelectedId(filteredObjects[0].id);
    }
  }, [data, filteredObjects, selectedId]);

  const selectedObject = useMemo(
    () => data?.objects.find((object) => object.id === selectedId) ?? null,
    [data, selectedId],
  );
  const selectedManual = useMemo(
    () => (data && selectedObject ? data.manuals.find((manual) => manual.manualCode === selectedObject.manualCode || manual.title === selectedObject.manualTitle) ?? null : null),
    [data, selectedObject],
  );
  const selectedEvidenceSections = useMemo(
    () => (selectedObject ? sourceSectionsForObject(selectedManual, selectedObject) : []),
    [selectedManual, selectedObject],
  );

  const stats = useMemo(() => {
    if (!data) return { sopCount: 0, manualCount: 0 };
    return { sopCount: data.objects.length, manualCount: data.manuals.length };
  }, [data]);

  return (
    <section className="pageStack knowledgePage">
      <div className="sectionHeader">
        <div>
          <h2>Knowledge Base</h2>
          <p>Browse the 378 imported SOP records, open a record, and keep evidence visible.</p>
          {data ? <p className="workspaceLoadSummary">{stats.sopCount} records · {stats.manualCount} manuals loaded</p> : null}
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
          <button className="iconTextButton" onClick={() => window.location.reload()} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Retry
          </button>
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="knowledgeBrowserEmpty">
          <EmptyState icon={BookOpen} title="Loading knowledge base" description="Pulling live SOP records from Supabase." />
        </div>
      ) : data ? (
        <div className="knowledgeBrowserLayout">
          <aside className="knowledgeBrowserSidebar">
            <OSCard className="knowledgeBrowserCard">
              <div className="workspaceSectionHeader">
                <div>
                  <h3>Search</h3>
                  <p>Search title, summary, body, source manual, and evidence.</p>
                </div>
              </div>
              <label className="searchField knowledgeSearchField">
                <Search aria-hidden="true" size={18} />
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search SOPs"
                  value={query}
                />
              </label>
            </OSCard>

            <OSCard className="knowledgeBrowserCard">
              <div className="workspaceSectionHeader">
                <div>
                  <h3>Folders</h3>
                  <p>Imported manuals grouped by code.</p>
                </div>
              </div>
              <div className="knowledgeFolderList">
                <button
                  className={manualCode === 'all' ? 'knowledgeFolderButton active' : 'knowledgeFolderButton'}
                  onClick={() => setManualCode('all')}
                  type="button"
                >
                  <span>All SOPs</span>
                  <small>{stats.sopCount}</small>
                </button>
                {manualOptions.filter((code) => code !== 'all').map((code) => {
                  const count = data.objects.filter((object) => object.manualCode === code).length;
                  return (
                    <button
                      className={manualCode === code ? 'knowledgeFolderButton active' : 'knowledgeFolderButton'}
                      key={code}
                      onClick={() => setManualCode(code)}
                      type="button"
                    >
                      <span>{code}</span>
                      <small>{count}</small>
                    </button>
                  );
                })}
              </div>
            </OSCard>

            <OSCard className="knowledgeBrowserCard">
              <div className="workspaceSectionHeader">
                <div>
                  <h3>Recent manuals</h3>
                  <p>Live source files behind the records.</p>
                </div>
              </div>
              <div className="knowledgeManualList">
                {data.manuals.slice(0, 5).map((manual) => (
                  <div className="knowledgeManualItem" key={manual.id}>
                    <strong>{manual.manualCode ?? manual.title}</strong>
                    <p>{manual.title}</p>
                    <span>{fileLabel(manual.sourceUri)}</span>
                  </div>
                ))}
              </div>
            </OSCard>
          </aside>

          <main className="knowledgeBrowserCenter">
            <div className="knowledgeResultsHeader">
              <div>
                <h3>{filteredObjects.length} SOP{filteredObjects.length === 1 ? '' : 's'} found</h3>
                <p>Approved knowledge records are searchable by source and evidence.</p>
              </div>
            </div>

            {filteredObjects.length > 0 ? (
              <div className="homeDraftGrid">
                {filteredObjects.map((object) => (
                  <SOPCard
                    key={object.id}
                    onClick={() => setSelectedId(object.id)}
                    selected={object.id === selectedId}
                    title={object.title}
                    summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                    sourceLabel={knowledgeOriginLabel(object)}
                    sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                    status={object.status}
                    statusLabel={object.approvedVersion.status === 'approved' ? 'Ready' : 'Draft'}
                    action={
                      <button className="tableLink" onClick={() => setSelectedId(object.id)} type="button">
                        Open
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No SOP found"
                description="Check the source manuals or clear the filters to see the full imported library."
              />
            )}
          </main>

          <aside className="knowledgeBrowserPreview">
            {selectedObject ? (
              <OSCard className="knowledgeDetailCard">
                <div className="workspaceSectionHeader workspaceDocumentHeader">
                  <div>
                    <div className="workspaceDocumentBadges">
                      <StatusBadge status={selectedObject.status} />
                      <StatusBadge status={selectedObject.sourceType === 'user_created' ? 'draft' : 'active'} label={knowledgeOriginLabel(selectedObject)} />
                    </div>
                    <h3>{selectedObject.title}</h3>
                    <p>{selectedObject.summary ?? previewText(selectedObject.approvedVersion.body, 180)}</p>
                  </div>
                </div>

                <div className="knowledgeDetailMeta">
                  <div>
                    <span>Source manual</span>
                    <strong>{selectedManual?.title ?? selectedObject.manualTitle}</strong>
                  </div>
                  <div>
                    <span>Source file</span>
                    <strong>{selectedManual?.sourceUri ?? selectedObject.sourceFileUri}</strong>
                  </div>
                  <div>
                    <span>Section</span>
                    <strong>{selectedObject.sourceSectionHeading}</strong>
                  </div>
                </div>

                <section className="knowledgeDetailSection">
                  <strong>Approved body</strong>
                  <p>{selectedObject.approvedVersion.body}</p>
                </section>

                <section className="knowledgeDetailSection" ref={undefined}>
                  <strong>Evidence</strong>
                  <SOPEvidencePanel
                    emptyLabel="No evidence linked yet."
                    evidence={selectedObject.evidence.map((item) => ({
                      id: item.id,
                      sourceManualTitle: item.sourceManualTitle,
                      sourceFileUri: item.sourceFileUri,
                      sourceSectionHeading: item.sourceSectionHeading,
                      sourceSectionBody: item.sourceSectionBody,
                      sourceSectionHash: item.sourceSectionHash,
                    }))}
                    title="Source evidence"
                  />
                </section>

                <section className="knowledgeDetailSection">
                  <strong>Source sections</strong>
                  <SOPStepList
                    emptyLabel="No source sections were linked for this record."
                    items={selectedEvidenceSections.map((section, index) => ({
                      id: section.id,
                      sequence: index + 1,
                      title: section.heading,
                      summary: previewText(section.body, 140),
                      durationLabel: selectedManual?.manualCode ?? selectedManual?.title ?? 'Source section',
                      status: 'satisfied',
                      notes: section.contentHash,
                    }))}
                    title="Linked source sections"
                  />
                </section>

                <section className="knowledgeDetailSection">
                  <strong>Version history</strong>
                  <div className="knowledgeVersionList">
                    {selectedObject.versions.slice().sort((a, b) => b.versionNumber - a.versionNumber).map((version) => (
                      <div className="knowledgeVersionItem" key={version.id}>
                        <div>
                          <strong>v{version.versionNumber}</strong>
                          <p>{version.title ?? selectedObject.title}</p>
                        </div>
                        <span>{version.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </OSCard>
            ) : (
              <OSCard className="knowledgeDetailCard">
                <EmptyState icon={BookOpen} title="Select an SOP to preview" description="Open a record to see its source, evidence, and versions." />
              </OSCard>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
