import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, RotateCcw, Search } from 'lucide-react';
import Badge from '../components/Badge';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData, type KnowledgeManual, type KnowledgeObject, type ManualFilter } from '../lib/knowledge';

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

export default function KnowledgeBasePage({ initialSearchQuery, initialSearchRequestId }: KnowledgeBasePageProps): JSX.Element {
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Knowledge Base</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Browse the imported SOP library</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Search the 378 imported records, open a record, and keep evidence visible.
            </p>
            {data ? <p className="mt-2 text-xs font-medium text-slate-500">{stats.sopCount} records · {stats.manualCount} manuals loaded</p> : null}
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800" onClick={() => window.location.reload()} type="button">
            <RotateCcw size={15} />
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100" onClick={() => window.location.reload()} type="button">
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <BookOpen className="mx-auto text-slate-300" size={32} />
          <p className="mt-3 text-sm font-semibold text-slate-700">Loading knowledge base</p>
          <p className="mt-1 text-sm text-slate-500">Pulling live SOP records from Supabase.</p>
        </div>
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(320px,0.95fr)]">
          <aside className="space-y-4">
            <Panel title="Search" description="Search title, summary, body, source manual, and evidence.">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100">
                <Search className="shrink-0 text-slate-400" size={17} />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search SOPs"
                  value={query}
                />
              </label>
            </Panel>

            <Panel title="Folders" description="Imported manuals grouped by code.">
              <div className="grid gap-1.5">
                <button className={folderClass(manualCode === 'all')} onClick={() => setManualCode('all')} type="button">
                  <span>All SOPs</span>
                  <small>{stats.sopCount}</small>
                </button>
                {manualOptions.filter((code) => code !== 'all').map((code) => {
                  const count = data.objects.filter((object) => object.manualCode === code).length;
                  return (
                    <button className={folderClass(manualCode === code)} key={code} onClick={() => setManualCode(code)} type="button">
                      <span>{code}</span>
                      <small>{count}</small>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Recent manuals" description="Live source files behind the records.">
              <div className="grid gap-2">
                {data.manuals.slice(0, 5).map((manual) => (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" key={manual.id}>
                    <strong className="block text-sm text-slate-900">{manual.manualCode ?? manual.title}</strong>
                    <p className="mt-1 text-sm text-slate-600">{manual.title}</p>
                    <span className="mt-2 block text-xs text-slate-400">{fileLabel(manual.sourceUri)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>

          <main className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{filteredObjects.length} SOP{filteredObjects.length === 1 ? '' : 's'} found</h3>
                <p className="mt-1 text-sm text-slate-500">Approved knowledge records are searchable by source and evidence.</p>
              </div>
            </div>

            {filteredObjects.length > 0 ? (
              <div className="grid gap-3">
                {filteredObjects.map((object) => (
                  <button
                    key={object.id}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${object.id === selectedId ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    onClick={() => setSelectedId(object.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-slate-900">{object.title}</h4>
                          <Badge label={knowledgeOriginLabel(object)} />
                          <Badge color={object.approvedVersion.status === 'approved' ? '#10B981' : '#F59E0B'} label={object.approvedVersion.status === 'approved' ? 'Ready' : 'Draft'} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{object.summary ?? previewText(object.approvedVersion.body, 120)}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{object.manualCode ?? object.manualTitle}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{object.sourceSectionHeading}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{object.evidence.length} evidence link{object.evidence.length === 1 ? '' : 's'}</span>
                      {object.sourceType === 'user_created' ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">User-created</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No SOP found"
                description="Check the source manuals or clear the filters to see the full imported library."
              />
            )}
          </main>

          <aside>
            {selectedObject ? (
              <Panel
                action={null}
                description="Selected SOP preview and source evidence."
                title={selectedObject.title}
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={knowledgeOriginLabel(selectedObject)} />
                    <Badge color={selectedObject.approvedVersion.status === 'approved' ? '#10B981' : '#F59E0B'} label={selectedObject.approvedVersion.status === 'approved' ? 'Ready' : 'Draft'} />
                    <Badge color="#0EA5E9" label={selectedObject.manualCode ?? selectedObject.manualTitle} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Summary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selectedObject.summary ?? previewText(selectedObject.approvedVersion.body, 220)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Approved body</p>
                    <div className="prose prose-sm mt-3 max-w-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                      {selectedObject.approvedVersion.body ? (
                        <pre className="whitespace-pre-wrap font-sans leading-6">{selectedObject.approvedVersion.body}</pre>
                      ) : (
                        <p className="text-slate-400">No approved body available.</p>
                      )}
                    </div>
                  </div>

                  <EvidencePanel object={selectedObject} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Manual source</p>
                    <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-900">{selectedManual?.title ?? selectedObject.manualTitle}</p>
                      <p className="text-xs text-slate-500">{selectedManual ? fileLabel(selectedManual.sourceUri) : selectedObject.sourceFileUri}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Related source sections</p>
                    <div className="mt-3 grid gap-2">
                      {selectedEvidenceSections.length > 0 ? selectedEvidenceSections.map((section) => (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4" key={section.id}>
                          <p className="text-sm font-medium text-slate-900">{section.heading}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{previewText(section.body, 180)}</p>
                        </div>
                      )) : (
                        <EmptyState title="No related source sections" description="The imported source is preserved, but no specific source section is linked to this record." />
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
                <FileText className="mx-auto text-slate-300" size={32} />
                <p className="mt-3 text-sm font-semibold text-slate-700">Select an SOP to preview</p>
                <p className="mt-1 text-sm text-slate-500">The right panel shows the source evidence and current approved body.</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function folderClass(active: boolean): string {
  return `flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
    active ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
  }`;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function EvidencePanel({ object }: { object: KnowledgeObject }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Source evidence</p>
      <div className="mt-3 grid gap-3">
        {object.evidence.length > 0 ? object.evidence.map((item) => (
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.id}>
            <p className="text-sm font-semibold text-slate-900">{item.sourceSectionHeading}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{previewText(item.sourceSectionBody, 220)}</p>
            <p className="mt-2 text-xs text-slate-400">{fileLabel(item.sourceFileUri)}</p>
          </article>
        )) : (
          <EmptyState title="Original imported source — read only" description="Evidence links are preserved from the import and are not edited here." />
        )}
      </div>
    </div>
  );
}
