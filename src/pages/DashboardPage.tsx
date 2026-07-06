import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getKnowledgeEngineData,
  getKnowledgeStats,
  type KnowledgeCoverageSummary,
  type KnowledgeOntologyStats,
  type KnowledgeStats,
} from '../lib/knowledge';

export function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [ontologyStats, setOntologyStats] = useState<KnowledgeOntologyStats | null>(null);
  const [coverage, setCoverage] = useState<KnowledgeCoverageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getKnowledgeStats(), getKnowledgeEngineData()])
      .then(([nextStats, engineData]) => {
        if (isMounted) {
          setStats(nextStats);
          setOntologyStats(engineData.ontologyStats);
          setCoverage(engineData.coverage);
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) setError(reason instanceof Error ? reason.message : 'Unable to load Supabase counts.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

      <div className="metricGrid">
        <div className="metricCard">
          <span>Source Manuals</span>
          <strong>{stats?.manuals ?? '...'}</strong>
        </div>
        <div className="metricCard">
          <span>Source Sections</span>
          <strong>{stats?.sourceSections ?? '...'}</strong>
        </div>
        <div className="metricCard">
          <span>Approved Knowledge</span>
          <strong>{stats?.canonicalKnowledge ?? '...'}</strong>
        </div>
      </div>

      <div className="coverageSummary dashboardCoverage">
        <div className="coverageHero">
          <span>Knowledge coverage</span>
          <strong>{coverage ? `${coverage.coveragePercent}%` : '...'}</strong>
          <p>
            {coverage ? `${coverage.existingCount} of ${coverage.requiredCount} required items satisfied` : 'Loading required knowledge coverage'}
          </p>
        </div>
        <div className="metricCard">
          <span>Required items</span>
          <strong>{coverage?.requiredCount ?? '...'}</strong>
        </div>
        <div className="metricCard">
          <span>Missing items</span>
          <strong>{coverage?.missingCount ?? '...'}</strong>
        </div>
        <div className="metricCard">
          <span>Recently completed</span>
          <strong>{coverage?.recentlyCompleted.length ?? '...'}</strong>
        </div>
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
          <div className="countList">
            {coverage?.topMissing.length ? (
              coverage.topMissing.slice(0, 6).map((result) => (
                <span key={result.item.id}>
                  <strong>{result.item.title}</strong>
                  P{result.item.priority}
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
          <h3>Recently completed knowledge</h3>
          <div className="countList">
            {coverage?.recentlyCompleted.length ? (
              coverage.recentlyCompleted.slice(0, 6).map((result) => (
                <span key={result.item.id}>
                  <strong>{result.item.title}</strong>
                  {result.matchedObjects.length}
                </span>
              ))
            ) : (
              <span>
                <strong>No completed requirements</strong>
                0
              </span>
            )}
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
