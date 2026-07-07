import { useMemo, useState } from 'react';
import { Edit3, Save } from 'lucide-react';
import { OSCard, SOPCard } from '../os';
import { SOPPreview } from './SOPPreview';
import type { KnowledgeEngineData, KnowledgeManual, KnowledgeObject } from '../../lib/knowledge';
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

interface DraftShellState {
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

function splitShellSteps(value: string): string[] {
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
  const [draftShells, setDraftShells] = useState<Record<CashierSOPKey, DraftShellState>>(() =>
    CASHIER_SOPS.reduce<Record<CashierSOPKey, DraftShellState>>((acc, item) => {
      acc[item.key] = {
        title: item.title,
        purpose: 'Draft shell — fill with Delikat procedure.',
        whenToUse: item.whenToUse,
        steps: 'Draft shell — fill with Delikat procedure.',
        notes: item.notes,
      };
      return acc;
    }, {} as Record<CashierSOPKey, DraftShellState>),
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

  const shellDraft = draftShells[selectedKey];

  function saveShellDraft(): void {
    setFeedback('Draft shell saved locally.');
    setEditMode(false);
  }

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
                {CASHIER_SOPS.map((item) => (
                  <button
                    className={item.key === selectedKey ? 'cashierRequiredItem active' : 'cashierRequiredItem'}
                    key={item.key}
                    onClick={() => {
                      setSelectedKey(item.key);
                      setEditMode(false);
                      setFeedback(null);
                    }}
                    type="button"
                  >
                    <span>{item.title}</span>
                    <small>{findCashierObject(cashierObjects, item) ? 'Linked SOP' : 'Needs SOP'}</small>
                  </button>
                ))}
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
                        if (linkedObject) onOpenObject?.(linkedObject.id);
                        setSelectedKey(item.key);
                        setEditMode(false);
                        setFeedback(null);
                      }}
                      type="button"
                    >
                      {linkedObject ? 'Open SOP' : 'Needs SOP'}
                    </button>
                  }
                  key={item.key}
                  onClick={() => {
                    if (linkedObject) onOpenObject?.(linkedObject.id);
                    setSelectedKey(item.key);
                    setEditMode(false);
                    setFeedback(null);
                  }}
                  selected={item.key === selectedKey}
                  sourceDetail={linkedObject ? `${linkedObject.manualCode ?? linkedObject.manualTitle} · ${linkedObject.sourceSectionHeading}` : 'Draft shell — fill with Delikat procedure.'}
                  sourceLabel={linkedObject ? 'Source manual' : 'Draft shell'}
                  status={linkedObject?.status ?? 'draft'}
                  statusLabel={linkedObject ? 'Linked' : 'Needs SOP'}
                  summary={linkedObject?.summary ?? item.purposeLabel}
                  title={item.title}
                />
              );
            })}
          </div>
        </main>

        <aside className="cashierPreviewColumn">
          {selectedObject ? (
            <SOPPreview
              auditTemplates={selectedAuditTemplates}
              checklistTemplates={selectedChecklistTemplates}
              coverage={knowledge.coverage}
              manual={selectedManual}
              object={selectedObject}
              relatedSOPs={selectedObject.related}
              sourceSections={selectedSourceSections}
              trainingPaths={selectedTrainingPaths}
              onOpenAudits={onRefresh}
              onOpenChecklists={onRefresh}
              onOpenTraining={onRefresh}
              onRefresh={onRefresh}
            />
          ) : (
            <OSCard className="cashierDocumentCard">
              <div className="workspaceSectionHeader workspaceDocumentHeader">
                <div>
                  <span className="eyebrow">Draft shell</span>
                  {editMode ? (
                    <input
                      className="cashierShellTitle"
                      onChange={(event) =>
                        setDraftShells((current) => ({
                          ...current,
                          [selectedKey]: { ...current[selectedKey], title: event.target.value },
                        }))
                      }
                      value={shellDraft.title}
                    />
                  ) : (
                    <h3>{shellDraft.title}</h3>
                  )}
                  <p>Draft shell — fill with Delikat procedure.</p>
                </div>
              </div>

              <div className="cashierDocumentSections">
                <section className="cashierDocumentSection">
                  <strong>Purpose</strong>
                  {editMode ? (
                    <textarea
                      onChange={(event) =>
                        setDraftShells((current) => ({
                          ...current,
                          [selectedKey]: { ...current[selectedKey], purpose: event.target.value },
                        }))
                      }
                      rows={3}
                      value={shellDraft.purpose}
                    />
                  ) : (
                    <p>{shellDraft.purpose}</p>
                  )}
                </section>
                <section className="cashierDocumentSection">
                  <strong>When to use</strong>
                  {editMode ? (
                    <textarea
                      onChange={(event) =>
                        setDraftShells((current) => ({
                          ...current,
                          [selectedKey]: { ...current[selectedKey], whenToUse: event.target.value },
                        }))
                      }
                      rows={2}
                      value={shellDraft.whenToUse}
                    />
                  ) : (
                    <p>{shellDraft.whenToUse}</p>
                  )}
                </section>
                <section className="cashierDocumentSection">
                  <strong>Steps</strong>
                  {editMode ? (
                    <textarea
                      onChange={(event) =>
                        setDraftShells((current) => ({
                          ...current,
                          [selectedKey]: { ...current[selectedKey], steps: event.target.value },
                        }))
                      }
                      rows={5}
                      value={shellDraft.steps}
                    />
                  ) : (
                    <ol>
                      {splitShellSteps(shellDraft.steps).map((step, index) => (
                        <li key={`${selectedKey}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  )}
                </section>
                <section className="cashierDocumentSection">
                  <strong>Notes</strong>
                  {editMode ? (
                    <textarea
                      onChange={(event) =>
                        setDraftShells((current) => ({
                          ...current,
                          [selectedKey]: { ...current[selectedKey], notes: event.target.value },
                        }))
                      }
                      rows={3}
                      value={shellDraft.notes}
                    />
                  ) : (
                    <p>{shellDraft.notes}</p>
                  )}
                </section>
              </div>

              <div className="cashierDocumentActions">
                <button className="iconTextButton" onClick={() => setEditMode((current) => !current)} type="button">
                  <Edit3 aria-hidden="true" size={16} />
                  Edit SOP
                </button>
                <button className="iconTextButton primary" onClick={saveShellDraft} type="button">
                  <Save aria-hidden="true" size={16} />
                  Save draft
                </button>
              </div>

              {feedback ? <p className="workspaceActionFeedback">{feedback}</p> : null}
            </OSCard>
          )}
        </aside>
      </div>

    </section>
  );
}
