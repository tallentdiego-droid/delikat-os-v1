import { GraduationCap, RotateCcw } from 'lucide-react';
import { EmptyState, MetricCard, OSCard } from '../components/os';
import { getKnowledgeEngineData, type KnowledgeEngineData } from '../lib/knowledge';
import { useCallback, useEffect, useState } from 'react';

interface TrainingPageProps {
  onOpenKnowledgeBase?: () => void;
}

export function TrainingPage({ onOpenKnowledgeBase }: TrainingPageProps = {}): JSX.Element {
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadKnowledge = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      setKnowledge(await getKnowledgeEngineData());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Training could not load live knowledge data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKnowledge();
  }, [loadKnowledge]);

  return (
    <section className="pageStack trainingPage">
      <div className="sectionHeader">
        <div>
          <h2>Training</h2>
          <p>Training is kept intentionally light while the SOP workspace is the main place to work.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
          <button className="iconTextButton" onClick={() => void loadKnowledge()} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Retry
          </button>
        </div>
      ) : null}

      <div className="dashboardMetrics">
        <MetricCard label="SOPs available" value={knowledge ? knowledge.objects.length : '—'} helper="Live Supabase records that can support training later." />
        <MetricCard label="Manuals" value={knowledge ? knowledge.manuals.length : '—'} helper="Imported source manuals already available." />
        <MetricCard label="Training status" value="Soon" helper="No training flows are published yet." />
      </div>

      <OSCard className="trainingHeroCard">
        <div className="homeHeroHeader">
          <div>
            <span className="eyebrow">Training</span>
            <h3>Training content comes from SOPs and live knowledge</h3>
            <p>We’re not inventing training modules yet. We’re keeping the knowledge base ready for when we do.</p>
          </div>
        </div>
        <div className="homeHeroActions">
          <button className="iconTextButton primary" onClick={onOpenKnowledgeBase} type="button">
            <GraduationCap aria-hidden="true" size={16} />
            Browse SOPs for training
          </button>
        </div>
      </OSCard>

      {isLoading && !knowledge ? (
        <EmptyState icon={GraduationCap} title="Loading training data" description="Pulling the live SOP library from Supabase." />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Training workspace is intentionally quiet"
          description="Once we add structured training paths, this page will fill out with real linked SOPs."
          action={
            onOpenKnowledgeBase ? (
              <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
                Open Knowledge Base
              </button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}
