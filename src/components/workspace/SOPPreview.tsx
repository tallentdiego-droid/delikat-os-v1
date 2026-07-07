import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Archive, Edit3, History, Plus, RotateCcw, Save, X } from 'lucide-react';
import { EmptyState, SOPCard, SOPStepList, SOPEvidencePanel, StatusBadge } from '../os';
import {
  archiveKnowledgeVersion,
  publishKnowledgeVersion,
  restoreKnowledgeVersion,
  saveKnowledgeDraft,
  previewText,
  type KnowledgeCoverageSummary,
  type KnowledgeEvidence,
  type KnowledgeManual,
  type KnowledgeObject,
  type KnowledgeRelatedObject,
} from '../../lib/knowledge';
import type { TrainingPath } from '../../lib/training';
import type { ChecklistTemplate } from '../../lib/checklists';
import type { AuditTemplate } from '../../lib/audits';

interface SOPPreviewProps {
  object: KnowledgeObject | null;
  manual: KnowledgeManual | null;
  sourceSections: KnowledgeManual['sections'];
  coverage: KnowledgeCoverageSummary | null;
  relatedSOPs: KnowledgeRelatedObject[];
  trainingPaths: TrainingPath[];
  checklistTemplates: ChecklistTemplate[];
  auditTemplates: AuditTemplate[];
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
  onRefresh?: () => Promise<void> | void;
  onLocalObjectChange?: (object: KnowledgeObject) => void;
}

interface DraftState {
  title: string;
  summary: string;
  body: string;
  notes: string;
  category: string;
  tags: string;
  status: string;
  sourceVersionId: string | null;
}

function sourceBadgeLabel(object: KnowledgeObject): string {
  if (object.sourceType === 'user_created') return 'User-created';
  return object.versions.length > 1 ? 'Edited' : 'Imported';
}

function versionLabel(status: string): string {
  if (status === 'approved') return 'Published';
  if (status === 'deprecated' || status === 'archived') return 'Archived';
  if (status === 'in_review') return 'In review';
  return 'Draft';
}

function versionAuthorLabel(version: KnowledgeObject['versions'][number]): string {
  if (version.authorLabel) return version.authorLabel;
  if (version.authoredBy) return 'Recorded author';
  return 'System';
}

function buildDraftFromVersion(version: KnowledgeObject['versions'][number], object: KnowledgeObject): DraftState {
  return {
    title: version.title ?? object.title,
    summary: version.summary ?? object.summary ?? '',
    body: version.body,
    notes: version.notes ?? '',
    category: object.category,
    tags: object.ontology.tags.map((tag) => tag.name).join(', '),
    status: version.status,
    sourceVersionId: version.id,
  };
}

function evidenceToItems(evidence: KnowledgeEvidence[]): Array<{
  id: string;
  sourceManualTitle: string;
  sourceFileUri: string;
  sourceSectionHeading: string;
  sourceSectionBody: string;
  sourceSectionHash: string;
}> {
  return evidence.map((item) => ({
    id: item.id,
    sourceManualTitle: item.sourceManualTitle,
    sourceFileUri: item.sourceFileUri,
    sourceSectionHeading: item.sourceSectionHeading,
    sourceSectionBody: item.sourceSectionBody,
    sourceSectionHash: item.sourceSectionHash,
  }));
}

type VersionGroup = 'current' | 'draft' | 'published' | 'archived';

function versionGroup(version: KnowledgeObject['versions'][number], currentVersionId: string | null): VersionGroup {
  if (currentVersionId && version.id === currentVersionId) return 'current';
  if (version.status === 'approved') return 'published';
  if (version.status === 'draft' || version.status === 'in_review') return 'draft';
  return 'archived';
}

