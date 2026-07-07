import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Archive, Edit3, History, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import {
  KnowledgeGapCard,
  LinkedKnowledgePanel,
  SOPCard,
  SOPRelatedKnowledge,
  SOPStepList,
  SOPEvidencePanel,
  StatusBadge,
} from '../os';
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

interface DraftStep {
  id: string;
  title: string;
  notes: string;
  sourceSectionId: string | null;
  sourceSectionHeading: string | null;
  sourceSectionBody: string;
  isCustom: boolean;
}

function coverageForObject(object: KnowledgeObject, coverage: KnowledgeCoverageSummary | null): {
  coveragePercent: number;
  label: string;
  detail: string;
  missingCount: number;
} {
  if (!coverage) {
    return {
      coveragePercent: 0,
      label: 'Coverage not loaded',
      detail: 'Approved SOP coverage is loading.',
      missingCount: 0,
    };
  }

  const matches = [...coverage.missing, ...coverage.satisfied].filter((result) =>
    result.matchedObjects.some((matched) => matched.id === object.id),
  );
  if (matches.length === 0) {
    return {
      coveragePercent: 0,
      label: 'Missing SOP coverage',
      detail: 'This SOP is not mapped to any training requirement yet.',
      missingCount: 0,
    };
  }

  const satisfiedCount = matches.filter((result) => result.status === 'satisfied').length;
  const missingCount = matches.filter((result) => result.status === 'missing').length;
  const coveragePercent = Math.round((satisfiedCount / matches.length) * 100);

  return {
    coveragePercent,
    label: missingCount > 0 ? 'Coverage gaps remain' : 'Coverage ready',
    detail:
      missingCount > 0
        ? `${missingCount} training requirement${missingCount === 1 ? '' : 's'} still need approved SOP support.`
        : 'All mapped training requirements are covered by approved SOPs.',
    missingCount,
  };
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

function linkedTrainingItems(
  paths: TrainingPath[],
  onOpenTraining?: () => void,
): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string; action?: JSX.Element }> {
  return paths.map((path) => ({
    id: path.id,
    title: path.title,
    subtitle: path.role?.name ?? path.department?.name ?? 'Training path',
    preview: `${path.items.length} items · ${path.coveragePercent}% covered`,
    status: path.missingItemCount > 0 ? 'blocked' : path.status,
    notes: path.missingItemCount > 0 ? `${path.missingItemCount} missing training items` : `${path.linkedKnowledgeCount} linked SOPs`,
    action: onOpenTraining ? (
      <button className="tableLink" onClick={onOpenTraining} type="button">
        Review training
      </button>
    ) : undefined,
  }));
}

function linkedChecklistItems(
  templates: ChecklistTemplate[],
  onOpenChecklists?: () => void,
): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string; action?: JSX.Element }> {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    subtitle: template.role?.title ?? template.process?.name ?? 'Checklist template',
    preview: `${template.itemCount} items · ${template.coveragePercent}% covered`,
    status: template.missingKnowledgeCount > 0 ? 'blocked' : template.status,
    notes: template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} missing SOP links` : `${template.linkedKnowledgeCount} linked SOPs`,
    action: onOpenChecklists ? (
      <button className="tableLink" onClick={onOpenChecklists} type="button">
        Review checklist
      </button>
    ) : undefined,
  }));
}

function linkedAuditItems(
  templates: AuditTemplate[],
  onOpenAudits?: () => void,
): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string; action?: JSX.Element }> {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    subtitle: template.checklistTemplate?.role?.title ?? template.auditType,
    preview: `${template.itemCount} items · ${template.coveragePercent}% covered`,
    status: template.missingKnowledgeCount > 0 ? 'blocked' : template.status,
    notes: template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} missing SOP links` : `${template.linkedKnowledgeCount} linked SOPs`,
    action: onOpenAudits ? (
      <button className="tableLink" onClick={onOpenAudits} type="button">
        Review audit
      </button>
    ) : undefined,
  }));
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

