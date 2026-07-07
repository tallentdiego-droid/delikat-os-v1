import { useMemo, useState } from 'react';
import { Edit3, Save, RotateCcw } from 'lucide-react';
import { OSCard, SOPCard, StatusBadge } from '../os';
import {
  createKnowledgeDraft,
  previewText,
  saveKnowledgeDraft,
  type KnowledgeEngineData,
  type KnowledgeManual,
  type KnowledgeObject,
} from '../../lib/knowledge';
import type { TrainingEngineData } from '../../lib/training';
import type { ChecklistEngineData } from '../../lib/checklists';
import type { AuditEngineData } from '../../lib/audits';

interface CashierWorkspaceProps {
  knowledge: KnowledgeEngineData;
  training: TrainingEngineData;
  checklists: ChecklistEngineData;
  audits: AuditEngineData;
  onOpenObject?: (id: string) => void;
  onRefresh?: () => Promise<void> | void;
}

type CashierSOPKey = 'cashOpening' | 'posUse' | 'cashClosing' | 'paymentIssue' | 'endOfShift';

interface CashierSOPDefinition {
  key: CashierSOPKey;
  title: string;
  purposeLabel: string;
  whenToUse: string;
  notes: string;
  searchTerms: string[];
}

interface DraftState {
  title: string;
  purpose: string;
  whenToUse: string;
  steps: string;
  notes: string;
}

