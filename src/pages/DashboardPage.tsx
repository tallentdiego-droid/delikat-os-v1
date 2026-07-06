import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getKnowledgeEngineData,
  getKnowledgeStats,
  type KnowledgeCoverageSummary,
  type KnowledgeOntologyStats,
  type KnowledgeStats,
} from '../lib/knowledge';
import { getOperationsEngineData, type OperationsStats } from '../lib/operations';
import type { OperationsEngineData } from '../lib/operations';
import { getTrainingEngineData, type TrainingEngineData } from '../lib/training';
import { KnowledgeGapCard, MetricCard } from '../components/os';

export function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [ontologyStats, setOntologyStats] = useState<KnowledgeOntologyStats | null>(null);
  const [coverage, setCoverage] = useState<KnowledgeCoverageSummary | null>(null);
  const [operationsStats, setOperationsStats] = useState<OperationsStats | null>(null);
  const [operationsEngine, setOperationsEngine] = useState<OperationsEngineData | null>(null);
  const [trainingEngine, setTrainingEngine] = useState<TrainingEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getKnowledgeStats(), getKnowledgeEngineData(), getOperationsEngineData(), getTrainingEngineData()])
      .then(([nextStats, engineData, operationsData, trainingData]) => {
        if (isMounted) {
          setStats(nextStats);
          setOntologyStats(engineData.ontologyStats);
          setCoverage(engineData.coverage);
          setOperationsStats(operationsData.stats);
          setOperationsEngine(operationsData);
          setTrainingEngine(trainingData);
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(reason instanceof Error ? reason.message : 'Unable to load Supabase counts.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const starterProcessGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const process of operationsEngine?.processes ?? []) {
      const key = process.department?.title ?? 'Unassigned';
      groups.set(key, [...(groups.get(key) ?? []), process.name]);
    }

    return Array.from(groups.entries())
      .map(([department, processes]) => ({ department, processes }))
      .sort((a, b) => a.department.localeCompare(b.department));
  }, [operationsEngine]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>System Overview</h2>
          <p>First production surface for Delikat OS live knowledge.</p>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="metricGrid dashboardSummaryGrid">
        <MetricCard
          helper={`${stats?.manuals ?? '...'} manuals, ${stats?.sourceSections ?? '...'} source sections`}
          label="Knowledge foundation"
          value={stats?.canonicalKnowledge ?? '...'}
        />
        <MetricCard
          helper={`${operationsStats?.criticalProcesses ?? '...'} critical processes`}
          label="Operations readiness"
          value={operationsStats?.totalProcesses ?? '...'}
        />
        <MetricCard
          helper={`${trainingEngine?.stats.pathsWithGaps ?? '...'} paths with gaps`}
          label="Training paths"
          value={trainingEngine?.stats.totalPaths ?? '...'}
        />
        <MetricCard
          helper={`${coverage?.requiredCount ?? '...'} required items`}
          label="Coverage gaps"
          value={coverage?.missingCount ?? '...'}
        />
        <MetricCard
          helper="Missing SOP / knowledge count"
          label="Missing knowledge"
          value={coverage?.missingCount ?? '...'}
        />
      </div>

      <div className="coverageSummary dashboardCoverage">
        <div className="coverageHero">
          <span>Knowledge coverage</span>
          <strong>{coverage ? `${coverage.coveragePercent}%` : '...'}</strong>
          <p>
            {coverage ? `${coverage.existingCount} of ${coverage.requiredCount} required items satisfied` : 'Loading required knowledge coverage'}
          </p>
        </div>
        <MetricCard label="Required items" value={coverage?.requiredCount ?? '...'} />
        <MetricCard label="Missing items" value={coverage?.missingCount ?? '...'} />
        <MetricCard label="Recently completed" value={coverage?.recentlyCompleted.length ?? '...'} />
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
            {coverage?.topMissing.length ? (
              coverage.topMissing.slice(0, 6).map((result) => (
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
          <h3>Starter processes by department</h3>
          <div className="departmentSummaryList">
            {starterProcessGroups.length ? (
              starterProcessGroups.map((group) => (
                <article className="departmentSummaryCard" key={group.department}>
                  <div className="departmentSummaryHeader">
                    <strong>{group.department}</strong>
                    <span>{group.processes.length} processes</span>
                  </div>
                  <div className="departmentSummaryItems">
                    {group.processes.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <span>
                <strong>No starter processes</strong>
                0
              </span>
            )}
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
