import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, RotateCcw, Save, Send, SquarePen } from 'lucide-react';
import { EmptyState, OSCard, SOPCard, StatusBadge } from '../components/os';
import {
  createKnowledgeDraft,
  getKnowledgeEngineData,
  knowledgeOriginLabel,
  previewText,
  publishKnowledgeVersion,
  saveKnowledgeDraft,
  type KnowledgeEngineData,
  type KnowledgeObject,
} from '../lib/knowledge';

interface SOPsPageProps {
  createRequestId?: number;
  initialSelectedId?: string | null;
  initialSelectedRequestId?: number;
  onOpenKnowledgeBase?: () => void;
}

function sortByUpdated(a: KnowledgeObject, b: KnowledgeObject): number {
  return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
}

function starterDraftTitle(): string {
  return 'Untitled SOP';
}

function starterDraftBody(): string {
  return 'Draft shell — fill with Delikat procedure.';
}

export function SOPsPage({
  createRequestId,
  initialSelectedId,
  initialSelectedRequestId,
  onOpenKnowledgeBase,
}: SOPsPageProps = {}): JSX.Element {
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [queryRequest, setQueryRequest] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [draftStatus, setDraftStatus] = useState<string>('draft');
  const [notice, setNotice] = useState<string | null>(null);

  const loadKnowledge = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeEngineData();
      setKnowledge(data);
      setSelectedId((current) => current ?? data.objects.find((object) => object.sourceType === 'user_created')?.id ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SOPs could not load live Supabase data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadKnowledge();
  }, []);

  useEffect(() => {
    if (typeof createRequestId !== 'number' || createRequestId === queryRequest) return;
    setQueryRequest(createRequestId);
    void (async () => {
      setIsSaving(true);
      setError(null);
      try {
        const created = await createKnowledgeDraft({
          title: starterDraftTitle(),
          summary: 'Draft shell — fill with Delikat procedure.',
          body: starterDraftBody(),
        });
        await loadKnowledge();
        setSelectedId(created.knowledge.id);
        setNotice('New SOP draft created.');
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'New SOP draft could not be created.');
      } finally {
        setIsSaving(false);
      }
    })();
  }, [createRequestId, queryRequest]);

  useEffect(() => {
    if (typeof initialSelectedRequestId !== 'number') return;
    setSelectedId(initialSelectedId ?? null);
  }, [initialSelectedId, initialSelectedRequestId]);

  const drafts = useMemo(
    () =>
      knowledge
        ? knowledge.objects
            .filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved')
            .sort(sortByUpdated)
        : [],
    [knowledge],
  );

  const selectedObject = useMemo(
    () => knowledge?.objects.find((object) => object.id === selectedId) ?? drafts[0] ?? null,
    [drafts, knowledge, selectedId],
  );

  useEffect(() => {
    if (!selectedObject) return;
    setEditorTitle(selectedObject.title);
    setEditorSummary(selectedObject.summary ?? '');
    setEditorBody(selectedObject.approvedVersion.body);
    setEditorNotes(selectedObject.approvedVersion.notes ?? '');
    setDraftStatus(selectedObject.approvedVersion.status);
  }, [selectedObject]);

  const canEdit = selectedObject?.sourceType === 'user_created' || selectedObject?.status !== 'active' || selectedObject?.approvedVersion.status !== 'approved';

  async function handleSaveDraft(): Promise<void> {
    if (!selectedObject) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveKnowledgeDraft({
        knowledgeId: selectedObject.id,
        title: editorTitle.trim(),
        summary: editorSummary.trim(),
        body: editorBody,
        notes: editorNotes.trim() || undefined,
        sourceVersionId: selectedObject.currentApprovedVersionId ?? selectedObject.approvedVersion.id,
      });
      await loadKnowledge();
      setSelectedId(selectedObject.id);
      setNotice('Draft saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Draft could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(): Promise<void> {
    if (!selectedObject) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await publishKnowledgeVersion({
        knowledgeId: selectedObject.id,
        title: editorTitle.trim(),
        summary: editorSummary.trim(),
        body: editorBody,
        notes: editorNotes.trim() || undefined,
        sourceVersionId: selectedObject.currentApprovedVersionId ?? selectedObject.approvedVersion.id,
      });
      await loadKnowledge();
      setSelectedId(selectedObject.id);
      setNotice('SOP published.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SOP could not be published.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreate(): Promise<void> {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createKnowledgeDraft({
        title: starterDraftTitle(),
        summary: 'Draft shell — fill with Delikat procedure.',
        body: starterDraftBody(),
      });
      await loadKnowledge();
      setSelectedId(created.knowledge.id);
      setNotice('New SOP draft created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'New SOP draft could not be created.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="pageStack sopPage">
      <div className="sectionHeader">
        <div>
          <h2>SOPs</h2>
          <p>Create, edit, and publish clean SOP drafts from a simple studio workspace.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
          <button className="iconTextButton" onClick={() => void loadKnowledge()} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Retry
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="notice success">
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="sopWorkspaceLayout">
        <aside className="sopWorkspaceSidebar">
          <OSCard className="sopWorkspaceCard">
            <div className="workspaceSectionHeader">
              <div>
                <h3>Drafts</h3>
                <p>Only user-created and in-progress SOPs live here.</p>
              </div>
            </div>
            <div className="sopWorkspaceActions">
              <button className="iconTextButton primary" onClick={() => void handleCreate()} type="button" disabled={isSaving}>
                <Plus aria-hidden="true" size={16} />
                New SOP
              </button>
              <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                <BookOpen aria-hidden="true" size={16} />
                Open Knowledge Base
              </button>
            </div>
          </OSCard>

          <div className="sopWorkspaceList">
            {isLoading && !knowledge ? (
              <EmptyState icon={SquarePen} title="Loading SOPs" description="Pulling live draft data from Supabase." />
            ) : drafts.length > 0 ? (
              drafts.map((object) => (
                <SOPCard
                  key={object.id}
                  onClick={() => setSelectedId(object.id)}
                  selected={object.id === selectedId}
                  title={object.title}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 96)}
                  sourceLabel={knowledgeOriginLabel(object)}
                  sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle}`}
                  status={object.status}
                  statusLabel={object.approvedVersion.status === 'approved' ? 'Ready' : 'Draft'}
                  action={
                    <button className="tableLink" onClick={() => setSelectedId(object.id)} type="button">
                      Open
                    </button>
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={SquarePen}
                title="No drafts yet"
                description="Create or edit an SOP to start a draft list."
                action={
                  <button className="iconTextButton primary" onClick={() => void handleCreate()} type="button" disabled={isSaving}>
                    <Plus aria-hidden="true" size={16} />
                    New SOP
                  </button>
                }
              />
            )}
          </div>
        </aside>

        <main className="sopWorkspaceEditor">
          {selectedObject ? (
            <OSCard className="sopEditorCard">
              <div className="workspaceDocumentHeader">
                <div>
                  <div className="workspaceDocumentBadges">
                    <StatusBadge status={draftStatus} />
                    <StatusBadge status={selectedObject.sourceType === 'user_created' ? 'draft' : selectedObject.status} label={knowledgeOriginLabel(selectedObject)} />
                  </div>
                  <h3>{editorTitle}</h3>
                  <p>{editorSummary || 'Draft shell — fill with Delikat procedure.'}</p>
                </div>
                <div className="detailHeaderActions">
                  <button className="iconTextButton" onClick={() => setSelectedId(null)} type="button">
                    <RotateCcw aria-hidden="true" size={16} />
                    Cancel
                  </button>
                  <button className="iconTextButton" onClick={() => void handleSaveDraft()} type="button" disabled={isSaving || !canEdit}>
                    <Save aria-hidden="true" size={16} />
                    Save Draft
                  </button>
                  <button className="iconTextButton primary" onClick={() => void handlePublish()} type="button" disabled={isSaving || !canEdit}>
                    <Send aria-hidden="true" size={16} />
                    Publish
                  </button>
                </div>
              </div>

              {!canEdit ? (
                <div className="workspaceDraftBanner">Imported SOPs are read-only in the list. Edit into a clean SOP draft to save changes.</div>
              ) : null}

              <div className="sopEditorFields">
                <label className="textField">
                  <span>Title</span>
                  <input value={editorTitle} onChange={(event) => setEditorTitle(event.target.value)} />
                </label>
                <label className="textField">
                  <span>Summary</span>
                  <input value={editorSummary} onChange={(event) => setEditorSummary(event.target.value)} />
                </label>
                <label className="textAreaField sopEditorBodyField">
                  <span>Body</span>
                  <textarea rows={14} value={editorBody} onChange={(event) => setEditorBody(event.target.value)} />
                </label>
                <label className="textAreaField">
                  <span>Notes</span>
                  <textarea rows={5} value={editorNotes} onChange={(event) => setEditorNotes(event.target.value)} />
                </label>
              </div>

              <details className="workspaceCollapsiblePanel">
                <summary>Version history</summary>
                <div className="workspaceCollapsibleBody">
                  {selectedObject.versions
                    .slice()
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <div className="knowledgeVersionItem" key={version.id}>
                        <div>
                          <strong>v{version.versionNumber}</strong>
                          <p>{version.title ?? selectedObject.title}</p>
                        </div>
                        <span>{version.status}</span>
                      </div>
                    ))}
                </div>
              </details>
            </OSCard>
          ) : (
            <EmptyState
              icon={SquarePen}
              title="Select an SOP to edit"
              description="Use the list on the left to open a draft, or create a new SOP to begin."
              action={
                <button className="iconTextButton primary" onClick={handleCreate} type="button">
                  <Plus aria-hidden="true" size={16} />
                  New SOP
                </button>
              }
            />
          )}
        </main>
      </div>
    </section>
  );
}