const CASHIER_SOPS: CashierSOPDefinition[] = [
  {
    key: 'cashOpening',
    title: 'Cash Opening',
    purposeLabel: 'Prepare the register for service.',
    whenToUse: 'Before the first payment of the day.',
    notes: 'Draft shell — fill with Delikat procedure.',
    searchTerms: ['cash opening', 'opening cash', 'cash drawer', 'opening register', 'cashier opening'],
  },
  {
    key: 'posUse',
    title: 'POS Use',
    purposeLabel: 'Handle orders and payments in the POS.',
    whenToUse: 'Whenever an order or payment is entered.',
    notes: 'Draft shell — fill with Delikat procedure.',
    searchTerms: ['pos use', 'pos system', 'point of sale', 'cash register', 'payment reception'],
  },
  {
    key: 'cashClosing',
    title: 'Cash Closing',
    purposeLabel: 'Reconcile the register and close the day.',
    whenToUse: 'At the end of the cashier shift.',
    notes: 'Draft shell — fill with Delikat procedure.',
    searchTerms: ['cash closing', 'close cash', 'closing cash', 'cash control', 'cash closing process'],
  },
  {
    key: 'paymentIssue',
    title: 'Customer Payment Issue',
    purposeLabel: 'Resolve payment problems calmly and traceably.',
    whenToUse: 'When a customer payment does not go through or needs correction.',
    notes: 'Draft shell — fill with Delikat procedure.',
    searchTerms: ['payment issue', 'customer payment issue', 'payment problems', 'card declined', 'refund'],
  },
  {
    key: 'endOfShift',
    title: 'End of Shift Report',
    purposeLabel: 'Hand over the shift clearly and with notes.',
    whenToUse: 'At the end of the cashier shift before leaving.',
    notes: 'Draft shell — fill with Delikat procedure.',
    searchTerms: ['end of shift report', 'shift report', 'closing report', 'daily report', 'handover'],
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function chooseManual(manuals: KnowledgeManual[], object: KnowledgeObject): KnowledgeManual | null {
  return (
    manuals.find((manual) => manual.manualCode !== null && manual.manualCode === object.manualCode) ??
    manuals.find((manual) => manual.title === object.manualTitle) ??
    manuals.find((manual) => manual.sourceUri === object.sourceFileUri) ??
    null
  );
}

function sourceSectionsForObject(manual: KnowledgeManual | null, object: KnowledgeObject) {
  if (!manual) return [];
  return manual.sections.filter((section) => section.knowledgeIds.includes(object.id));
}

function findCashierObject(objects: KnowledgeObject[], definition: CashierSOPDefinition): KnowledgeObject | null {
  const searchTerms = definition.searchTerms.map(normalize);
  return (
    objects.find((object) => {
      const haystack = normalize(
        [
          object.title,
          object.summary ?? '',
          object.approvedVersion.body,
          object.approvedVersion.notes ?? '',
          object.manualTitle,
          object.sourceSectionHeading,
          object.preview,
        ].join(' '),
      );
      return searchTerms.some((term) => haystack.includes(term));
    }) ?? null
  );
}

function seedDraftFromSelection(definition: CashierSOPDefinition, object: KnowledgeObject | null): DraftState {
  if (!object) {
    return {
      title: definition.title,
      purpose: 'Draft shell — fill with Delikat procedure.',
      whenToUse: definition.whenToUse,
      steps: 'Draft shell — fill with Delikat procedure.',
      notes: definition.notes,
    };
  }

  return {
    title: object.title,
    purpose: object.summary ?? definition.purposeLabel,
    whenToUse: definition.whenToUse,
    steps: object.approvedVersion.body || 'Draft shell — fill with Delikat procedure.',
    notes: object.approvedVersion.notes ?? definition.notes,
  };
}

function draftBody(value: DraftState): string {
  return [
    `Purpose\n${value.purpose.trim()}`,
    `When to use\n${value.whenToUse.trim()}`,
    `Steps\n${value.steps.trim()}`,
    `Notes\n${value.notes.trim()}`,
  ]
    .filter((section) => section.replace(/\s/g, '').length > 0)
    .join('\n\n');
}

function splitDisplaySteps(value: string): string[] {
  return value
    .split(/\n|;/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function CashierWorkspace({
  knowledge,
  training,
  checklists,
  audits,
  onOpenObject,
  onRefresh,
}: CashierWorkspaceProps): JSX.Element {
  const cashierObjects = knowledge.objects;
  const [selectedKey, setSelectedKey] = useState<CashierSOPKey>('cashOpening');
  const [editMode, setEditMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<CashierSOPKey, DraftState>>(() =>
    CASHIER_SOPS.reduce<Record<CashierSOPKey, DraftState>>((acc, item) => {
      acc[item.key] = seedDraftFromSelection(item, null);
      return acc;
    }, {} as Record<CashierSOPKey, DraftState>),
  );

  const selectedDefinition = CASHIER_SOPS.find((item) => item.key === selectedKey) ?? CASHIER_SOPS[0];
  const selectedObject = useMemo(
    () => findCashierObject(cashierObjects, selectedDefinition),
    [cashierObjects, selectedDefinition],
  );
  const selectedManual = useMemo(
    () => (selectedObject ? chooseManual(knowledge.manuals, selectedObject) : null),
    [knowledge.manuals, selectedObject],
  );
  const selectedSourceSections = useMemo(
    () => (selectedObject ? sourceSectionsForObject(selectedManual, selectedObject) : []),
    [selectedManual, selectedObject],
  );

  const selectedDraft = drafts[selectedKey];
  const isEditable = selectedObject ? editMode : true;
  const sourceBadge = selectedObject
    ? selectedObject.sourceType === 'user_created'
      ? 'User-created'
      : selectedObject.versions.length > 1
        ? 'Edited'
        : 'Imported'
    : 'Draft shell';

  const selectedTrainingPaths = useMemo(
    () =>
      selectedObject
        ? training.paths.filter((path) => path.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)))
        : [],
    [selectedObject, training.paths],
  );
  const selectedChecklistTemplates = useMemo(
    () =>
      selectedObject
        ? checklists.templates.filter((template) => template.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)))
        : [],
    [checklists.templates, selectedObject],
  );
  const selectedAuditTemplates = useMemo(
    () =>
      selectedObject
        ? audits.templates.filter((template) => template.items.some((item) => item.matchedKnowledge.some((matched) => matched.id === selectedObject.id)))
        : [],
    [audits.templates, selectedObject],
  );

  function selectCashierSOP(key: CashierSOPKey): void {
    const definition = CASHIER_SOPS.find((item) => item.key === key) ?? CASHIER_SOPS[0];
    const linkedObject = findCashierObject(cashierObjects, definition);

    setSelectedKey(key);
    setFeedback(null);
    setError(null);

    if (linkedObject) {
      setDrafts((current) => ({
        ...current,
        [key]: seedDraftFromSelection(definition, linkedObject),
      }));
      setEditMode(false);
      return;
    }

    setDrafts((current) => ({
      ...current,
      [key]: seedDraftFromSelection(definition, null),
    }));
    setEditMode(true);
  }

  function resetCurrentDraft(): void {
    const definition = selectedDefinition;
    const linkedObject = selectedObject;
    setDrafts((current) => ({
      ...current,
      [selectedKey]: seedDraftFromSelection(definition, linkedObject),
    }));
    setError(null);
    setFeedback('Draft shell reset.');
    setEditMode(Boolean(linkedObject));
  }

  function cancelEditing(): void {
    if (!selectedObject) {
      resetCurrentDraft();
      return;
    }

    setDrafts((current) => ({
      ...current,
      [selectedKey]: seedDraftFromSelection(selectedDefinition, selectedObject),
    }));
    setEditMode(false);
    setFeedback('Draft changes were discarded.');
    setError(null);
  }

  async function saveCurrentDraft(): Promise<void> {
    const currentDraft = drafts[selectedKey];
    const linkedObject = selectedObject;

    if (!currentDraft.title.trim() || !currentDraft.steps.trim()) {
      setError('A title and steps are required before saving this draft.');
      return;
    }

    setFeedback(null);
    setError(null);

    try {
      const summary = currentDraft.purpose.trim();
      const body = draftBody(currentDraft);

      if (linkedObject) {
        await saveKnowledgeDraft({
          knowledgeId: linkedObject.id,
          title: currentDraft.title.trim(),
          summary,
          body,
          notes: currentDraft.notes.trim(),
          sourceVersionId: linkedObject.currentApprovedVersionId ?? linkedObject.approvedVersion.id,
        });
        await onRefresh?.();
      } else {
        const created = await createKnowledgeDraft({
          title: currentDraft.title.trim(),
          summary,
          body,
          notes: currentDraft.notes.trim(),
        });

        await onRefresh?.();
        onOpenObject?.(created.knowledge.id);
      }

      setFeedback(linkedObject ? 'Draft saved.' : 'Draft shell saved as a new SOP draft.');
      setEditMode(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Draft could not be saved.');
    }
  }

  const selectionSummary = selectedObject
    ? selectedObject.summary ?? selectedDefinition.purposeLabel
    : 'Draft shell — fill with Delikat procedure.';
  const selectionSteps = selectedObject
    ? selectedSourceSections.length > 0
      ? selectedSourceSections.slice(0, 5).map((section) => section.heading)
      : splitDisplaySteps(previewText(selectedObject.approvedVersion.body, 260))
    : splitDisplaySteps(selectedDraft.steps);

  return (
    <section className="cashierWorkspace">
      <div className="sectionHeader cashierWorkspaceHeader">
        <div>
          <h2>Cashier MVP</h2>
          <p>One simple role workspace for Cashier / Caja. Real SOPs show when they exist; missing ones stay as draft shells.</p>
        </div>
      </div>

      <div className="cashierWorkspaceGrid">
        <aside className="cashierProfileColumn">
          <OSCard className="cashierProfileCard">
            <div className="workspaceSectionHeader">
              <div>
                <h3>Cashier / Caja</h3>
                <p>Single-role workspace for opening, payments, closing, and shift handoff.</p>
              </div>
            </div>

            <div className="cashierProfileBlock">
              <strong>Purpose</strong>
              <p>Keep the cash desk ready, handle payments accurately, and close the shift with a clean handoff.</p>
            </div>

            <div className="cashierProfileBlock">
              <strong>Responsibilities</strong>
              <ul>
                <li>Open and prepare the register.</li>
                <li>Use the POS correctly for orders and payments.</li>
                <li>Close cash and report the shift cleanly.</li>
                <li>Escalate payment issues with traceability.</li>
              </ul>
            </div>

            <div className="cashierProfileBlock">
              <strong>Required SOPs</strong>
              <div className="cashierRequiredList">
                {CASHIER_SOPS.map((item) => {
                  const linkedObject = findCashierObject(cashierObjects, item);
                  return (
                    <button
                      className={item.key === selectedKey ? 'cashierRequiredItem active' : 'cashierRequiredItem'}
                      key={item.key}
                      onClick={() => selectCashierSOP(item.key)}
                      type="button"
                    >
                      <span>{item.title}</span>
                      <small>{linkedObject ? 'Ready' : 'Needs SOP'}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="cashierProfileBlock">
              <strong>Training status</strong>
              <p>Placeholder: Not started.</p>
            </div>
          </OSCard>
        </aside>

        <main className="cashierCardsColumn">
          <div className="cashierSOPGrid">
            {CASHIER_SOPS.map((item) => {
              const linkedObject = findCashierObject(cashierObjects, item);
              return (
                <SOPCard
                  action={
                    <button
                      className="tableLink"
                      onClick={() => {
                        selectCashierSOP(item.key);
                        if (linkedObject) setEditMode(true);
                      }}
                      type="button"
                    >
                      {linkedObject ? 'Edit into clean SOP' : 'Needs SOP'}
                    </button>
                  }
                  key={item.key}
                  onClick={() => selectCashierSOP(item.key)}
                  selected={item.key === selectedKey}
                  sourceDetail={
                    linkedObject ? `${linkedObject.manualCode ?? linkedObject.manualTitle} · ${linkedObject.sourceSectionHeading}` : 'Draft shell — fill with Delikat procedure.'
                  }
                  sourceLabel="Source manual"
                  status={linkedObject?.status ?? 'draft'}
                  statusLabel={linkedObject ? sourceBadge : 'Draft shell — not published'}
                  summary={linkedObject?.summary ?? item.purposeLabel}
                  title={item.title}
                  metadata={[
                    {
                      label: 'Evidence',
                      value: linkedObject ? `${linkedObject.evidence.length} link${linkedObject.evidence.length === 1 ? '' : 's'}` : 'Not linked yet',
                    },
                  ]}
                />
              );
            })}
          </div>
        </main>

        <aside className="cashierPreviewColumn">
          <OSCard className="cashierDocumentCard">
            <div className="workspaceSectionHeader workspaceDocumentHeader">
              <div>
                <div className="workspaceDocumentBadges">
                  <StatusBadge status={selectedObject?.status ?? 'draft'} label={sourceBadge} />
                  {!selectedObject ? <StatusBadge status="draft" label="Not published" /> : null}
                </div>
                {isEditable ? (
                  <input
                    className="cashierShellTitle"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedKey]: { ...current[selectedKey], title: event.target.value },
                      }))
                    }
                    value={selectedDraft.title}
                  />
                ) : (
                  <h3>{selectedDraft.title}</h3>
                )}
                <p>{selectionSummary}</p>
              </div>

              <div className="workspacePreviewActions">
                {feedback ? <StatusBadge status={selectedObject?.status ?? 'draft'} label={feedback} /> : null}
                {error ? <span className="workspaceActionError">{error}</span> : null}
                {selectedObject && !editMode ? (
                  <button className="iconTextButton" onClick={() => setEditMode(true)} type="button">
                    <Edit3 aria-hidden="true" size={16} />
                    Edit SOP
                  </button>
                ) : null}
                {isEditable ? (
                  <>
                    <button className="iconTextButton" onClick={() => void saveCurrentDraft()} type="button">
                      <Save aria-hidden="true" size={16} />
                      Save Draft
                    </button>
                    {selectedObject ? (
                      <button className="iconTextButton" onClick={cancelEditing} type="button">
                        Cancel
                      </button>
                    ) : (
                      <button className="iconTextButton" onClick={resetCurrentDraft} type="button">
                        <RotateCcw aria-hidden="true" size={16} />
                        Reset shell
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className="cashierDocumentSections">
              <section className="cashierDocumentSection">
                <strong>Purpose</strong>
                {isEditable ? (
                  <textarea
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedKey]: { ...current[selectedKey], purpose: event.target.value },
                      }))
                    }
                    rows={3}
                    value={selectedDraft.purpose}
                  />
                ) : (
                  <p>{selectedDraft.purpose}</p>
                )}
              </section>

              <section className="cashierDocumentSection">
                <strong>When to use</strong>
                {isEditable ? (
                  <textarea
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedKey]: { ...current[selectedKey], whenToUse: event.target.value },
                      }))
                    }
                    rows={2}
                    value={selectedDraft.whenToUse}
                  />
                ) : (
                  <p>{selectedDefinition.whenToUse}</p>
                )}
              </section>

              <section className="cashierDocumentSection">
                <strong>Steps</strong>
                {isEditable ? (
                  <textarea
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedKey]: { ...current[selectedKey], steps: event.target.value },
                      }))
                    }
                    rows={8}
                    value={selectedDraft.steps}
                  />
                ) : selectedObject ? (
                  <ol>
                    {selectionSteps.map((step, index) => (
                      <li key={`${selectedKey}-${index}`}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p>Draft shell — fill with Delikat procedure.</p>
                )}
              </section>

              <section className="cashierDocumentSection">
                <strong>Notes</strong>
                {isEditable ? (
                  <textarea
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [selectedKey]: { ...current[selectedKey], notes: event.target.value },
                      }))
                    }
                    rows={3}
                    value={selectedDraft.notes}
                  />
                ) : (
                  <p>{selectedObject?.approvedVersion.notes ?? selectedDefinition.notes}</p>
                )}
              </section>

              <section className="cashierDocumentSection">
                <strong>Source / evidence</strong>
                {selectedObject ? (
                  <div className="cashierEvidencePanel">
                    <div className="cashierEvidenceLine">
                      <span>Source manual</span>
                      <strong>{selectedManual?.title ?? selectedObject.manualTitle}</strong>
                    </div>
                    <div className="cashierEvidenceLine">
                      <span>Source file</span>
                      <strong>{selectedManual?.sourceUri ?? selectedObject.sourceFileUri}</strong>
                    </div>
                    <div className="cashierEvidenceList">
                      {selectedSourceSections.length > 0 ? (
                        selectedSourceSections.map((section) => (
                          <div className="cashierEvidenceItem" key={section.id}>
                            <strong>{section.heading}</strong>
                            <p>{previewText(section.body, 180)}</p>
                            <small>{section.contentHash}</small>
                          </div>
                        ))
                      ) : (
                        <div className="cashierEvidenceItem">
                          <strong>Original imported source — read only.</strong>
                          <p>{previewText(selectedObject.approvedVersion.body, 180)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="cashierEvidenceItem">
                    <strong>No source evidence yet.</strong>
                    <p>This cashier SOP is still a draft shell. Fill it by hand, then save it as a draft.</p>
                  </div>
                )}
              </section>

              <section className="cashierDocumentSection">
                <strong>Related work</strong>
                <div className="cashierRelatedSummary">
                  <span>{selectedTrainingPaths.length} training link{selectedTrainingPaths.length === 1 ? '' : 's'}</span>
                  <span>{selectedChecklistTemplates.length} checklist link{selectedChecklistTemplates.length === 1 ? '' : 's'}</span>
                  <span>{selectedAuditTemplates.length} audit link{selectedAuditTemplates.length === 1 ? '' : 's'}</span>
                </div>
              </section>
            </div>
          </OSCard>
        </aside>
      </div>
    </section>
  );
}
