import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Boxes, Clock3, FileText, GitBranch, Layers3, Search, ShieldCheck, Workflow, X } from 'lucide-react';
import {
  getOperationsEngineData,
  type OperationsEngineData,
  type OperationsCatalogData,
  type OperationsProcess,
  type OperationsReference,
} from '../../lib/operations';
import {
  KnowledgeGapCard,
  LinkedKnowledgePanel,
  MetricCard as SharedMetricCard,
  ProcessCard,
} from '../os';

type OperationsTab = 'dashboard' | 'catalog' | 'processes';
type DetailTab = 'overview' | 'steps' | 'dependencies' | 'inputs' | 'outputs' | 'knowledge';

const triggerOptions: Array<'all' | OperationsProcess['triggerType']> = ['all', 'opening', 'closing', 'scheduled', 'event', 'manual'];
const statusOptions = ['all', 'draft', 'active', 'archived'] as const;
const criticalityOptions = ['all', 'low', 'medium', 'high', 'critical'] as const;
const detailTabs: Array<{ id: DetailTab; label: string; icon: typeof FileText }> = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'steps', label: 'Steps', icon: Workflow },
  { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
  { id: 'inputs', label: 'Inputs', icon: Boxes },
  { id: 'outputs', label: 'Outputs', icon: Layers3 },
  { id: 'knowledge', label: 'Knowledge Links', icon: ShieldCheck },
];

function dateLabel(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Operations Engine could not reach the live Supabase data. Ask an administrator to check the connection and read policies.';
}

function referenceSummary(reference: OperationsReference | null): string {
  if (!reference) return 'Unlinked';
  if (reference.subtitle) return reference.subtitle;
  if (reference.code) return reference.code;
  return 'Linked';
}

function referenceLabel(reference: OperationsReference | null): string {
  if (!reference) return 'Unlinked';
  if (reference.kind === 'knowledge') return 'Knowledge';
  if (reference.kind === 'checklist') return 'Checklist';
  if (reference.kind === 'checklistItem') return 'Checklist Item';
  if (reference.kind === 'equipment') return 'Equipment';
  if (reference.kind === 'businessProcess') return 'Business Process';
  if (reference.kind === 'department') return 'Department';
  if (reference.kind === 'role') return 'Role';
  if (reference.kind === 'area') return 'Area';
  if (reference.kind === 'documentType') return 'Document Type';
  return 'Tag';
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}

function ontologyValues(groups: OperationsCatalogData['ontologyOptions']): Array<{ label: string; items: Array<{ id: string; title: string; subtitle: string | null; code: string | null }> }> {
  return [
    { label: 'Departments', items: groups.departments.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })) },
    { label: 'Roles', items: groups.roles.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })) },
    { label: 'Areas', items: groups.areas.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })) },
    { label: 'Equipment', items: groups.equipment.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })) },
    {
      label: 'Business Processes',
      items: groups.businessProcesses.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })),
    },
    {
      label: 'Document Types',
      items: groups.documentTypes.map((entity) => ({ id: entity.id, title: entity.name, subtitle: entity.description, code: entity.code })),
    },
  ];
}

interface ProcessDepartmentGroup {
  department: string;
  processes: OperationsProcess[];
}

