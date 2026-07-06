import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Play, type LucideIcon } from 'lucide-react';
import {
  createAuditRunFromTemplate,
  getAuditEngineData,
  type AuditEngineData,
  type AuditRun,
  type AuditTemplate,
} from '../lib/audits';
import {
  createChecklistRunFromTemplate,
  getChecklistEngineData,
  type ChecklistEngineData,
  type ChecklistRun,
  type ChecklistTemplate,
} from '../lib/checklists';
import {
  getKnowledgeEngineData,
  getKnowledgeStats,
  type KnowledgeCoverageResult,
  type KnowledgeCoverageSummary,
  type KnowledgeOntologyStats,
  type KnowledgeStats,
} from '../lib/knowledge';
import { getOperationsEngineData, type OperationsEngineData, type OperationsProcess, type OperationsStats } from '../lib/operations';
import { getTrainingEngineData, type TrainingEngineData, type TrainingPath } from '../lib/training';
import { EmptyState, KnowledgeGapCard, MetricCard, OSCard, StatusBadge } from '../components/os';

interface DashboardPageProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

interface RoleDefinition {
  label: string;
  keywords: string[];
}

interface RoleSummary {
  label: string;
  stateLabel: 'Missing SOP' | 'Foundation ready' | 'Execution not started' | 'Blocked' | 'Ready';
  stateDetail: string;
  trainingPaths: string[];
  processes: string[];
  checklists: string[];
  audits: string[];
  missingKnowledge: string[];
}

interface ExecutionCardProps {
  title: string;
  description: string;
  statusLabel: string;
  statusTone: string;
  meta: string[];
  detail: string;
  actionLabel: string;
  actionIcon?: LucideIcon;
  actionBusyLabel?: string;
  busy?: boolean;
  onAction?: () => void;
}