export function SOPPreview({
  object,
  manual,
  sourceSections,
  onRefresh,
  onLocalObjectChange,
}: SOPPreviewProps): JSX.Element {
  const evidenceRef = useRef<HTMLElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeVersion = useMemo(() => {
    if (!object) return null;
    return object.versions.find((version) => version.id === object.currentApprovedVersionId) ?? object.approvedVersion;
  }, [object]);

  const currentVersion = activeVersion ?? object?.approvedVersion ?? null;
  const history = useMemo(() => (object ? [...object.versions].sort((a, b) => b.versionNumber - a.versionNumber) : []), [object]);

  useEffect(() => {
    if (!object) {
      setEditMode(false);
      setDraft(null);
      setFeedback(null);
      setError(null);
      return;
    }

    setEditMode(false);
    setDraft(buildDraftFromVersion(currentVersion ?? object.approvedVersion, object));
    setFeedback(null);
    setError(null);
  }, [object, currentVersion]);

  if (!object) {
    return (
      <section className="workspacePreviewPanel">
        <div className="workspaceSectionHeader workspaceDocumentHeader">
          <div>
            <h3>SOP preview</h3>
            <p>Select an SOP to review its live knowledge context.</p>
          </div>
        </div>
        <EmptyState title="Select an SOP to preview" description="Choose a folder or a SOP to open the readable document view, evidence, and version history." />
      </section>
    );
  }

  const sourceBadge = sourceBadgeLabel(object);
  const title = editMode ? draft?.title ?? object.title : currentVersion?.title ?? object.title;
  const summary = editMode ? draft?.summary ?? object.summary ?? '' : currentVersion?.summary ?? object.summary ?? '';
  const body = editMode ? draft?.body ?? currentVersion?.body ?? object.approvedVersion.body : currentVersion?.body ?? object.approvedVersion.body;
  const notes = editMode ? draft?.notes ?? '' : currentVersion?.notes ?? '';
  const tags = editMode ? draft?.tags ?? object.ontology.tags.map((tag) => tag.name).join(', ') : object.ontology.tags.map((tag) => tag.name).join(', ');
  const currentVersionId = currentVersion?.id ?? object.currentApprovedVersionId ?? null;

  const versionGroups: Array<{ key: VersionGroup; title: string; description: string; items: KnowledgeObject['versions'] }> = [
    {
      key: 'current',
      title: 'Current version',
      description: 'The version currently open in Studio.',
      items: history.filter((version) => version.id === currentVersionId),
    },
    {
      key: 'draft',
      title: 'Draft versions',
      description: 'Working copies that are not yet published.',
      items: history.filter((version) => versionGroup(version, currentVersionId) === 'draft'),
    },
    {
      key: 'published',
      title: 'Published versions',
      description: 'Approved versions kept for reference.',
      items: history.filter((version) => versionGroup(version, currentVersionId) === 'published'),
    },
    {
      key: 'archived',
      title: 'Archived versions',
      description: 'Archived versions kept for traceability.',
      items: history.filter((version) => versionGroup(version, currentVersionId) === 'archived'),
    },
  ].filter((group) => group.items.length > 0) as Array<{ key: VersionGroup; title: string; description: string; items: KnowledgeObject['versions'] }>;

  async function refreshWorkspace(): Promise<void> {
    if (onRefresh) await onRefresh();
  }

  function beginEdit(): void {
    if (!draft) return;
    setEditMode(true);
    setFeedback(null);
    setError(null);
  }

  function cancelEdit(): void {
    if (!object) return;
    setDraft(buildDraftFromVersion(currentVersion ?? object.approvedVersion, object));
    setEditMode(false);
    setFeedback('Draft changes were discarded.');
    setError(null);
  }

  async function persistVersion(action: 'draft' | 'publish'): Promise<void> {
    if (!object || !draft) return;
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      if (action === 'draft') {
        await saveKnowledgeDraft({
          knowledgeId: object.id,
          title: draft.title,
          summary: draft.summary,
          body: draft.body,
          notes: draft.notes,
          sourceVersionId: draft.sourceVersionId,
        });
      } else {
        await publishKnowledgeVersion({
          knowledgeId: object.id,
          title: draft.title,
          summary: draft.summary,
          body: draft.body,
          notes: draft.notes,
          sourceVersionId: draft.sourceVersionId,
        });
      }

      setFeedback(action === 'draft' ? 'Draft saved.' : 'Version published.');
      setEditMode(false);
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'SOP changes could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCurrent(): Promise<void> {
    if (!object || !draft) return;
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      await archiveKnowledgeVersion({
        knowledgeId: object.id,
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        notes: draft.notes,
        sourceVersionId: draft.sourceVersionId,
      });
      setFeedback('Version archived.');
      setEditMode(false);
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The version could not be archived.');
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreVersion(version: KnowledgeObject['versions'][number]): Promise<void> {
    if (!object || !draft) return;
    setIsSaving(true);
    setFeedback(null);
    setError(null);

    try {
      await restoreKnowledgeVersion({
        knowledgeId: object.id,
        title: version.title ?? object.title,
        summary: version.summary ?? object.summary ?? '',
        body: version.body,
        notes: version.notes ?? '',
        sourceVersionId: version.id,
      });
      setFeedback('Version restored.');
      setEditMode(false);
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The version could not be restored.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="workspacePreviewPanel workspacePreviewDocument">
      <div className="workspaceSectionHeader workspaceDocumentHeader">
        <div>
          <div className="workspaceDocumentBadges">
            <StatusBadge status={object.status} label={sourceBadge} />
          </div>
          <h3>{title}</h3>
          <p>{summary || previewText(body, 220)}</p>
          <div className="workspacePreviewSourceLine">
            <span>Source manual</span>
            <strong>{manual?.title ?? object.manualTitle ?? 'Unassigned'}</strong>
            <span>{manual?.sourceUri ?? object.sourceFileUri}</span>
          </div>
        </div>
        <div className="workspacePreviewActions">
          {feedback ? <StatusBadge status={draft?.status ?? 'draft'} label={feedback} /> : null}
          {error ? <span className="workspaceActionError">{error}</span> : null}
          {!editMode ? (
            <button className="iconTextButton" onClick={beginEdit} type="button" disabled={isSaving}>
              <Edit3 aria-hidden="true" size={16} />
              Edit SOP
            </button>
          ) : (
            <>
              <button className="iconTextButton" onClick={() => void persistVersion('draft')} type="button" disabled={isSaving}>
                <Save aria-hidden="true" size={16} />
                Save Draft
              </button>
              <button className="iconTextButton" onClick={() => void persistVersion('publish')} type="button" disabled={isSaving}>
                <ArrowRight aria-hidden="true" size={16} />
                Publish
              </button>
              <button className="iconTextButton" onClick={() => void archiveCurrent()} type="button" disabled={isSaving}>
                <Archive aria-hidden="true" size={16} />
                Archive
              </button>
              <button className="iconTextButton" onClick={cancelEdit} type="button" disabled={isSaving}>
                <X aria-hidden="true" size={16} />
                Cancel
              </button>
            </>
          )}
          <button className="iconTextButton" onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            Open source evidence
          </button>
        </div>
      </div>

      <div className="workspaceDocumentBody">
        <section className="workspaceDocumentPanel">
          <div className="workspaceSectionHeader">
            <div>
              <h4>Summary</h4>
              <p>What this SOP covers at a glance.</p>
            </div>
          </div>
          {editMode && draft ? (
            <label className="workspaceDraftEditor">
              <span>Summary</span>
              <textarea
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                value={draft.summary}
                rows={4}
              />
            </label>
          ) : (
            <p className="workspaceDocumentText">{summary || previewText(body, 240)}</p>
          )}
        </section>

        <section className="workspaceDocumentPanel">
          <div className="workspaceSectionHeader">
            <div>
              <h4>Purpose / Body</h4>
              <p>The readable SOP content for daily use.</p>
            </div>
          </div>
          {editMode && draft ? (
            <label className="workspaceDraftEditor">
              <span>Purpose / body</span>
              <textarea
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                value={draft.body}
                rows={12}
              />
            </label>
          ) : (
            <div className="workspaceDocumentBodyCopy">{body || 'No SOP body is visible yet.'}</div>
          )}
        </section>

        <section className="workspaceDocumentPanel">
          <div className="workspaceSectionHeader">
            <div>
              <h4>Steps</h4>
              <p>Imported source sections visible in the current SOP.</p>
            </div>
          </div>
          <SOPStepList emptyLabel="No source sections are visible for this SOP." items={sourceSections.map((section, index) => ({
            id: section.id,
            sequence: index + 1,
            title: section.heading,
            summary: previewText(section.body, 160),
            durationLabel: manual?.manualCode ?? manual?.title ?? 'Source section',
            status: section.knowledgeIds.includes(object.id) ? 'satisfied' : 'pending',
            notes: `Source hash ${section.contentHash}`,
            references: [
              { label: 'Manual', value: manual?.manualCode ?? manual?.title ?? object.manualCode ?? 'Source file' },
              { label: 'Source file', value: object.sourceFileUri },
            ],
          }))} title="Steps" />
        </section>

        {notes ? (
          <section className="workspaceDocumentPanel">
            <div className="workspaceSectionHeader">
              <div>
                <h4>Notes</h4>
                <p>Working notes for the current version.</p>
              </div>
            </div>
            {editMode && draft ? (
              <label className="workspaceDraftEditor">
                <span>Notes</span>
                <textarea onChange={(event) => setDraft({ ...draft, notes: event.target.value })} value={draft.notes} rows={3} />
              </label>
            ) : (
              <div className="workspaceNotesBody">{notes}</div>
            )}
          </section>
        ) : null}

        <section className="workspaceDocumentPanel">
          <div className="workspaceSectionHeader">
            <div>
              <h4>Tags</h4>
              <p>Organizational context linked to this SOP.</p>
            </div>
          </div>
          <div className="workspaceTagList">
            {tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
          </div>
        </section>

        <section className="workspaceDocumentPanel" ref={evidenceRef}>
          <div className="workspaceSectionHeader">
            <div>
              <h4>Source evidence</h4>
              <p>Original imported source — read only.</p>
            </div>
          </div>
          <div className="workspaceImmutableBanner">Original imported source — read only.</div>
          <SOPEvidencePanel emptyLabel="No source evidence is visible for this SOP." evidence={evidenceToItems(object.evidence)} title="Source evidence" />
        </section>

        <section className="workspaceDocumentPanel">
          <div className="workspaceHistoryHeader">
            <div>
              <h4>
                <History aria-hidden="true" size={16} />
                History
              </h4>
              <p>Version, date, author, and status are preserved for every change.</p>
            </div>
            <div className="quietText">{currentVersion?.title ?? object.title}</div>
          </div>

          <div className="workspaceHistoryGroups">
            {versionGroups.map((group) => (
              <div className="workspaceHistoryGroup" key={group.key}>
                <div className="workspaceHistoryGroupHeader">
                  <div>
                    <strong>{group.title}</strong>
                    <p>{group.description}</p>
                  </div>
                  <span>{group.items.length}</span>
                </div>
                <div className="workspaceHistoryList">
                  {group.items.map((version) => {
                    const isCurrent = version.id === currentVersionId;
                    return (
                      <SOPCard
                        key={version.id}
                        className={isCurrent ? 'workspaceHistoryCard current' : 'workspaceHistoryCard'}
                        sourceDetail={isCurrent ? (version.status === 'approved' ? 'Current approved version' : 'Current draft version') : versionLabel(version.status)}
                        sourceLabel={isCurrent ? 'Current version' : 'Version'}
                        status={version.status}
                        summary={previewText(version.summary ?? version.body, 180)}
                        title={version.title ?? object.title}
                        action={
                          isCurrent ? (
                            <button className="tableLink" onClick={beginEdit} type="button" disabled={isSaving}>
                              Edit Version
                            </button>
                          ) : (
                            <button className="tableLink" onClick={() => void restoreVersion(version)} type="button" disabled={isSaving}>
                              <RotateCcw aria-hidden="true" size={14} />
                              Restore Version
                            </button>
                          )
                        }
                      >
                        <div className="workspaceHistoryMeta">
                          <span>v{version.versionNumber}</span>
                          <span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(version.updatedAt))}</span>
                          <span>{versionAuthorLabel(version)}</span>
                        </div>
                        {version.notes ? <p className="sopDraftNotes">{version.notes}</p> : null}
                        <p className="sopVersionBody">{previewText(version.body, 260)}</p>
                      </SOPCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {editMode && draft ? (
          <section className="workspaceDocumentPanel">
            <div className="workspaceSectionHeader">
              <div>
                <h4>Edit draft</h4>
                <p>Change the draft content without touching the imported source evidence.</p>
              </div>
            </div>
            <div className="workspaceDraftEditor">
              <label>
                <span>Title</span>
                <input onChange={(event) => setDraft({ ...draft, title: event.target.value })} value={draft.title} />
              </label>
              <label>
                <span>Purpose / body</span>
                <textarea onChange={(event) => setDraft({ ...draft, body: event.target.value })} value={draft.body} rows={10} />
              </label>
              <div className="workspaceDraftSplit">
                <label>
                  <span>Category</span>
                  <input onChange={(event) => setDraft({ ...draft, category: event.target.value })} value={draft.category} />
                </label>
                <label>
                  <span>Tags</span>
                  <input onChange={(event) => setDraft({ ...draft, tags: event.target.value })} value={draft.tags} />
                </label>
              </div>
              <label>
                <span>Version status</span>
                <select disabled value={draft.status}>
                  <option value="draft">Draft</option>
                  <option value="in_review">In review</option>
                  <option value="approved">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
