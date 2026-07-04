import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getKnowledgeStats, type KnowledgeStats } from '../lib/knowledge';

export function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getKnowledgeStats()
      .then((nextStats) => {
        if (isMounted) setStats(nextStats);
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

      <div className="statusStrip">
        <CheckCircle2 aria-hidden="true" size={18} />
        <span>No OpenAI calls, embeddings, generated SOPs, or markdown-file reads are used by this app.</span>
      </div>
    </section>
  );
}