type KnowledgeVersionSnapshot = KnowledgeObject['versions'][number] | KnowledgeObject['approvedVersion'];

function buildDraftFromVersion(version: KnowledgeVersionSnapshot, object: KnowledgeObject): DraftState {
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

function buildDraftSteps(sourceSections: KnowledgeManual['sections']): DraftStep[] {
  return sourceSections.map((section) => ({
    id: section.id,
    title: section.heading,
    notes: previewText(section.body, 160),
    sourceSectionId: section.id,
    sourceSectionHeading: section.heading,
    sourceSectionBody: section.body,
    isCustom: false,
  }));
}

function createCustomDraftStep(): DraftStep {
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `draft-step-${Date.now()}`,
    title: '',
    notes: '',
    sourceSectionId: null,
    sourceSectionHeading: null,
    sourceSectionBody: '',
    isCustom: true,
  };
}

function moveDraftStep(steps: DraftStep[], index: number, delta: number): DraftStep[] {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= steps.length) return steps;
  const next = [...steps];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function sourceLabelForVersion(version: KnowledgeObject['versions'][number], object: KnowledgeObject): string {
  return version.title ?? object.title;
}

function versionHistoryGroup(version: KnowledgeObject['versions'][number], currentApprovedVersionId: string): 'current' | 'draft' | 'published' | 'archived' {
  if (version.id === currentApprovedVersionId) return 'current';
  if (version.status === 'approved') return 'published';
  if (version.status === 'draft' || version.status === 'in_review') return 'draft';
  return 'archived';
}

