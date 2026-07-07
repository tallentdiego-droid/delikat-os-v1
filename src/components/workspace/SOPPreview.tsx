import { useMemo } from 'react';
import { KnowledgeGapCard, LinkedKnowledgePanel, SOPEvidencePanel, SOPCard, SOPRelatedKnowledge, SOPStepList } from '../os';
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

function linkedTrainingItems(paths: TrainingPath[]): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string }> {
  return paths.map((path) => ({
    id: path.id,
    title: path.title,
    subtitle: path.role?.name ?? path.department?.name ?? 'Training path',
    preview: `${path.items.length} items · ${path.coveragePercent}% covered`,
    status: path.missingItemCount > 0 ? 'blocked' : path.status,
    notes: path.missingItemCount > 0 ? `${path.missingItemCount} missing training items` : `${path.linkedKnowledgeCount} linked SOPs`,
  }));
}

function linkedChecklistItems(templates: ChecklistTemplate[]): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string }> {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    subtitle: template.role?.title ?? template.process?.name ?? 'Checklist template',
    preview: `${template.itemCount} items · ${template.coveragePercent}% covered`,
    status: template.missingKnowledgeCount > 0 ? 'blocked' : template.status,
    notes: template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} missing SOP links` : `${template.linkedKnowledgeCount} linked SOPs`,
  }));
}

function linkedAuditItems(templates: AuditTemplate[]): Array<{ id: string; title: string; subtitle: string; preview: string; status: string; notes?: string }> {
  return templates.map((template) => ({
    id: template.id,
    title: template.title,
    subtitle: template.checklistTemplate?.role?.title ?? template.auditType,
    preview: `${template.itemCount} items · ${template.coveragePercent}% covered`,
    status: template.missingKnowledgeCount > 0 ? 'blocked' : template.status,
    notes: template.missingKnowledgeCount > 0 ? `${template.missingKnowledgeCount} missing SOP links` : `${template.linkedKnowledgeCount} linked SOPs`,
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
}: SOPPreviewProps): JSX.Element {
  const coverageSummary = useMemo(() => (object ? coverageForObject(object, coverage) : null), [coverage, object]);

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

  const evidence: KnowledgeEvidence[] = object.evidence;

  return (
    <section className="workspacePreviewPanel">
      <div className="workspaceSectionHeader">
        <div>
          <h3>SOP preview</h3>
          <p>Read-only view of the selected SOP and its live operational context.</p>
        </div>
      </div>

      <SOPCard
        coverageLabel={coverageSummary?.label ?? undefined}
        coveragePercent={coverageSummary?.coveragePercent}
        metadata={[
          { label: 'Purpose', value: object.summary ?? previewText(object.approvedVersion.body, 120) },
          { label: 'Manual', value: manual?.manualCode ?? manual?.title ?? object.manualCode ?? 'Unassigned' },
          { label: 'Updated', value: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(object.updatedAt)) },
          { label: 'Version', value: `v${object.approvedVersion.versionNumber}` },
        ]}
        sourceDetail={object.sourceFileUri}
        sourceLabel="Approved SOP"
        status={object.status}
        summary={previewText(object.approvedVersion.body, 220)}
        title={object.title}
      >
        <div className="workspacePreviewIntro">
          <div>
            <span>Purpose</span>
            <p>{object.summary ?? previewText(object.approvedVersion.body, 240)}</p>
          </div>
          <div>
            <span>Summary</span>
            <p>{previewText(object.approvedVersion.body, 300)}</p>
          </div>
        </div>
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

      <SOPEvidencePanel
        emptyLabel="No source evidence is visible for this SOP."
        evidence={evidence.map((item) => ({
          id: item.id,
          sourceManualTitle: item.sourceManualTitle,
          sourceFileUri: item.sourceFileUri,
          sourceSectionHeading: item.sourceSectionHeading,
          sourceSectionBody: item.sourceSectionBody,
          sourceSectionHash: item.sourceSectionHash,
        }))}
        title="Evidence"
      />

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

      <LinkedKnowledgePanel
        emptyLabel="No related training paths are visible yet."
        items={linkedTrainingItems(trainingPaths).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          preview: item.preview,
          status: item.status,
          notes: item.notes,
        }))}
        title="Training"
      />

      <LinkedKnowledgePanel
        emptyLabel="No related checklists are visible yet."
        items={linkedChecklistItems(checklistTemplates).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          preview: item.preview,
          status: item.status,
          notes: item.notes,
        }))}
        title="Checklist"
      />

      <LinkedKnowledgePanel
        emptyLabel="No related audits are visible yet."
        items={linkedAuditItems(auditTemplates).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          preview: item.preview,
          status: item.status,
          notes: item.notes,
        }))}
        title="Audit"
      />
    </section>
  );
}