function groupProcessesByDepartment(processes: OperationsProcess[]): ProcessDepartmentGroup[] {
  const grouped = new Map<string, OperationsProcess[]>();
  for (const process of processes) {
    const department = process.department?.title ?? 'Unassigned';
    grouped.set(department, [...(grouped.get(department) ?? []), process]);
  }

  return Array.from(grouped.entries())
    .map(([department, items]) => ({
      department,
      processes: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

function processMatches(process: OperationsProcess, query: string, filters: ProcessFilters): boolean {
  const needle = query.trim().toLowerCase();
  const haystack = [
    process.name,
    process.code,
    process.description ?? '',
    process.frequency ?? '',
    process.triggerType,
    process.status,
    process.criticality,
    process.department?.title ?? '',
    process.role?.title ?? '',
    process.area?.title ?? '',
    ...process.steps.map((step) => `${step.title} ${step.description ?? ''}`),
    ...process.inputs.map((link) => `${link.title} ${link.reference?.title ?? ''}`),
    ...process.outputs.map((link) => `${link.title} ${link.reference?.title ?? ''}`),
    ...process.knowledgeLinks.map((reference) => `${reference.title} ${reference.subtitle ?? ''}`),
  ];

  return (
    (!needle || haystack.some((value) => value.toLowerCase().includes(needle))) &&
    (filters.department === 'all' || process.department?.id === filters.department) &&
    (filters.role === 'all' || process.role?.id === filters.role) &&
    (filters.area === 'all' || process.area?.id === filters.area) &&
    (filters.status === 'all' || process.status === filters.status) &&
    (filters.triggerType === 'all' || process.triggerType === filters.triggerType) &&
    (filters.criticality === 'all' || process.criticality === filters.criticality)
  );
}

interface ProcessFilters {
  department: string;
  role: string;
  area: string;
  status: string;
  triggerType: string;
  criticality: string;
}

const emptyFilters: ProcessFilters = {
  department: 'all',
  role: 'all',
  area: 'all',
  status: 'all',
  triggerType: 'all',
  criticality: 'all',
};

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }): JSX.Element {
  return <SharedMetricCard label={label} value={value} helper={helper} />;
}

function ReferenceChip({ reference }: { reference: OperationsReference | null }): JSX.Element {
  return (
    <span className="operationReferenceChip">
      <strong>{referenceLabel(reference)}</strong>
      <small>{reference ? reference.title : 'Unlinked'}</small>
    </span>
  );
}

function ProcessList({
  processes,
  selectedId,
  onSelect,
}: {
  processes: OperationsProcess[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): JSX.Element {
  if (processes.length === 0) {
    return <div className="emptyState refined"><h3>No active processes</h3><p>Once operational processes are published in Supabase, they will appear here.</p></div>;
  }

  const groups = groupProcessesByDepartment(processes);

  return (
    <div className="listPanel processList">
      {groups.map((group) => (
        <section className="processGroup" key={group.department}>
          <div className="processGroupHeader">
            <strong>{group.department}</strong>
            <span>{group.processes.length} processes</span>
          </div>
          <div className="processGroupList">
            {group.processes.map((process) => {
              const isSelected = process.id === selectedId;
              return <ProcessCard key={process.id} process={process} selected={isSelected} onSelect={onSelect} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProcessSummary({ process }: { process: OperationsProcess }): JSX.Element {
  return (
    <div className="summaryGrid">
      <MetricCard label="Department" value={process.department?.title ?? 'Unassigned'} helper={process.department?.subtitle ?? undefined} />
      <MetricCard label="Role" value={process.role?.title ?? 'Unassigned'} helper={process.role?.subtitle ?? undefined} />
      <MetricCard label="Area" value={process.area?.title ?? 'Unassigned'} helper={process.area?.subtitle ?? undefined} />
      <MetricCard label="Trigger" value={process.triggerType} helper={process.frequency ?? 'Manual cadence'} />
      <MetricCard label="Criticality" value={process.criticality} helper={`Priority ${process.priority}`} />
      <MetricCard label="Duration" value={process.estimatedDurationMinutes ? `${process.estimatedDurationMinutes} min` : 'Not set'} helper={`${process.stepCount} steps`} />
    </div>
  );
}

function ReferencePanel({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ id: string; label: string; description?: string | null; reference?: OperationsReference | null }>;
  emptyLabel: string;
}): JSX.Element {
  return (
    <section className="detailSection">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <div className="emptyInline">{emptyLabel}</div>
      ) : (
        <div className="referenceList">
          {rows.map((row) => (
            <article className="referenceCard" key={row.id}>
              <div className="referenceHeader">
                <div>
                  <strong>{row.label}</strong>
                  {row.description && <p>{row.description}</p>}
                </div>
                {row.reference && <span className="relationshipBadge outgoing">{row.reference.kind}</span>}
              </div>
              {row.reference ? (
                <div className="referenceBody">
                  <span>{row.reference.title}</span>
                  <small>{referenceSummary(row.reference)}</small>
                </div>
              ) : (
                <p className="quietText">No linked record.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function KnowledgeLinkCard({ reference }: { reference: OperationsReference }): JSX.Element {
  return (
    <article className="referenceCard">
      <div className="referenceHeader">
        <div>
          <strong>{reference.title}</strong>
          <p>{reference.subtitle ?? 'Approved knowledge'}</p>
        </div>
        <span className="relationshipBadge outgoing">knowledge</span>
      </div>
      <div className="referenceBody">
        <span>{reference.preview ?? 'Approved body available in the Knowledge module.'}</span>
        <small>{reference.code ?? reference.id}</small>
      </div>
    </article>
  );
}

function CatalogPills({
  items,
}: {
  items: Array<{ id: string; title: string; subtitle: string | null; code: string | null }>;
}): JSX.Element {
  return (
    <div className="ontologyPills">
      {items.map((item) => (
        <span key={item.id}>
          <strong>{item.title}</strong>
          <small>{item.code ?? item.subtitle ?? 'Seeded'}</small>
        </span>
      ))}
    </div>
  );
}

function CatalogBlock({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: JSX.Element;
}): JSX.Element {
  return (
    <section className="ontologyGroup catalogBlock">
      <div>
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
}

function CatalogScreen({ data }: { data: OperationsEngineData }): JSX.Element {
  const ontologySections = ontologyValues(data.catalog.ontologyOptions);
  const coverageById = new Map<string, 'missing' | 'satisfied'>(
    [...data.catalog.coverage.missing, ...data.catalog.coverage.satisfied].map((result) => [result.item.id, result.status]),
  );

  const requiredItems = [...data.catalog.requiredKnowledgeItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const requiredGroups = [...data.catalog.requiredKnowledgeGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  const starterProcesses = data.processes.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="catalogPanel">
      <section className="countPanel">
        <h3>Seeded operations catalog</h3>
        <p className="quietText">Departments, roles, areas, equipment, business processes, and required knowledge now come from live Supabase records.</p>
      </section>

      <div className="catalogGrid">
        {ontologySections.map((section) => (
          <CatalogBlock
            key={section.label}
            count={section.items.length}
            subtitle="Live seeded ontology"
            title={section.label}
          >
            <CatalogPills items={section.items.slice(0, 6)} />
          </CatalogBlock>
        ))}
      </div>

      <div className="catalogGrid twoColumn">
        <CatalogBlock count={requiredGroups.length} subtitle="Required knowledge scaffolding" title="Required knowledge groups">
          <CatalogPills
            items={requiredGroups.map((group) => ({
              id: group.id,
              title: group.name,
              subtitle: group.description,
              code: group.code,
            }))}
          />
        </CatalogBlock>

        <CatalogBlock count={requiredItems.length} subtitle="Coverage definitions" title="Required knowledge items">
          <div className="requiredItemList">
            {requiredItems.map((item) => (
              <KnowledgeGapCard
                key={item.id}
                title={item.title}
                description={item.groupName ?? 'Unassigned group'}
                detail={item.description ?? undefined}
                coveragePercent={coverageById.get(item.id) === 'missing' ? 0 : 100}
              />
            ))}
          </div>
        </CatalogBlock>
      </div>

      <section className="countPanel">
        <h3>Starter processes</h3>
        <div className="starterProcessCatalog">
          {starterProcesses.map((process) => (
            <ProcessCard key={process.id} process={process} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProcessDetail({
  process,
  detailTab,
  onDetailTabChange,
  onOpenKnowledgeBase,
  showTabs = true,
}: {
  process: OperationsProcess | null;
  detailTab: DetailTab;
  onDetailTabChange: (tab: DetailTab) => void;
  onOpenKnowledgeBase?: () => void;
  showTabs?: boolean;
}): JSX.Element {
  if (!process) {
    return (
      <div className="detailPanel">
        <div className="emptyState refined">
          <h3>No process selected</h3>
          <p>Choose a process from the list to inspect its steps, dependencies, inputs, outputs, and knowledge links.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detailPanel processDetail">
      <div className="detailHeader">
        <div>
          <h3>{process.name}</h3>
          <div className="sourceLine">
            <span>{process.code}</span>
            <span>{process.status}</span>
            <span>{process.triggerType}</span>
            <span>{process.criticality}</span>
          </div>
        </div>
      </div>

      {showTabs && (
        <div className="objectTabs" role="tablist" aria-label="Process detail tabs">
          {detailTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={detailTab === tab.id ? 'objectTab active' : 'objectTab'} key={tab.id} onClick={() => onDetailTabChange(tab.id)} role="tab" type="button">
                <Icon aria-hidden="true" size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {detailTab === 'overview' && (
        <div className="detailStack">
          {process.description ? <p className="previewText">{process.description}</p> : <div className="emptyInline">No process description recorded.</div>}
          <ProcessSummary process={process} />
          <div className="gapSummaryRow">
            <span className={process.knowledgeLinkCount === 0 ? 'gapBadge missing' : 'gapBadge satisfied'}>
              {process.knowledgeLinkCount === 0 ? 'missing knowledge links' : 'knowledge linked'}
            </span>
            <span className={process.steps.some((step) => !step.requiredKnowledge) ? 'gapBadge missing' : 'gapBadge satisfied'}>
              {process.steps.some((step) => !step.requiredKnowledge) ? 'step coverage gaps' : 'step knowledge complete'}
            </span>
            <span className={process.inputs.length === 0 ? 'gapBadge missing' : 'gapBadge satisfied'}>
              {process.inputs.length === 0 ? 'no process inputs' : 'inputs defined'}
            </span>
            <span className={process.outputs.length === 0 ? 'gapBadge missing' : 'gapBadge satisfied'}>
              {process.outputs.length === 0 ? 'no process outputs' : 'outputs defined'}
            </span>
          </div>
          {(process.knowledgeLinkCount === 0 || process.steps.some((step) => !step.requiredKnowledge)) && (
            <KnowledgeGapCard
              action={
                onOpenKnowledgeBase ? (
                  <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                    Open Knowledge coverage
                  </button>
                ) : undefined
              }
              coveragePercent={process.knowledgeLinkCount === 0 ? 0 : 100}
              description="Review the required knowledge catalog in Knowledge to close the missing links. Delikat does not generate SOP content here."
              title="Coverage gap detected"
            />
          )}
          <LinkedKnowledgePanel
            emptyLabel="This process does not yet link to approved knowledge objects."
            items={process.knowledgeLinks.map((reference) => ({
              id: reference.id,
              title: reference.title,
              subtitle: reference.subtitle,
              preview: reference.preview,
              status: reference.status,
              notes: reference.code ?? reference.id,
            }))}
            title="Knowledge links"
          />
        </div>
      )}

      {detailTab === 'steps' && (
        <section className="detailSection">
          <h4>Process steps</h4>
          {process.steps.length === 0 ? (
            <div className="emptyInline">No steps have been recorded for this process.</div>
          ) : (
            <div className="timeline">
              {process.steps.map((step) => (
                <article className="timelineItem" key={step.id}>
                  <div>
                    <strong>
                      {step.sequence}. {step.title}
                    </strong>
                    <span>{step.expectedDurationMinutes ? `${step.expectedDurationMinutes} min` : 'Duration not set'}</span>
                  </div>
                  {step.description ? <p>{step.description}</p> : <p>No step description recorded.</p>}
                  {!step.requiredKnowledge && <span className="gapBadge missing stepGap">Missing required knowledge</span>}
                  <div className="referenceGrid compact">
                    <ReferenceChip reference={step.requiredKnowledge} />
                    <ReferenceChip reference={step.requiredEquipment} />
                    <ReferenceChip reference={step.requiredChecklistItem} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {detailTab === 'dependencies' && (
        <section className="detailSection">
          <h4>Dependencies</h4>
          <div className="relationshipColumns">
            <div>
              <h4>Incoming</h4>
              {process.dependenciesIncoming.length === 0 ? (
                <div className="emptyInline">Nothing depends on this process yet.</div>
              ) : (
                <div className="relatedList">
                  {process.dependenciesIncoming.map((dependency) => (
                    <article className="relatedRow" key={dependency.id}>
                      <span className="relationshipBadge incoming">requires</span>
                      <strong>{dependency.process.title}</strong>
                      <span>{dependency.process.status}</span>
                      <span>{dependency.process.subtitle}</span>
                      <span>{dependency.notes ?? 'No notes'}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4>Outgoing</h4>
              {process.dependenciesOutgoing.length === 0 ? (
                <div className="emptyInline">This process does not currently depend on another process.</div>
              ) : (
                <div className="relatedList">
                  {process.dependenciesOutgoing.map((dependency) => (
                    <article className="relatedRow" key={dependency.id}>
                      <span className="relationshipBadge outgoing">requires</span>
                      <strong>{dependency.dependsOn.title}</strong>
                      <span>{dependency.dependsOn.status}</span>
                      <span>{dependency.dependsOn.subtitle}</span>
                      <span>{dependency.notes ?? 'No notes'}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {detailTab === 'inputs' && (
        <ReferencePanel
          emptyLabel="No process inputs have been defined."
          rows={process.inputs.map((link) => ({
            id: link.id,
            label: `${link.sequence}. ${link.title}`,
            description: link.description ?? link.notes,
            reference: link.reference,
          }))}
          title="Consumes"
        />
      )}

      {detailTab === 'outputs' && (
        <ReferencePanel
          emptyLabel="No process outputs have been defined."
          rows={process.outputs.map((link) => ({
            id: link.id,
            label: `${link.sequence}. ${link.title}`,
            description: link.description ?? link.notes,
            reference: link.reference,
          }))}
          title="Produces"
        />
      )}

      {detailTab === 'knowledge' && (
        <section className="detailSection">
          <h4>Knowledge links</h4>
          {process.knowledgeLinks.length === 0 ? (
            <div className="emptyInline">No approved knowledge objects are linked to this process.</div>
          ) : (
            <div className="referenceGrid">
              {process.knowledgeLinks.map((reference) => (
                <KnowledgeLinkCard key={reference.id} reference={reference} />
              ))}
            </div>
          )}
          <div className="readOnlyBanner">
            <strong>Read-only foundation</strong>
            <span>Closing coverage gaps happens in the Knowledge module. Creating or editing these relationships will come later, after users and permissions are added.</span>
          </div>
        </section>
      )}
    </div>
  );
}

function OperationsDashboard({
  data,
  selectedProcess,
  onSelectProcess,
  onOpenKnowledgeBase,
}: {
  data: OperationsEngineData;
  selectedProcess: OperationsProcess | null;
  onSelectProcess: (id: string) => void;
  onOpenKnowledgeBase?: () => void;
}): JSX.Element {
  const critical = data.processes.filter((process) => process.criticality === 'critical').slice(0, 5);
  const missingKnowledge = data.processes.filter((process) => process.knowledgeLinkCount === 0).slice(0, 5);
  const dependencyHubs = [...data.processes]
    .sort((a, b) => b.dependencyCount - a.dependencyCount || a.name.localeCompare(b.name))
    .slice(0, 5);
  const departmentGroups = groupProcessesByDepartment(data.processes);

  return (
    <section className="pageStack operationsEngine">
      <div className="sectionHeader">
        <div>
          <h2>Operations</h2>
          <p>Read-only operational structure built on approved knowledge and live Supabase records.</p>
        </div>
      </div>

      <div className="coverageSummary">
        <MetricCard label="Total Processes" value={data.stats.totalProcesses} helper="Active process records" />
        <MetricCard label="Critical Processes" value={data.stats.criticalProcesses} helper="Criticality set to critical" />
        <MetricCard label="Missing Knowledge" value={data.stats.processesMissingKnowledge} helper="Processes with no knowledge links" />
        <MetricCard label="Avg Steps" value={data.stats.averageStepsPerProcess} helper="Steps per active process" />
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Dependency graph summary</h3>
          <div className="countList">
            <span>
              <strong>Dependency links</strong>
              {data.stats.dependencyLinks}
            </span>
            <span>
              <strong>Connected processes</strong>
              {data.stats.dependencyConnectedProcesses}
            </span>
            <span>
              <strong>Isolated processes</strong>
              {data.stats.isolatedProcesses}
            </span>
          </div>
        </section>
        <section className="countPanel">
          <h3>Top critical processes</h3>
          <div className="countList">
            {critical.length ? (
              critical.map((process) => (
                <span key={process.id}>
                  <strong>{process.name}</strong>
                  {process.priority}
                </span>
              ))
            ) : (
              <span>
                <strong>No critical processes</strong>
                0
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Processes missing knowledge</h3>
          <div className="countList">
            {missingKnowledge.length ? (
              missingKnowledge.map((process) => (
                <span key={process.id}>
                  <strong>{process.name}</strong>
                  {process.stepCount} steps
                </span>
              ))
            ) : (
              <span>
                <strong>No missing knowledge</strong>
                0
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Dependency hubs</h3>
          <div className="countList">
            {dependencyHubs.length ? (
              dependencyHubs.map((process) => (
                <span key={process.id}>
                  <strong>{process.name}</strong>
                  {process.dependencyCount}
                </span>
              ))
            ) : (
              <span>
                <strong>No dependency graph</strong>
                0
              </span>
            )}
          </div>
        </section>
      </div>

      <div className="operationsSidebar">
        <section className="countPanel">
          <h3>Process quick view</h3>
          <div className="countList">
            {departmentGroups.map((group) => (
              <span key={group.department}>
                <strong>{group.department}</strong>
                {group.processes.length} processes
              </span>
            ))}
          </div>
        </section>
        <section className="countPanel">
          <h3>Selected process</h3>
          {selectedProcess ? (
            <div className="countList">
              <span>
                <strong>{selectedProcess.name}</strong>
                {selectedProcess.triggerType}
              </span>
              <span>
                <strong>{selectedProcess.department?.title ?? 'No department'}</strong>
                {selectedProcess.role?.title ?? 'No role'}
              </span>
              <span>
                <strong>{selectedProcess.knowledgeLinkCount} knowledge links</strong>
                {selectedProcess.stepCount} steps
              </span>
            </div>
          ) : (
            <div className="emptyInline">Pick a process from the Process List to inspect it here.</div>
          )}
        </section>
      </div>

      <div className="statusStrip">
        <ShieldCheck aria-hidden="true" size={18} />
        <span>No AI automation, no generated processes, and no write actions are active in Operations.</span>
      </div>

      <div className="sectionHeader">
        <div>
          <h2>Process List</h2>
          <p>Search and inspect active operational processes.</p>
        </div>
      </div>

      <div className="operationsLayout">
        <div className="listPanel">
          <ProcessList processes={data.processes} selectedId={selectedProcess?.id ?? null} onSelect={onSelectProcess} />
        </div>
        <ProcessDetail detailTab="overview" onDetailTabChange={() => undefined} onOpenKnowledgeBase={onOpenKnowledgeBase} process={selectedProcess} showTabs={false} />
      </div>
    </section>
  );
}

interface OperationsModuleProps {
  onOpenKnowledgeBase?: () => void;
}

export function OperationsModule({ onOpenKnowledgeBase }: OperationsModuleProps = {}): JSX.Element {
  const [data, setData] = useState<OperationsEngineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<OperationsTab>('dashboard');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ProcessFilters>(emptyFilters);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  async function refreshData(): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getOperationsEngineData());
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const filteredProcesses = useMemo(
    () => (data ? data.processes.filter((process) => processMatches(process, query, filters)) : []),
    [data, filters, query],
  );

  useEffect(() => {
    if (filteredProcesses.length === 0) {
      if (selectedProcessId !== null) setSelectedProcessId(null);
      return;
    }
    if (!selectedProcessId || !filteredProcesses.some((process) => process.id === selectedProcessId)) {
      setSelectedProcessId(filteredProcesses[0].id);
    }
  }, [filteredProcesses, selectedProcessId]);

  useEffect(() => {
    setDetailTab('overview');
  }, [selectedProcessId]);

  const selectedProcess = data?.processes.find((process) => process.id === selectedProcessId) ?? null;
  const departmentOptions = uniqueValues(data?.processes.map((process) => process.department?.id ?? null) ?? []);
  const roleOptions = uniqueValues(data?.processes.map((process) => process.role?.id ?? null) ?? []);
  const areaOptions = uniqueValues(data?.processes.map((process) => process.area?.id ?? null) ?? []);
  const hasFilters = query || Object.values(filters).some((value) => value !== 'all');

  function clearFilters(): void {
    setQuery('');
    setFilters(emptyFilters);
  }

  return (
    <section className="pageStack operationsEngine">
      <div className="sectionHeader">
        <div>
          <h2>Operations</h2>
          <p>Operational processes, seeded catalog data, steps, dependencies, inputs, outputs, and linked knowledge.</p>
        </div>
        <div className="engineStats" aria-label="Operations counts">
          <span>{data?.stats.totalProcesses ?? '...'} processes</span>
          <span>{data?.stats.criticalProcesses ?? '...'} critical</span>
          <span>{data?.stats.processesMissingKnowledge ?? '...'} missing knowledge</span>
        </div>
      </div>

      {error && (
        <div className="notice error actionNotice">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
          <button className="tableLink" onClick={() => void refreshData()} type="button">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loadingPanel">
          <div className="loadingPulse" />
          <div>
            <strong>Loading Operations Engine</strong>
            <p>Fetching processes, steps, dependencies, inputs, outputs, and linked knowledge.</p>
          </div>
        </div>
      ) : data ? (
        <>
          <div className="tabs" role="tablist" aria-label="Operations views">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: Workflow },
              { id: 'catalog' as const, label: 'Catalog', icon: Layers3 },
              { id: 'processes' as const, label: 'Process List', icon: Boxes },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  aria-selected={tab === item.id}
                  className={tab === item.id ? 'tabButton active' : 'tabButton'}
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  role="tab"
                  type="button"
                >
                  <Icon aria-hidden="true" size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="tabPanel">
            {tab === 'dashboard' && (
              <OperationsDashboard
                data={data}
                onOpenKnowledgeBase={onOpenKnowledgeBase}
                onSelectProcess={setSelectedProcessId}
                selectedProcess={selectedProcess}
              />
            )}
            {tab === 'catalog' && (
              <section className="catalogTab">
                <CatalogScreen data={data} />
                <div className="readOnlyBanner">
                  <strong>Coverage first</strong>
                  <span>
                    Weak coverage is tracked in the Knowledge workspace.
                    {onOpenKnowledgeBase ? (
                      <button className="tableLink inlineAction" onClick={onOpenKnowledgeBase} type="button">
                        Open Knowledge coverage
                      </button>
                    ) : (
                      ' Open the Knowledge workspace to review missing requirements and approved objects.'
                    )}
                  </span>
                </div>
              </section>
            )}

            {tab === 'processes' && (
              <section className="processExplorer">
                <div className="toolbar operationsToolbar">
                  <label className="searchField">
                    <Search aria-hidden="true" size={17} />
                    <input
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search processes, steps, inputs, outputs, and knowledge links"
                      value={query}
                    />
                  </label>
                  <label className="selectField">
                    <span>Status</span>
                    <select onChange={(event) => setFilters({ ...filters, status: event.target.value })} value={filters.status}>
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All' : option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="selectField">
                    <span>Trigger</span>
                    <select onChange={(event) => setFilters({ ...filters, triggerType: event.target.value })} value={filters.triggerType}>
                      {triggerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All' : option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="ontologyFilterGrid operationsFilters">
                  <label className="selectField ontologySelect">
                    <span>Department</span>
                    <select onChange={(event) => setFilters({ ...filters, department: event.target.value })} value={filters.department}>
                      <option value="all">All</option>
                      {departmentOptions.map((id) => {
                        const process = data.processes.find((item) => item.department?.id === id);
                        return (
                          <option key={id} value={id}>
                            {process?.department?.title ?? id}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="selectField ontologySelect">
                    <span>Role</span>
                    <select onChange={(event) => setFilters({ ...filters, role: event.target.value })} value={filters.role}>
                      <option value="all">All</option>
                      {roleOptions.map((id) => {
                        const process = data.processes.find((item) => item.role?.id === id);
                        return (
                          <option key={id} value={id}>
                            {process?.role?.title ?? id}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="selectField ontologySelect">
                    <span>Area</span>
                    <select onChange={(event) => setFilters({ ...filters, area: event.target.value })} value={filters.area}>
                      <option value="all">All</option>
                      {areaOptions.map((id) => {
                        const process = data.processes.find((item) => item.area?.id === id);
                        return (
                          <option key={id} value={id}>
                            {process?.area?.title ?? id}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="selectField ontologySelect">
                    <span>Criticality</span>
                    <select onChange={(event) => setFilters({ ...filters, criticality: event.target.value })} value={filters.criticality}>
                      {criticalityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All' : option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="resultsMeta">
                  Showing {filteredProcesses.length} of {data.processes.length} active processes
                  {hasFilters && (
                    <button className="tableLink inlineAction" onClick={clearFilters} type="button">
                      Clear filters
                    </button>
                  )}
                </div>

                <div className="operationsLayout">
                  <div className="listPanel">
                    <ProcessList processes={filteredProcesses} selectedId={selectedProcessId} onSelect={setSelectedProcessId} />
                  </div>
                  <ProcessDetail
                    detailTab={detailTab}
                    onDetailTabChange={setDetailTab}
                    onOpenKnowledgeBase={onOpenKnowledgeBase}
                    process={selectedProcess}
                  />
                </div>
              </section>
            )}
          </div>
        </>
      ) : (
        <div className="emptyState refined">
          <h3>No operations data</h3>
          <p>Active process records will appear once Supabase contains operational data and the browser can read it safely.</p>
        </div>
      )}
    </section>
  );
}
