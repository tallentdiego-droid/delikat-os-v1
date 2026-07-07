import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Edit3, ShieldAlert, Save, X } from 'lucide-react';
import { KnowledgeGapCard, LinkedKnowledgePanel, SOPCard, SOPRelatedKnowledge, SOPStepList, SOPEvidencePanel, StatusBadge } from '../os';
import type {
  KnowledgeCoverageSummary,
  KnowledgeEvidence,
  KnowledgeManual,
  KnowledgeObject,
  KnowledgeRelatedObject,
} from '../../lib/knowledge';
import type { TrainingPath } from '../../lib/training';
import type { ChecklistTemplate } from '../../lib/checklists';
import type { AuditTemplate } from '../../lib/audits';
import { previewText } from '../../lib/knowledge';

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
}

interface DraftState {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
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

  const matches = [...coverage.missing, ...coverage.satisfied].filter((result) => result.matchedObjects.some((matched) => matched.id === object.id));
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
}: SOPPreviewProps): JSX.Element {
  const coverageSummary = useMemo(() => (object ? coverageForObject(object, coverage) : null), [coverage, object]);
  const evidenceRef = useRef<HTMLElement | null>(null);
  const trainingRef = useRef<HTMLElement | null>(null);
  const checklistRef = useRef<HTMLElement | null>(null);
  const auditRef = useRef<HTMLElement | null>(null);
  const relatedRef = useRef<HTMLElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);

  useEffect(() => {
    if (!object) {
      setEditMode(false);
      setDraftSaved(false);
      setDraft(null);
      return;
    }

    setEditMode(false);
    setDraftSaved(false);
    setDraft({
      title: object.title,
      summary: object.summary ?? '',
      body: object.approvedVersion.body,
      category: object.category,
      tags: object.ontology.tags.map((tag) => tag.name).join(', '),
    });
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
    setDraftSaved(false);
  }

  function cancelEdit(): void {
    if (!object) return;
    setDraft({
      title: object.title,
      summary: object.summary ?? '',
      body: object.approvedVersion.body,
      category: object.category,
      tags: object.ontology.tags.map((tag) => tag.name).join(', '),
    });
    setEditMode(false);
    setDraftSaved(false);
  }

  function saveDraft(): void {
    setEditMode(false);
    setDraftSaved(true);
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

  const linkedTraining = linkedTrainingItems(trainingPaths, onOpenTraining);
  const linkedChecklists = linkedChecklistItems(checklistTemplates, onOpenChecklists);
  const linkedAudits = linkedAuditItems(auditTemplates, onOpenAudits);

  return (
    <section className="workspacePreviewPanel">
      <div className="workspaceSectionHeader">
        <div>
          <h3>SOP preview</h3>
          <p>Read-only by default, with a local draft editor ready for the next sprint.</p>
        </div>
        <div className="workspacePreviewActions">
          {draftSaved ? <StatusBadge status="draft" label="Draft not saved yet" /> : null}
          {!editMode ? (
            <button className="iconTextButton" onClick={beginEdit} type="button">
              <Edit3 aria-hidden="true" size={16} />
              Edit SOP
            </button>
          ) : (
            <>
              <button className="iconTextButton" onClick={saveDraft} type="button">
                <Save aria-hidden="true" size={16} />
                Save draft
              </button>
              <button className="iconTextButton" onClick={cancelEdit} type="button">
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
          { label: 'Version', value: `v${object.approvedVersion.versionNumber}` },
          { label: 'Version status', value: object.approvedVersion.status },
        ]}
        sourceDetail={object.sourceFileUri}
        sourceLabel="Approved SOP"
        status={object.status}
        summary={draft?.summary || object.summary || previewText(object.approvedVersion.body, 220)}
        title={draft?.title || object.title}
      >
        <div className="workspacePreviewIntro">
          <div>
            <span>Purpose</span>
            <p>{draft?.summary || object.summary || previewText(object.approvedVersion.body, 240)}</p>
          </div>
          <div>
            <span>Summary</span>
            <p>{previewText(draft?.body ?? object.approvedVersion.body, 300)}</p>
          </div>
        </div>
        {draftSaved ? <div className="workspaceDraftBanner">Draft not saved yet. This editor stays local until a draft version workflow exists.</div> : null}
      </SOPCard>

      {editMode && draft && (
        <section className="detailSection">
          <h4>Edit draft</h4>
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
              <span>Content</span>
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
          </div>
        </section>
      )}

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
        <LinkedKnowledgePanel
          emptyLabel="No related training paths are visible yet."
          items={linkedTraining}
          title="Training"
        />
      </section>

      <section className="detailSection" ref={checklistRef}>
        <h4>Checklist</h4>
        <LinkedKnowledgePanel
          emptyLabel="No related checklists are visible yet."
          items={linkedChecklists}
          title="Checklist"
        />
      </section>

      <section className="detailSection" ref={auditRef}>
        <h4>Audit</h4>
        <LinkedKnowledgePanel emptyLabel="No related audits are visible yet." items={linkedAudits} title="Audit" />
      </section>
    </section>
  );
}