const roleDefinitions: RoleDefinition[] = [
  { label: 'Mesero / Waiter', keywords: ['waiter', 'mesero', 'server', 'service'] },
  { label: 'Caja / Cashier', keywords: ['cashier', 'caja', 'pos', 'cash'] },
  { label: 'Cocina / Kitchen', keywords: ['kitchen', 'cocina', 'cook', 'chef', 'prep'] },
  { label: 'Bar', keywords: ['bar', 'bartender', 'beverage'] },
  { label: 'Supervisor', keywords: ['supervisor', 'manager', 'shift lead', 'operations manager'] },
];

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toSearchText(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function listTitleCounts(items: string[], emptyLabel: string): string {
  if (!items.length) return emptyLabel;
  return items.join(' · ');
}

function countLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function isMatch<T>(items: T[], keywords: string[], getText: (item: T) => string[]): T[] {
  return items.filter((item) => matchesKeywords(toSearchText(getText(item)), keywords));
}

function roleBadgeStatus(stateLabel: RoleSummary['stateLabel']): string {
  if (stateLabel === 'Ready') return 'active';
  if (stateLabel === 'Missing SOP') return 'missing';
  if (stateLabel === 'Blocked') return 'blocked';
  if (stateLabel === 'Foundation ready' || stateLabel === 'Execution not started') return 'pending';
  return 'neutral';
}

function executionBadgeStatus(status: string): string {
  const value = status.toLowerCase();
  if (value.includes('pass') || value.includes('complete') || value.includes('active')) return 'active';
  if (value.includes('fail') || value.includes('block') || value.includes('cancel')) return 'blocked';
  return 'pending';
}

function checklistRunStateLabel(run?: ChecklistRun): string {
  if (!run) return 'Execution not started';
  if (run.status === 'completed') return 'Completed today';
  if (run.status === 'in_progress') return 'Active today';
  if (run.status === 'cancelled') return 'Blocked';
  return 'Ready';
}

function auditRunStateLabel(run?: AuditRun): string {
  if (!run) return 'Execution not started';
  if (run.status === 'passed') return 'Audit score';
  if (run.status === 'failed') return 'Review score';
  if (run.status === 'in_progress') return 'Active today';
  if (run.status === 'cancelled') return 'Blocked';
  return 'Ready';
}

function summarizeRole(
  definition: RoleDefinition,
  data: {
    trainingEngine: TrainingEngineData | null;
    operationsEngine: OperationsEngineData | null;
    checklistsEngine: ChecklistEngineData | null;
    auditsEngine: AuditEngineData | null;
    coverage: KnowledgeCoverageSummary | null;
  },
): RoleSummary {
  const trainingPaths = isMatch(data.trainingEngine?.paths ?? [], definition.keywords, (path: TrainingPath) => [
    path.title,
    path.description ?? '',
    path.role?.name ?? '',
    path.role?.code ?? '',
    path.department?.name ?? '',
    path.area?.name ?? '',
    path.sourceType,
  ]).map((path) => path.title);

  const processes = isMatch(data.operationsEngine?.processes ?? [], definition.keywords, (process: OperationsProcess) => [
    process.name,
    process.description ?? '',
    process.role?.title ?? '',
    process.department?.title ?? '',
    process.area?.title ?? '',
    process.triggerType,
  ]).map((process) => process.name);

  const checklists = isMatch(data.checklistsEngine?.templates ?? [], definition.keywords, (template: ChecklistTemplate) => [
    template.title,
    template.description ?? '',
    template.role?.title ?? '',
    template.department?.title ?? '',
    template.area?.title ?? '',
    template.process?.name ?? '',
  ]).map((template) => template.title);

  const audits = isMatch(data.auditsEngine?.templates ?? [], definition.keywords, (template: AuditTemplate) => [
    template.title,
    template.description ?? '',
    template.checklistTemplate?.title ?? '',
    template.checklistTemplate?.process?.name ?? '',
    template.auditType,
  ]).map((template) => template.title);

  const missingKnowledge = (data.coverage?.missing ?? [])
    .filter((result) =>
      matchesKeywords(
        toSearchText([
          result.item.title,
          result.item.description ?? '',
          result.item.groupName ?? '',
          ...result.item.ontology.roles.map((entity) => entity.name),
          ...result.item.ontology.departments.map((entity) => entity.name),
          ...result.item.ontology.areas.map((entity) => entity.name),
          ...result.item.ontology.businessProcesses.map((entity) => entity.name),
        ]),
        definition.keywords,
      ),
    )
    .map((result) => result.item.title);

  const hasStructure = trainingPaths.length + processes.length + checklists.length + audits.length > 0;
  const globalExecution =
    (data.trainingEngine?.stats.progressCount ?? 0) + (data.checklistsEngine?.stats.runCount ?? 0) + (data.auditsEngine?.stats.runCount ?? 0);

  let stateLabel: RoleSummary['stateLabel'] = 'Missing SOP';
  let stateDetail = 'No live links yet.';

  if (hasStructure && globalExecution === 0) {
    stateLabel = 'Foundation ready';
    stateDetail = missingKnowledge.length > 0 ? `Execution not started. Next gap: ${missingKnowledge[0]}.` : 'Execution not started yet.';
  } else if (globalExecution > 0 && missingKnowledge.length > 0) {
    stateLabel = 'Blocked';
    stateDetail = `${missingKnowledge.length} missing SOPs still need coverage.`;
  } else if (globalExecution > 0) {
    stateLabel = 'Ready';
    stateDetail = 'Live execution exists and linked knowledge is aligned.';
  }

  return {
    label: definition.label,
    stateLabel,
    stateDetail,
    trainingPaths,
    processes,
    checklists,
    audits,
    missingKnowledge,
  };
}

function ExecutionCard({
  title,
  description,
  statusLabel,
  statusTone,
  meta,
  detail,
  actionLabel,
  actionIcon: Icon = ArrowRight,
  actionBusyLabel = 'Working...',
  busy = false,
  onAction,
}: ExecutionCardProps): JSX.Element {
  return (
    <OSCard className="commandActionCard">
      <div className="commandActionHeader">
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        <StatusBadge status={statusTone} label={statusLabel} />
      </div>
      <div className="commandActionMeta">
        {meta.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <p className="previewText">{detail}</p>
      {onAction ? (
        <div className="commandActionFooter">
          <span className="quietText">{busy ? actionBusyLabel : 'Manager action available'}</span>
          <button className="iconTextButton" disabled={busy} onClick={onAction} type="button">
            <Icon aria-hidden="true" size={16} />
            {busy ? actionBusyLabel : actionLabel}
          </button>
        </div>
      ) : null}
    </OSCard>
  );
}

function RoleCard({ role }: { role: RoleSummary }): JSX.Element {
  return (
    <OSCard className="roleCard">
      <div className="roleCardHeader">
        <div>
          <strong>{role.label}</strong>
          <p>{role.stateDetail}</p>
        </div>
        <StatusBadge status={roleBadgeStatus(role.stateLabel)} label={role.stateLabel} />
      </div>
      <div className="roleCardMeta">
        <span>{countLabel(role.trainingPaths.length, 'training path')}</span>
        <span>{countLabel(role.processes.length, 'process')}</span>
        <span>{countLabel(role.checklists.length, 'checklist template')}</span>
        <span>{countLabel(role.audits.length, 'audit template')}</span>
      </div>
      <div className="roleCardColumns">
        <div>
          <h4>Training</h4>
          <p>{listTitleCounts(role.trainingPaths.slice(0, 3), 'No live training path links yet')}</p>
        </div>
        <div>
          <h4>Operations</h4>
          <p>{listTitleCounts(role.processes.slice(0, 3), 'No live process links yet')}</p>
        </div>
        <div>
          <h4>Execution</h4>
          <p>{listTitleCounts([...role.checklists.slice(0, 2), ...role.audits.slice(0, 2)], 'No checklist or audit templates yet')}</p>
        </div>
        <div>
          <h4>Knowledge gaps</h4>
          <p>{listTitleCounts(role.missingKnowledge.slice(0, 2), 'No role-specific gaps surfaced')}</p>
        </div>
      </div>
    </OSCard>
  );
}

export function DashboardPage({
  onOpenKnowledgeBase,
  onOpenOperations,
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
}: DashboardPageProps): JSX.Element {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [ontologyStats, setOntologyStats] = useState<KnowledgeOntologyStats | null>(null);
  const [coverage, setCoverage] = useState<KnowledgeCoverageSummary | null>(null);
  const [operationsStats, setOperationsStats] = useState<OperationsStats | null>(null);
  const [operationsEngine, setOperationsEngine] = useState<OperationsEngineData | null>(null);
  const [checklistsEngine, setChecklistsEngine] = useState<ChecklistEngineData | null>(null);
  const [auditsEngine, setAuditsEngine] = useState<AuditEngineData | null>(null);
  const [trainingEngine, setTrainingEngine] = useState<TrainingEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const today = todayBusinessDate();

  const refreshData = async (): Promise<void> => {
    const [nextStats, engineData, operationsData, checklistData, auditData, trainingData] = await Promise.all([
      getKnowledgeStats(),
      getKnowledgeEngineData(),
      getOperationsEngineData(),
      getChecklistEngineData(),
      getAuditEngineData(),
      getTrainingEngineData(),
    ]);

    setStats(nextStats);
    setOntologyStats(engineData.ontologyStats);
    setCoverage(engineData.coverage);
    setOperationsStats(operationsData.stats);
    setOperationsEngine(operationsData);
    setChecklistsEngine(checklistData);
    setAuditsEngine(auditData);
    setTrainingEngine(trainingData);
  };

  useEffect(() => {
    let isMounted = true;

    refreshData().catch((reason: unknown) => {
      if (isMounted) {
        setError(reason instanceof Error ? reason.message : 'Unable to load live Supabase data.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const roleSummaries = useMemo(
    () =>
      roleDefinitions.map((definition) =>
        summarizeRole(definition, {
          trainingEngine,
          operationsEngine,
          checklistsEngine,
          auditsEngine,
          coverage,
        }),
      ),
    [auditsEngine, checklistsEngine, coverage, operationsEngine, trainingEngine],
  );

  const checklistTodayRuns = useMemo(
    () => (checklistsEngine?.runs ?? []).filter((run) => run.businessDate === today),
    [checklistsEngine?.runs, today],
  );
  const auditTodayRuns = useMemo(
    () => (auditsEngine?.runs ?? []).filter((run) => run.businessDate === today),
    [auditsEngine?.runs, today],
  );
  const checklistActiveRuns = useMemo(
    () => (checklistsEngine?.runs ?? []).filter((run) => run.status === 'scheduled' || run.status === 'in_progress'),
    [checklistsEngine?.runs],
  );
  const checklistCompletedRuns = useMemo(
    () => (checklistsEngine?.runs ?? []).filter((run) => run.status === 'completed'),
    [checklistsEngine?.runs],
  );
  const auditActiveRuns = useMemo(
    () => (auditsEngine?.runs ?? []).filter((run) => run.status === 'planned' || run.status === 'in_progress'),
    [auditsEngine?.runs],
  );
  const auditCompletedRuns = useMemo(
    () => (auditsEngine?.runs ?? []).filter((run) => run.status === 'passed' || run.status === 'failed'),
    [auditsEngine?.runs],
  );
  const latestAuditScore = useMemo(() => {
    const scoredRuns = (auditsEngine?.runs ?? []).filter((run) => run.totalScore !== null);
    if (!scoredRuns.length) return null;
    return scoredRuns.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.totalScore ?? null;
  }, [auditsEngine?.runs]);

  const checklistRunByTemplateId = useMemo(() => {
    const map = new Map<string, ChecklistRun>();
    for (const run of checklistTodayRuns) {
      if (!run.checklistTemplateId) continue;
      map.set(run.checklistTemplateId, run);
    }
    return map;
  }, [checklistTodayRuns]);

  const auditRunByTemplateId = useMemo(() => {
    const map = new Map<string, AuditRun>();
    for (const run of auditTodayRuns) {
      map.set(run.auditTemplateId, run);
    }
    return map;
  }, [auditTodayRuns]);

  const activeChecklistTemplates = useMemo(
    () =>
      (checklistsEngine?.templates ?? [])
        .filter((template) => template.status === 'active')
        .slice()
        .sort((a, b) => b.openRunCount - a.openRunCount || b.itemCount - a.itemCount || a.title.localeCompare(b.title)),
    [checklistsEngine?.templates],
  );

  const activeAuditTemplates = useMemo(
    () =>
      (auditsEngine?.templates ?? [])
        .filter((template) => template.status === 'active')
        .slice()
        .sort((a, b) => b.openRunCount - a.openRunCount || b.itemCount - a.itemCount || a.title.localeCompare(b.title)),
    [auditsEngine?.templates],
  );

  const checklistStartTemplates = useMemo(
    () => activeChecklistTemplates.filter((template) => !checklistRunByTemplateId.has(template.id)).slice(0, 3),
    [activeChecklistTemplates, checklistRunByTemplateId],
  );

  const auditStartTemplates = useMemo(
    () => activeAuditTemplates.filter((template) => !auditRunByTemplateId.has(template.id)).slice(0, 3),
    [activeAuditTemplates, auditRunByTemplateId],
  );

  const topMissingKnowledge = coverage?.topMissing.slice(0, 4) ?? [];

  const nextBuildSteps = useMemo(() => {
    const steps: string[] = [];
    if (topMissingKnowledge[0]) {
      steps.push(`Close the ${topMissingKnowledge[0].item.title} gap first.`);
    }
    if ((checklistsEngine?.stats.runCount ?? 0) === 0) {
      steps.push('Start the first checklist run.');
    }
    if ((auditsEngine?.stats.runCount ?? 0) === 0) {
      steps.push('Start the first audit run.');
    }
    if ((trainingEngine?.stats.progressCount ?? 0) === 0) {
      steps.push('Create the first training progress records.');
    }
    if ((coverage?.missingCount ?? 0) === 0) {
      steps.push('Keep approved knowledge current as new work is added.');
    }
    return steps.slice(0, 4);
  }, [auditsEngine?.stats.runCount, checklistsEngine?.stats.runCount, coverage?.missingCount, topMissingKnowledge, trainingEngine?.stats.progressCount]);

  async function startChecklist(template: ChecklistTemplate): Promise<void> {
    setBusyActionId(`checklist:${template.id}`);
    setError(null);
    setActivityMessage(null);
    try {
      const result = await createChecklistRunFromTemplate(template.id);
      setActivityMessage(result.created ? `Started ${template.title} for today.` : `${template.title} already had a run for today.`);
      await refreshData();
      onOpenChecklists?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start the checklist run.');
    } finally {
      setBusyActionId(null);
    }
  }

  async function startAudit(template: AuditTemplate): Promise<void> {
    setBusyActionId(`audit:${template.id}`);
    setError(null);
    setActivityMessage(null);
    try {
      const result = await createAuditRunFromTemplate(template.id);
      setActivityMessage(result.created ? `Started ${template.title} for today.` : `${template.title} already had a run for today.`);
      await refreshData();
      onOpenAudits?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start the audit run.');
    } finally {
      setBusyActionId(null);
    }
  }

  const checklistTodaySummary = [
    { label: 'Runs today', value: checklistTodayRuns.length },
    { label: 'Active runs', value: checklistActiveRuns.length },
    { label: 'Completed runs', value: checklistCompletedRuns.length },
  ];

  const auditTodaySummary = [
    { label: 'Runs today', value: auditTodayRuns.length },
    { label: 'Active runs', value: auditActiveRuns.length },
    { label: 'Completed runs', value: auditCompletedRuns.length },
    { label: 'Audit score', value: latestAuditScore ?? '—' },
  ];

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Daily Command Center</h2>
          <p>Today’s execution first, with knowledge coverage and readiness signals ready for managers.</p>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {activityMessage && (
        <div className="notice success">
          <CheckCircle2 aria-hidden="true" size={18} />
          <span>{activityMessage}</span>
        </div>
      )}

      <div className="metricGrid dashboardSummaryGrid">
        <MetricCard label="Knowledge foundation" value={stats?.canonicalKnowledge ?? '...'} helper={`${stats?.manuals ?? '...'} manuals, ${stats?.sourceSections ?? '...'} source sections`} />
        <MetricCard
          label="Operations readiness"
          value={operationsStats?.totalProcesses ?? '...'}
          helper={`${operationsStats?.criticalProcesses ?? '...'} critical processes`}
        />
        <MetricCard
          label="Training readiness"
          value={trainingEngine?.stats.totalPaths ?? '...'}
          helper={(trainingEngine?.stats.progressCount ?? 0) === 0 ? 'Foundation ready, execution not started' : `${trainingEngine?.stats.pathsWithGaps ?? '...'} paths with gaps`}
        />
        <MetricCard
          label="Checklist readiness"
          value={checklistsEngine?.stats.totalTemplates ?? '...'}
          helper={(checklistsEngine?.stats.runCount ?? 0) === 0 ? 'Foundation ready, execution not started' : `${checklistsEngine?.stats.templatesWithGaps ?? '...'} templates with gaps`}
        />
        <MetricCard
          label="Audit readiness"
          value={auditsEngine?.stats.totalTemplates ?? '...'}
          helper={(auditsEngine?.stats.runCount ?? 0) === 0 ? 'Foundation ready, execution not started' : `${auditsEngine?.stats.templatesWithGaps ?? '...'} templates with gaps`}
        />
        <MetricCard label="Missing SOP" value={coverage?.missingCount ?? '...'} helper={`Coverage ${coverage?.coveragePercent ?? '...'}%`} />
      </div>

      <div className="dashboardFocusGrid">
        <section className="countPanel">
          <h3>Today’s checklist runs</h3>
          <div className="countList compactCounts">
            {checklistTodaySummary.map((item) => (
              <span key={item.label}>
                <strong>{item.label}</strong>
                {item.value}
              </span>
            ))}
          </div>
          <div className="dashboardCardStack">
            {checklistTodayRuns.length ? (
              checklistTodayRuns.map((run) => {
                const template = checklistsEngine?.templates.find((entry) => entry.id === run.checklistTemplateId) ?? null;
                const actionLabel = run.status === 'completed' ? 'Review completed checklist' : 'Continue active checklist';

                return (
                  <ExecutionCard
                    key={run.id}
                    title={run.templateTitle ?? template?.title ?? 'Checklist run'}
                    description={template?.description ?? 'Daily checklist execution from the live catalog.'}
                    statusLabel={checklistRunStateLabel(run)}
                    statusTone={executionBadgeStatus(run.status)}
                    meta={[
                      `${run.completedCount}/${run.itemCount} completed`,
                      `Business date ${formatDate(run.businessDate)}`,
                      template?.process?.name ?? 'Linked process',
                    ]}
                    detail={run.status === 'completed' ? 'The checklist is complete and ready for review.' : 'Continue the live checklist run from the Checklists workspace.'}
                    actionLabel={actionLabel}
                    busy={false}
                    onAction={() => onOpenChecklists?.()}
                  />
                );
              })
            ) : (
              <EmptyState title="No checklist runs today" description="A manager can start the first checklist from the seeded templates below." action={onOpenChecklists ? <button className="iconTextButton" onClick={onOpenChecklists} type="button">Open Checklists</button> : undefined} />
            )}
            {checklistStartTemplates.length ? (
              <>
                <div className="quietText">Start a checklist</div>
                {checklistStartTemplates.map((template) => (
                  <ExecutionCard
                    key={template.id}
                    title={template.title}
                    description={template.description ?? 'Checklist scaffold derived from live process steps.'}
                    statusLabel="Execution not started"
                    statusTone="pending"
                    meta={[template.process?.name ?? 'Linked process', `${template.itemCount} items`, template.frequency ?? 'No frequency set']}
                    detail="No run exists for today yet. Start the checklist to begin execution tracking."
                    actionLabel="Start checklist"
                    actionIcon={Play}
                    actionBusyLabel="Starting checklist..."
                    busy={busyActionId === `checklist:${template.id}`}
                    onAction={() => void startChecklist(template)}
                  />
                ))}
              </>
            ) : null}
          </div>
        </section>

        <section className="countPanel">
          <h3>Today’s audit runs</h3>
          <div className="countList compactCounts">
            {auditTodaySummary.map((item) => (
              <span key={item.label}>
                <strong>{item.label}</strong>
                {item.value}
              </span>
            ))}
          </div>
          <div className="dashboardCardStack">
            {auditTodayRuns.length ? (
              auditTodayRuns.map((run) => {
                const template = auditsEngine?.templates.find((entry) => entry.id === run.auditTemplateId) ?? null;
                const actionLabel =
                  run.status === 'passed' || run.status === 'failed' ? 'Review audit score' : run.status === 'in_progress' ? 'Continue active audit' : 'Open audit';

                return (
                  <ExecutionCard
                    key={run.id}
                    title={run.templateTitle ?? template?.title ?? 'Audit run'}
                    description={template?.description ?? 'Audit execution derived from the live checklist foundation.'}
                    statusLabel={auditRunStateLabel(run)}
                    statusTone={executionBadgeStatus(run.status)}
                    meta={[
                      `${run.completedCount}/${run.itemCount} completed`,
                      `Business date ${formatDate(run.businessDate)}`,
                      `Audit score ${run.totalScore ?? '—'}`,
                    ]}
                    detail={run.totalScore !== null ? `Current audit score is ${run.totalScore}.` : 'Continue the live audit run from the Audits workspace.'}
                    actionLabel={actionLabel}
                    actionIcon={ArrowRight}
                    actionBusyLabel="Opening audit..."
                    busy={false}
                    onAction={() => onOpenAudits?.()}
                  />
                );
              })
            ) : (
              <EmptyState title="No audit runs today" description="A manager can start the first audit from the seeded templates below." action={onOpenAudits ? <button className="iconTextButton" onClick={onOpenAudits} type="button">Open Audits</button> : undefined} />
            )}
            {auditStartTemplates.length ? (
              <>
                <div className="quietText">Start an audit</div>
                {auditStartTemplates.map((template) => (
                  <ExecutionCard
                    key={template.id}
                    title={template.title}
                    description={template.description ?? 'Audit scaffold derived from live checklist templates and process steps.'}
                    statusLabel="Execution not started"
                    statusTone="pending"
                    meta={[template.auditType, template.checklistTemplate?.title ?? 'Linked checklist', `${template.itemCount} items`]}
                    detail="No audit run exists for today yet. Start the audit to begin compliance tracking."
                    actionLabel="Start audit"
                    actionIcon={Play}
                    actionBusyLabel="Starting audit..."
                    busy={busyActionId === `audit:${template.id}`}
                    onAction={() => void startAudit(template)}
                  />
                ))}
              </>
            ) : null}
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Training readiness</h3>
          <div className="countList">
            <span>
              <strong>Total training paths</strong>
              {trainingEngine?.stats.totalPaths ?? '...'}
            </span>
            <span>
              <strong>Training items</strong>
              {trainingEngine?.stats.totalItems ?? '...'}
            </span>
            <span>
              <strong>Paths with gaps</strong>
              {trainingEngine?.stats.pathsWithGaps ?? '...'}
            </span>
            <span>
              <strong>Missing SOP</strong>
              {trainingEngine?.stats.itemsMissingCoverage ?? '...'}
            </span>
            <span>
              <strong>Execution state</strong>
              {(trainingEngine?.stats.progressCount ?? 0) === 0 ? 'Execution not started' : 'Ready'}
            </span>
          </div>
          {onOpenTraining ? (
            <button className="iconTextButton inlineAction" onClick={onOpenTraining} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open Training
            </button>
          ) : null}
        </section>
        <section className="countPanel">
          <h3>Operations readiness</h3>
          <div className="countList">
            <span>
              <strong>Total processes</strong>
              {operationsStats?.totalProcesses ?? '...'}
            </span>
            <span>
              <strong>Critical processes</strong>
              {operationsStats?.criticalProcesses ?? '...'}
            </span>
            <span>
              <strong>Missing SOP</strong>
              {operationsStats?.processesMissingKnowledge ?? '...'}
            </span>
            <span>
              <strong>Average steps</strong>
              {operationsStats?.averageStepsPerProcess ?? '...'}
            </span>
            <span>
              <strong>Execution state</strong>
              {(operationsStats?.totalProcesses ?? 0) === 0 ? 'Execution not started' : 'Ready'}
            </span>
          </div>
          {onOpenOperations ? (
            <button className="iconTextButton inlineAction" onClick={onOpenOperations} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open Operations
            </button>
          ) : null}
        </section>
        <section className="countPanel">
          <h3>Coverage warnings</h3>
          <div className="dashboardCardStack">
            {topMissingKnowledge.length ? (
              topMissingKnowledge.map((result: KnowledgeCoverageResult) => (
                <KnowledgeGapCard
                  key={result.item.id}
                  title={result.item.title}
                  description={result.item.groupName ?? 'Required knowledge'}
                  detail={result.item.description ?? undefined}
                  coveragePercent={0}
                  action={
                    onOpenKnowledgeBase ? (
                      <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                        <ArrowRight aria-hidden="true" size={16} />
                        Open Knowledge
                      </button>
                    ) : undefined
                  }
                />
              ))
            ) : (
              <EmptyState
                title="No missing SOPs"
                description="Approved knowledge currently satisfies the visible requirements."
                action={onOpenKnowledgeBase ? <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">Review Knowledge</button> : undefined}
              />
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Next recommended build steps</h3>
          <div className="nextStepsPanel">
            {nextBuildSteps.length ? (
              nextBuildSteps.map((step) => (
                <div className="nextStepRow" key={step}>
                  <ArrowRight aria-hidden="true" size={16} />
                  <span>{step}</span>
                </div>
              ))
            ) : (
              <div className="emptyInline">No next steps detected.</div>
            )}
          </div>
        </section>
      </div>

      <div className="roleGrid">
        {roleSummaries.map((role) => (
          <RoleCard key={role.label} role={role} />
        ))}
      </div>

      <div className="dashboardOntology">
        <section className="countPanel">
          <h3>Objects by department</h3>
          <div className="countList">
            {ontologyStats?.objectsByDepartment.length ? (
              ontologyStats.objectsByDepartment.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.count}
                </span>
              ))
            ) : (
              <span>
                <strong>No department classifications</strong>
                0
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Objects by role</h3>
          <div className="countList">
            {ontologyStats?.objectsByRole.length ? (
              ontologyStats.objectsByRole.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.count}
                </span>
              ))
            ) : (
              <span>
                <strong>No role classifications</strong>
                0
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Objects by document type</h3>
          <div className="countList">
            {ontologyStats?.objectsByDocumentType.length ? (
              ontologyStats.objectsByDocumentType.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.count}
                </span>
              ))
            ) : (
              <span>
                <strong>No document type classifications</strong>
                0
              </span>
            )}
          </div>
        </section>
        <section className="metricCard ontologyUnclassified">
          <span>Objects without classification</span>
          <strong>{ontologyStats?.objectsWithoutClassification ?? '...'}</strong>
        </section>
      </div>

      <div className="statusStrip">
        <CheckCircle2 aria-hidden="true" size={18} />
        <span>No OpenAI calls, embeddings, generated SOPs, or markdown-file reads are used by this app.</span>
      </div>
    </section>
  );
}
