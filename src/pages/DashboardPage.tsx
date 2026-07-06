import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  getKnowledgeEngineData,
  getKnowledgeStats,
  type KnowledgeCoverageResult,
  type KnowledgeCoverageSummary,
  type KnowledgeOntologyStats,
  type KnowledgeStats,
} from '../lib/knowledge';
import { getOperationsEngineData, type OperationsEngineData, type OperationsProcess, type OperationsStats } from '../lib/operations';
import { getChecklistEngineData, type ChecklistEngineData, type ChecklistTemplate } from '../lib/checklists';
import { getAuditEngineData, type AuditEngineData, type AuditTemplate } from '../lib/audits';
import { getTrainingEngineData, type TrainingEngineData, type TrainingPath } from '../lib/training';
import { KnowledgeGapCard, MetricCard, OSCard, StatusBadge } from '../components/os';

interface RoleDefinition {
  label: string;
  keywords: string[];
}

interface RoleSummary {
  label: string;
  stateLabel: string;
  stateDetail: string;
  trainingPaths: string[];
  processes: string[];
  checklists: string[];
  audits: string[];
  missingKnowledge: string[];
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

function roleLabelFromState(state: RoleSummary['stateLabel']): string {
  if (state === 'Operational') return 'active';
  if (state === 'Foundation ready') return 'draft';
  if (state === 'Next step needed') return 'pending';
  return 'missing';
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

  let stateLabel: RoleSummary['stateLabel'] = 'Not yet modeled';
  let stateDetail = 'No live links yet.';

  if (hasStructure && globalExecution === 0) {
    stateLabel = 'Foundation ready';
    stateDetail = missingKnowledge.length > 0 ? `Execution not started yet. Next step needed: ${missingKnowledge[0]}.` : 'Execution not started yet.';
  } else if (globalExecution > 0 && missingKnowledge.length > 0) {
    stateLabel = 'Next step needed';
    stateDetail = `${missingKnowledge.length} missing knowledge warnings still need coverage.`;
  } else if (globalExecution > 0) {
    stateLabel = 'Operational';
    stateDetail = 'Live execution exists and the linked knowledge is aligned.';
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

function RoleCard({ role }: { role: RoleSummary }): JSX.Element {
  return (
    <OSCard className="roleCard">
      <div className="roleCardHeader">
        <div>
          <strong>{role.label}</strong>
          <p>{role.stateDetail}</p>
        </div>
        <StatusBadge status={roleLabelFromState(role.stateLabel)} label={role.stateLabel} />
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

export function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [ontologyStats, setOntologyStats] = useState<KnowledgeOntologyStats | null>(null);
  const [coverage, setCoverage] = useState<KnowledgeCoverageSummary | null>(null);
  const [operationsStats, setOperationsStats] = useState<OperationsStats | null>(null);
  const [operationsEngine, setOperationsEngine] = useState<OperationsEngineData | null>(null);
  const [checklistsEngine, setChecklistsEngine] = useState<ChecklistEngineData | null>(null);
  const [auditsEngine, setAuditsEngine] = useState<AuditEngineData | null>(null);
  const [trainingEngine, setTrainingEngine] = useState<TrainingEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayBusinessDate();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getKnowledgeStats(),
      getKnowledgeEngineData(),
      getOperationsEngineData(),
      getChecklistEngineData(),
      getAuditEngineData(),
      getTrainingEngineData(),
    ])
      .then(([nextStats, engineData, operationsData, checklistData, auditData, trainingData]) => {
        if (!isMounted) return;
        setStats(nextStats);
        setOntologyStats(engineData.ontologyStats);
        setCoverage(engineData.coverage);
        setOperationsStats(operationsData.stats);
        setOperationsEngine(operationsData);
        setChecklistsEngine(checklistData);
        setAuditsEngine(auditData);
        setTrainingEngine(trainingData);
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(reason instanceof Error ? reason.message : 'Unable to load Supabase counts.');
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

  const checklistTodayRuns = useMemo(() => (checklistsEngine?.runs ?? []).filter((run) => run.businessDate === today), [checklistsEngine?.runs, today]);
  const auditTodayRuns = useMemo(() => (auditsEngine?.runs ?? []).filter((run) => run.businessDate === today), [auditsEngine?.runs, today]);
  const checklistActiveRuns = useMemo(() => (checklistsEngine?.runs ?? []).filter((run) => run.status === 'scheduled' || run.status === 'in_progress'), [checklistsEngine?.runs]);
  const checklistCompletedRuns = useMemo(() => (checklistsEngine?.runs ?? []).filter((run) => run.status === 'completed'), [checklistsEngine?.runs]);
  const auditActiveRuns = useMemo(() => (auditsEngine?.runs ?? []).filter((run) => run.status === 'planned' || run.status === 'in_progress'), [auditsEngine?.runs]);
  const auditCompletedRuns = useMemo(() => (auditsEngine?.runs ?? []).filter((run) => run.status === 'passed' || run.status === 'failed'), [auditsEngine?.runs]);
  const latestAuditScore = useMemo(() => {
    const scoredRuns = (auditsEngine?.runs ?? []).filter((run) => run.totalScore !== null);
    if (!scoredRuns.length) return null;
    return scoredRuns.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.totalScore ?? null;
  }, [auditsEngine?.runs]);

  const topMissingKnowledge = coverage?.topMissing.slice(0, 4) ?? [];

  const nextBuildSteps = useMemo(() => {
    const steps: string[] = [];
    if (topMissingKnowledge[0]) {
      steps.push(`Close the ${topMissingKnowledge[0].item.title} gap first.`);
    }
    if ((trainingEngine?.stats.progressCount ?? 0) === 0) {
      steps.push('Start the first training progress records.');
    }
    if ((checklistsEngine?.stats.runCount ?? 0) === 0) {
      steps.push('Start the first checklist runs.');
    }
    if ((auditsEngine?.stats.runCount ?? 0) === 0) {
      steps.push('Start the first audit runs.');
    }
    if ((coverage?.missingCount ?? 0) === 0) {
      steps.push('Keep approved knowledge current as new work is added.');
    }
    return steps.slice(0, 4);
  }, [auditsEngine?.stats.runCount, checklistsEngine?.stats.runCount, coverage?.missingCount, topMissingKnowledge, trainingEngine?.stats.progressCount]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>System Overview</h2>
          <p>Role-oriented command surface for Delikat OS live knowledge, execution readiness, and coverage gaps.</p>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="metricGrid dashboardSummaryGrid">
        <MetricCard label="Knowledge foundation" value={stats?.canonicalKnowledge ?? '...'} helper={`${stats?.manuals ?? '...'} manuals, ${stats?.sourceSections ?? '...'} source sections`} />
        <MetricCard label="Operations readiness" value={operationsStats?.totalProcesses ?? '...'} helper={`${operationsStats?.criticalProcesses ?? '...'} critical processes`} />
        <MetricCard
          label="Training readiness"
          value={trainingEngine?.stats.totalPaths ?? '...'}
          helper={
            (trainingEngine?.stats.progressCount ?? 0) === 0
              ? 'Foundation ready, execution not started'
              : `${trainingEngine?.stats.pathsWithGaps ?? '...'} paths with gaps`
          }
        />
        <MetricCard
          label="Checklist readiness"
          value={checklistsEngine?.stats.totalTemplates ?? '...'}
          helper={
            (checklistsEngine?.stats.runCount ?? 0) === 0
              ? 'Foundation ready, execution not started'
              : `${checklistsEngine?.stats.templatesWithGaps ?? '...'} templates with gaps`
          }
        />
        <MetricCard
          label="Audit readiness"
          value={auditsEngine?.stats.totalTemplates ?? '...'}
          helper={
            (auditsEngine?.stats.runCount ?? 0) === 0
              ? 'Foundation ready, execution not started'
              : `${auditsEngine?.stats.templatesWithGaps ?? '...'} templates with gaps`
          }
        />
        <MetricCard label="Missing knowledge" value={coverage?.missingCount ?? '...'} helper={`Coverage ${coverage?.coveragePercent ?? '...'}%`} />
      </div>

      <div className="dashboardFocusGrid">
        <section className="countPanel">
          <h3>Knowledge coverage</h3>
          <div className="coverageHero">
            <span>Approved coverage</span>
            <strong>{coverage ? `${coverage.coveragePercent}%` : '...'}</strong>
            <p>{coverage ? `${coverage.existingCount} of ${coverage.requiredCount} required items satisfied` : 'Loading required knowledge coverage'}</p>
          </div>
          <div className="countList">
            <span>
              <strong>Required items</strong>
              {coverage?.requiredCount ?? '...'}
            </span>
            <span>
              <strong>Missing items</strong>
              {coverage?.missingCount ?? '...'}
            </span>
            <span>
              <strong>Recently completed</strong>
              {coverage?.recentlyCompleted.length ?? '...'}
            </span>
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

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Coverage by department</h3>
          <div className="countList">
            {coverage?.byDepartment.length ? (
              coverage.byDepartment.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.coveragePercent}%
                </span>
              ))
            ) : (
              <span>
                <strong>No department requirements</strong>
                0%
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Coverage by role</h3>
          <div className="countList">
            {coverage?.byRole.length ? (
              coverage.byRole.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.coveragePercent}%
                </span>
              ))
            ) : (
              <span>
                <strong>No role requirements</strong>
                0%
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Coverage by area</h3>
          <div className="countList">
            {coverage?.byArea.length ? (
              coverage.byArea.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.coveragePercent}%
                </span>
              ))
            ) : (
              <span>
                <strong>No area requirements</strong>
                0%
              </span>
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Coverage by process</h3>
          <div className="countList">
            {coverage?.byBusinessProcess.length ? (
              coverage.byBusinessProcess.slice(0, 6).map((item) => (
                <span key={item.id}>
                  <strong>{item.name}</strong>
                  {item.coveragePercent}%
                </span>
              ))
            ) : (
              <span>
                <strong>No process requirements</strong>
                0%
              </span>
            )}
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Top missing knowledge</h3>
          <div className="dashboardCardStack">
            {topMissingKnowledge.length ? (
              topMissingKnowledge.map((result: KnowledgeCoverageResult) => (
                <KnowledgeGapCard
                  key={result.item.id}
                  title={result.item.title}
                  description={result.item.groupName ?? 'Required knowledge'}
                  detail={result.item.description ?? undefined}
                  coveragePercent={0}
                />
              ))
            ) : (
              <MetricCard label="No missing knowledge" value="0" />
            )}
          </div>
        </section>
        <section className="countPanel">
          <h3>Recently completed knowledge</h3>
          <div className="dashboardCardStack">
            {coverage?.recentlyCompleted.length ? (
              coverage.recentlyCompleted.slice(0, 6).map((result) => (
                <MetricCard
                  key={result.item.id}
                  label={result.item.title}
                  value={result.matchedObjects.length}
                  helper={result.completedAt ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(result.completedAt))}` : undefined}
                />
              ))
            ) : (
              <MetricCard label="No completed requirements" value="0" />
            )}
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Operations summary</h3>
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
              <strong>Missing knowledge</strong>
              {operationsStats?.processesMissingKnowledge ?? '...'}
            </span>
            <span>
              <strong>Avg steps per process</strong>
              {operationsStats?.averageStepsPerProcess ?? '...'}
            </span>
          </div>
        </section>
        <section className="countPanel">
          <h3>Dependency graph</h3>
          <div className="countList">
            <span>
              <strong>Dependency links</strong>
              {operationsStats?.dependencyLinks ?? '...'}
            </span>
            <span>
              <strong>Connected processes</strong>
              {operationsStats?.dependencyConnectedProcesses ?? '...'}
            </span>
            <span>
              <strong>Isolated processes</strong>
              {operationsStats?.isolatedProcesses ?? '...'}
            </span>
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Training foundation</h3>
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
              <strong>Missing coverage</strong>
              {trainingEngine?.stats.itemsMissingCoverage ?? '...'}
            </span>
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Checklist readiness</h3>
          <div className="countList">
            <span>
              <strong>Total templates</strong>
              {checklistsEngine?.stats.totalTemplates ?? '...'}
            </span>
            <span>
              <strong>Total checklist items</strong>
              {checklistsEngine?.stats.totalItems ?? '...'}
            </span>
            <span>
              <strong>Templates with gaps</strong>
              {checklistsEngine?.stats.templatesWithGaps ?? '...'}
            </span>
            <span>
              <strong>Missing coverage</strong>
              {checklistsEngine?.stats.itemsMissingCoverage ?? '...'}
            </span>
            <span>
              <strong>Today’s runs</strong>
              {checklistTodayRuns.length}
            </span>
            <span>
              <strong>Execution state</strong>
              {(checklistsEngine?.stats.runCount ?? 0) === 0 ? 'Foundation ready, execution not started' : checklistTodayRuns.length > 0 ? 'Active today' : 'Ready, waiting for today'}
            </span>
          </div>
        </section>
        <section className="countPanel">
          <h3>Checklist execution</h3>
          <div className="countList">
            <span>
              <strong>Runs</strong>
              {checklistsEngine?.stats.runCount ?? '...'}
            </span>
            <span>
              <strong>Active runs</strong>
              {checklistActiveRuns.length}
            </span>
            <span>
              <strong>Completed runs</strong>
              {checklistCompletedRuns.length}
            </span>
            <span>
              <strong>Latest template update</strong>
              {checklistsEngine?.templates.length ? formatDate(checklistsEngine.templates[0].updatedAt) : '...'}
            </span>
            <span>
              <strong>Execution state</strong>
              {(checklistsEngine?.stats.runCount ?? 0) === 0 ? 'Not yet operational' : 'Operational'}
            </span>
          </div>
        </section>
      </div>

      <div className="dashboardCoverageGrid">
        <section className="countPanel">
          <h3>Audit readiness</h3>
          <div className="countList">
            <span>
              <strong>Total templates</strong>
              {auditsEngine?.stats.totalTemplates ?? '...'}
            </span>
            <span>
              <strong>Total audit items</strong>
              {auditsEngine?.stats.totalItems ?? '...'}
            </span>
            <span>
              <strong>Templates with gaps</strong>
              {auditsEngine?.stats.templatesWithGaps ?? '...'}
            </span>
            <span>
              <strong>No audit runs yet</strong>
              {(auditsEngine?.stats.runCount ?? 0) === 0 ? 'Yes' : 'No'}
            </span>
            <span>
              <strong>Today’s runs</strong>
              {auditTodayRuns.length}
            </span>
            <span>
              <strong>Execution state</strong>
              {(auditsEngine?.stats.runCount ?? 0) === 0 ? 'Foundation ready, execution not started' : auditTodayRuns.length > 0 ? 'Active today' : 'Ready, waiting for today'}
            </span>
          </div>
        </section>
        <section className="countPanel">
          <h3>Audit execution</h3>
          <div className="countList">
            <span>
              <strong>Runs</strong>
              {auditsEngine?.stats.runCount ?? '...'}
            </span>
            <span>
              <strong>Active runs</strong>
              {auditActiveRuns.length}
            </span>
            <span>
              <strong>Completed runs</strong>
              {auditCompletedRuns.length}
            </span>
            <span>
              <strong>Completed run records</strong>
              {auditsEngine?.stats.completedRunCount ?? '...'}
            </span>
            <span>
              <strong>Latest audit score</strong>
              {latestAuditScore ?? '...'}
            </span>
            <span>
              <strong>Execution state</strong>
              {(auditsEngine?.stats.runCount ?? 0) === 0 ? 'Not yet operational' : 'Operational'}
            </span>
          </div>
        </section>
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