export function SOPPreview({
  object,
  manual,
  sourceSections,
  coverage,
  relatedSOPs,
  trainingPaths,
  checklistTemplates,
  auditTemplates,
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
  onRefresh,
}: SOPPreviewProps): JSX.Element {
  const coverageSummary = useMemo(() => (object ? coverageForObject(object, coverage) : null), [coverage, object]);
  const evidenceRef = useRef<HTMLElement | null>(null);
  const trainingRef = useRef<HTMLElement | null>(null);
  const checklistRef = useRef<HTMLElement | null>(null);
  const auditRef = useRef<HTMLElement | null>(null);
  const relatedRef = useRef<HTMLElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>(() => buildDraftSteps(sourceSections));
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeVersion = useMemo(() => {
    if (!object) return null;
    return object.versions.find((version) => version.id === object.currentApprovedVersionId) ?? object.approvedVersion;
  }, [object]);

  const latestEditableVersion = useMemo(() => {
    if (!object) return null;
    return [...object.versions].find((version) => version.status === 'draft' || version.status === 'in_review') ?? activeVersion;
  }, [activeVersion, object]);

  useEffect(() => {
    if (!object) {
      setEditMode(false);
      setDraft(null);
      setDraftSteps([]);
      setFeedback(null);
      setError(null);
      return;
    }

    setEditMode(false);
    setFeedback(null);
    setError(null);
    setDraft(buildDraftFromVersion(latestEditableVersion ?? object.approvedVersion, object));
    setDraftSteps(buildDraftSteps(sourceSections));
  }, [object?.id]);

  function openSection(section: 'evidence' | 'training' | 'checklists' | 'audits' | 'related'): void {
    const target = {
      evidence: evidenceRef.current,
      training: trainingRef.current,
      checklists: checklistRef.current,
      audits: auditRef.current,
      related: relatedRef.current,
    }[section];
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function beginEdit(): void {
    if (!draft) return;
    setEditMode(true);
    setFeedback(null);
    setError(null);
  }

  function cancelEdit(): void {
    if (!object) return;
    setDraft(buildDraftFromVersion(latestEditableVersion ?? object.approvedVersion, object));
    setDraftSteps(buildDraftSteps(sourceSections));
    setEditMode(false);
    setFeedback('Draft changes were discarded.');
    setError(null);
  }

  function updateDraftStep(stepId: string, updater: (step: DraftStep) => DraftStep): void {
    setDraftSteps((current) => current.map((step) => (step.id === stepId ? updater(step) : step)));
  }

  function removeDraftStep(stepId: string): void {
    setDraftSteps((current) => current.filter((step) => step.id !== stepId));
  }

  function addDraftStep(): void {
    setDraftSteps((current) => [...current, createCustomDraftStep()]);
  }

  async function refreshWorkspace(): Promise<void> {
    if (onRefresh) await onRefresh();
  }

  async function persistVersion(action: 'draft' | 'publish'): Promise<void> {
    if (!object || !draft) return;
    setIsSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const result =
        action === 'draft'
          ? await saveKnowledgeDraft({
              knowledgeId: object.id,
              title: draft.title,
              summary: draft.summary,
              body: draft.body,
              notes: draft.notes,
              sourceVersionId: draft.sourceVersionId,
            })
          : await publishKnowledgeVersion({
              knowledgeId: object.id,
              title: draft.title,
              summary: draft.summary,
              body: draft.body,
              notes: draft.notes,
              sourceVersionId: draft.sourceVersionId,
            });

      setEditMode(false);
      setFeedback(action === 'draft' ? 'Draft saved as a new version.' : 'Version published and promoted to current approval.');
      setDraft((current) =>
        current
          ? {
              ...current,
              sourceVersionId: result.versionId,
              status: action === 'publish' ? 'approved' : 'draft',
            }
          : current,
      );
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Knowledge version update failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCurrent(): Promise<void> {
    if (!object) return;
    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await archiveKnowledgeVersion({
        knowledgeId: object.id,
        title: draft?.title ?? activeVersion?.title ?? object.title,
        summary: draft?.summary ?? activeVersion?.summary ?? object.summary ?? '',
        body: draft?.body ?? activeVersion?.body ?? object.approvedVersion.body,
        notes: draft?.notes ?? activeVersion?.notes ?? '',
        sourceVersionId: draft?.sourceVersionId ?? activeVersion?.id ?? object.currentApprovedVersionId,
      });
      setEditMode(false);
      setFeedback('SOP archived.');
      setDraft((current) => (current ? { ...current, status: 'archived', sourceVersionId: result.versionId } : current));
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Knowledge archive failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreVersion(version: KnowledgeObject['versions'][number]): Promise<void> {
    if (!object) return;
    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await restoreKnowledgeVersion({
        knowledgeId: object.id,
        title: version.title ?? object.title,
        summary: version.summary ?? object.summary ?? '',
        body: version.body,
        notes: version.notes ?? '',
        sourceVersionId: version.id,
      });

      setDraft({
        title: version.title ?? object.title,
        summary: version.summary ?? object.summary ?? '',
        body: version.body,
        notes: version.notes ?? '',
        category: object.category,
        tags: object.ontology.tags.map((tag) => tag.name).join(', '),
        status: version.status,
        sourceVersionId: result.versionId,
      });
      setDraftSteps(buildDraftSteps(sourceSections));
      setEditMode(true);
      setFeedback('Previous version restored into a new draft.');
      await refreshWorkspace();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Knowledge restore failed.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!object) {
    return (
      <section className="workspacePreviewPanel">
        <div className="workspaceSectionHeader">
          <div>
            <h3>SOP preview</h3>
            <p>Select a SOP to review its live knowledge context.</p>
          </div>
        </div>
        <div className="workspaceEmpty">No SOP is selected yet.</div>
      </section>
    );
  }

  const title = editMode ? draft?.title ?? object.title : activeVersion?.title ?? object.title;
  const summary = editMode ? draft?.summary ?? object.summary ?? '' : activeVersion?.summary ?? object.summary ?? '';
  const body = editMode ? draft?.body ?? activeVersion?.body ?? object.approvedVersion.body : activeVersion?.body ?? object.approvedVersion.body;
  const notes = editMode ? draft?.notes ?? '' : activeVersion?.notes ?? '';
  const category = editMode ? draft?.category ?? object.category : object.category;
  const tags = editMode ? draft?.tags ?? object.ontology.tags.map((tag) => tag.name).join(', ') : object.ontology.tags.map((tag) => tag.name).join(', ');
  const linkedTraining = linkedTrainingItems(trainingPaths, onOpenTraining);
  const linkedChecklists = linkedChecklistItems(checklistTemplates, onOpenChecklists);
  const linkedAudits = linkedAuditItems(auditTemplates, onOpenAudits);
  const currentVersion = activeVersion ?? object.approvedVersion;
  const history = [...object.versions].sort((a, b) => b.versionNumber - a.versionNumber);

  const steps = sourceSections.map((section, index) => ({
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
  }));

  return (
    <section className="workspacePreviewPanel">
        <div className="workspaceSectionHeader">
          <div>
            <h3>SOP preview</h3>
            <p>Read-only source evidence stays intact while editable versions are captured as safe snapshots.</p>
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
                Save draft
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
          <button className="iconTextButton" onClick={() => openSection('evidence')} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            Open source evidence
          </button>
          <button className="iconTextButton" onClick={() => openSection('training')} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            View training
          </button>
          <button className="iconTextButton" onClick={() => openSection('checklists')} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            View checklist
          </button>
          <button className="iconTextButton" onClick={() => openSection('audits')} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            View audit
          </button>
        </div>
      </div>

      <SOPCard
        coverageLabel={coverageSummary?.label ?? undefined}
        coveragePercent={coverageSummary?.coveragePercent}
        metadata={[
          { label: 'Source manual', value: manual?.title ?? object.manualTitle ?? 'Unassigned' },
          { label: 'Manual code', value: manual?.manualCode ?? object.manualCode ?? 'Unassigned' },
          { label: 'Updated', value: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(object.updatedAt)) },
          { label: 'Version', value: `v${currentVersion.versionNumber}` },
          { label: 'Version status', value: versionLabel(currentVersion.status) },
        ]}
        sourceDetail={object.sourceFileUri}
        sourceLabel="Approved SOP"
        status={object.status}
        summary={summary || previewText(body, 220)}
        title={title}
      >
        <div className="workspacePreviewIntro">
          <div>
            <span>Purpose</span>
            <p>{summary || previewText(body, 240)}</p>
          </div>
          <div>
            <span>Summary</span>
            <p>{previewText(body, 300)}</p>
          </div>
        </div>
        <div className="workspaceDraftBanner">
          Editing is backed by version snapshots. Title, summary, body, and notes are saved. Category, tags, and structured steps stay local until ontology and step versioning exist. Source evidence remains immutable.
          Current local context: {category}
          {tags ? ` · ${tags}` : ''}.
        </div>
        {editMode && draft ? (
          <div className="workspaceDraftEditor">
            <label>
              <span>Title</span>
              <input onChange={(event) => setDraft({ ...draft, title: event.target.value })} value={draft.title} />
            </label>
            <label>
              <span>Summary</span>
              <textarea onChange={(event) => setDraft({ ...draft, summary: event.target.value })} value={draft.summary} rows={4} />
            </label>
            <label>
              <span>Purpose / body</span>
              <textarea onChange={(event) => setDraft({ ...draft, body: event.target.value })} value={draft.body} rows={10} />
            </label>
            <label>
              <span>Notes</span>
              <textarea onChange={(event) => setDraft({ ...draft, notes: event.target.value })} value={draft.notes} rows={3} />
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
              <small className="workspaceDraftHint">Status follows the draft, publish, and archive actions.</small>
            </label>
            {notes ? (
              <div className="workspaceDraftNotes">
                <span>Current notes</span>
                <p>{notes}</p>
              </div>
            ) : null}
            <div className="workspaceStructuredSteps">
              <div className="workspaceStructuredStepsHeader">
                <div>
                  <span>Structured draft steps</span>
                  <p>These steps are local-only until step versions are stored with the SOP version.</p>
                </div>
                <button className="iconTextButton" onClick={addDraftStep} type="button" disabled={isSaving}>
                  <Plus aria-hidden="true" size={16} />
                  Add step
                </button>
              </div>
              {draftSteps.length === 0 ? (
                <div className="workspaceDraftNotes">
                  <span>No draft steps yet</span>
                  <p>Add a local step draft from the source sections or create a new blank step for planning.</p>
                </div>
              ) : (
                <div className="workspaceStructuredStepList">
                  {draftSteps.map((step, index) => {
                    const canMoveUp = index > 0;
                    const canMoveDown = index < draftSteps.length - 1;
                    return (
                      <div className="workspaceStructuredStepCard" key={step.id}>
                        <div className="workspaceStructuredStepHeader">
                          <div>
                            <strong>{step.title || step.sourceSectionHeading || 'Draft step'}</strong>
                            <p>{step.isCustom ? 'Local draft step' : 'Imported source section'}</p>
                          </div>
                          <div className="workspaceStructuredStepActions">
                            <button
                              className="iconTextButton"
                              onClick={() => setDraftSteps((current) => moveDraftStep(current, index, -1))}
                              type="button"
                              disabled={isSaving || !canMoveUp}
                            >
                              <ArrowUp aria-hidden="true" size={14} />
                              Up
                            </button>
                            <button
                              className="iconTextButton"
                              onClick={() => setDraftSteps((current) => moveDraftStep(current, index, 1))}
                              type="button"
                              disabled={isSaving || !canMoveDown}
                            >
                              <ArrowDown aria-hidden="true" size={14} />
                              Down
                            </button>
                            <button className="iconTextButton" onClick={() => removeDraftStep(step.id)} type="button" disabled={isSaving}>
                              <Trash2 aria-hidden="true" size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="workspaceStructuredStepFields">
                          <label>
                            <span>Step title</span>
                            <input
                              onChange={(event) =>
                                updateDraftStep(step.id, (current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              value={step.title}
                              placeholder="Add a clear step title"
                            />
                          </label>
                          <label>
                            <span>Step notes</span>
                            <textarea
                              onChange={(event) =>
                                updateDraftStep(step.id, (current) => ({
                                  ...current,
                                  notes: event.target.value,
                                }))
                              }
                              value={step.notes}
                              placeholder="Add notes for this draft step"
                              rows={3}
                            />
                          </label>
                        </div>
                        <div className="workspaceStructuredStepMeta">
                          <span>{step.isCustom ? 'Local draft only' : 'From imported source'}</span>
                          {step.sourceSectionHeading ? <strong>{step.sourceSectionHeading}</strong> : <strong>No source heading yet</strong>}
                        </div>
                        {step.sourceSectionBody ? (
                          <pre className="workspaceStructuredStepSource">{step.sourceSectionBody}</pre>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SOPCard>

      {coverageSummary && coverageSummary.missingCount > 0 ? (
        <KnowledgeGapCard
          action={<span className="quietText">Review the related SOPs and training links below.</span>}
          coveragePercent={coverageSummary.coveragePercent}
          description="This SOP still has training requirements that are not fully supported by approved knowledge."
          detail={coverageSummary.detail}
          title={coverageSummary.label}
        />
      ) : null}

      <SOPStepList emptyLabel="No source sections are visible for this SOP." items={steps} title="Steps" />

      <section className="detailSection" ref={evidenceRef}>
        <h4>Evidence</h4>
        <div className="workspaceImmutableBanner">Source evidence is immutable and remains read-only so traceability is never lost.</div>
        <SOPEvidencePanel emptyLabel="No source evidence is visible for this SOP." evidence={evidenceToItems(object.evidence)} title="Source evidence" />
      </section>

      <section className="detailSection" ref={relatedRef}>
        <h4>Related SOPs</h4>
        <SOPRelatedKnowledge
          emptyLabel="No related SOPs are visible yet."
          items={relatedSOPs.map((item) => ({
            id: `${item.direction}:${item.relationship.id}`,
            title: item.object.title,
            subtitle: item.relationship.typeName,
            summary: item.object.manualTitle,
            status: item.object.status,
            notes: item.relationship.notes ?? item.object.manualCode ?? undefined,
          }))}
          title="Related SOPs"
        />
      </section>

      <section className="detailSection" ref={trainingRef}>
        <h4>Training</h4>
        <LinkedKnowledgePanel emptyLabel="No related training paths are visible yet." items={linkedTraining} title="Training" />
      </section>

      <section className="detailSection" ref={checklistRef}>
        <h4>Checklist</h4>
        <LinkedKnowledgePanel emptyLabel="No related checklists are visible yet." items={linkedChecklists} title="Checklist" />
      </section>

      <section className="detailSection" ref={auditRef}>
        <h4>Audit</h4>
        <LinkedKnowledgePanel emptyLabel="No related audits are visible yet." items={linkedAudits} title="Audit" />
      </section>

      <section className="detailSection">
        <div className="workspaceHistoryHeader">
          <div>
            <h4>
              <History aria-hidden="true" size={16} />
              History
            </h4>
            <p>Version, date, author, and status are preserved for every change.</p>
          </div>
          <div className="quietText">{currentVersion.title ?? object.title}</div>
        </div>
        <div className="workspaceHistoryGroups">
          {[
            {
              key: 'current',
              title: 'Current version',
              description: 'This is the active approved SOP version.',
              items: history.filter((version) => version.id === object.currentApprovedVersionId),
            },
            {
              key: 'draft',
              title: 'Draft versions',
              description: 'Working copies that have not been published yet.',
              items: history.filter((version) => versionHistoryGroup(version, object.currentApprovedVersionId) === 'draft'),
            },
            {
              key: 'published',
              title: 'Published versions',
              description: 'Previously approved versions that are no longer current.',
              items: history.filter((version) => versionHistoryGroup(version, object.currentApprovedVersionId) === 'published'),
            },
            {
              key: 'archived',
              title: 'Archived versions',
              description: 'Versions that were archived for reference.',
              items: history.filter((version) => versionHistoryGroup(version, object.currentApprovedVersionId) === 'archived'),
            },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
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
                    const isCurrent = version.id === object.currentApprovedVersionId;
                    const displayTitle = sourceLabelForVersion(version, object);
                    return (
                      <SOPCard
                        key={version.id}
                        className={isCurrent ? 'workspaceHistoryCard current' : 'workspaceHistoryCard'}
                        metadata={[
                          { label: 'Version', value: `v${version.versionNumber}` },
                          { label: 'Date', value: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(version.updatedAt)) },
                          { label: 'Author', value: versionAuthorLabel(version) },
                        ]}
                        sourceDetail={isCurrent ? 'Current published version' : versionLabel(version.status)}
                        sourceLabel={isCurrent ? 'Published' : 'Version'}
                        status={version.status}
                        summary={previewText(version.summary ?? version.body, 180)}
                        title={displayTitle}
                        action={
                          isCurrent ? (
                            <button className="tableLink" onClick={beginEdit} type="button" disabled={isSaving}>
                              Edit current
                            </button>
                          ) : (
                            <button className="tableLink" onClick={() => void restoreVersion(version)} type="button" disabled={isSaving}>
                              <RotateCcw aria-hidden="true" size={14} />
                              Restore previous version
                            </button>
                          )
                        }
                      >
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
    </section>
  );
}
