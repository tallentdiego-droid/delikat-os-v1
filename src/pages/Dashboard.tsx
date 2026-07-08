import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, RotateCcw, Search, Workflow } from 'lucide-react';
import { EmptyState, MetricCard, OSCard, SOPCard } from '../components/os';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData, type KnowledgeObject } from '../lib/knowledge';

interface DashboardPageProps {
  onOpenKnowledgeBase?: () => void;
  onSearchKnowledge?: (query: string) => void;
  onCreateSOP?: () => void;
  onContinueLastDraft?: (id: string) => void;
}

function sortByUpdated(a: KnowledgeObject, b: KnowledgeObject): number {
  return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
}

export function DashboardPage({
  onOpenKnowledgeBase,
  onSearchKnowledge,
  onCreateSOP,
  onContinueLastDraft,
}: DashboardPageProps): JSX.Element {
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadKnowledge = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getKnowledgeEngineData();
      setKnowledge(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dashboard could not reach the live knowledge base.');
    } finally {
      setIsLoading(false);
      setIsSlowLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setIsSlowLoading(true);
    }, 2500);

    void loadKnowledge();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadKnowledge]);

  const approvedSOPs = useMemo(
    () => (knowledge ? knowledge.objects.filter((object) => object.status === 'active' && object.approvedVersion.status === 'approved').sort(sortByUpdated) : []),
    [knowledge],
  );

  const drafts = useMemo(
    () =>
      knowledge
        ? knowledge.objects.filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved').sort(sortByUpdated)
        : [],
    [knowledge],
  );

  const lastDraft = drafts[0] ?? null;

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed && onSearchKnowledge) {
      onSearchKnowledge(trimmed);
      return;
    }
    onOpenKnowledgeBase?.();
  }

  return (
    <section className="pageStack dashboardPage">
      <div className="sectionHeader">
        <div>
          <h2>Dashboard</h2>
          <p>Search the live SOP library, open Knowledge Base, or continue the next draft.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
          <button className="iconTextButton" onClick={loadKnowledge} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Retry
          </button>
        </div>
      ) : null}

      <OSCard className="homeHeroCard dashboardHero">
        <div className="homeHeroHeader">
          <div>
            <span className="eyebrow">Delikat Studio</span>
            <h3>Search SOPs, recipes, procedures…</h3>
            <p>Everything here comes from the live Supabase knowledge base.</p>
          </div>
        </div>

        <form className="homeSearchForm" onSubmit={handleSearch}>
          <label className="searchField homeSearchField">
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Search SOPs, recipes, procedures"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search SOPs, recipes, procedures…"
              value={searchQuery}
            />
          </label>
          <div className="homeHeroActions">
            <button className="iconTextButton primary" type="submit">
              <Search aria-hidden="true" size={16} />
              Search SOPs
            </button>
            <button className="iconTextButton secondary" onClick={onCreateSOP} type="button">
              <Plus aria-hidden="true" size={16} />
              New SOP
            </button>
            <button className="iconTextButton" onClick={() => lastDraft && onContinueLastDraft?.(lastDraft.id)} type="button" disabled={!lastDraft}>
              <Workflow aria-hidden="true" size={16} />
              Continue last draft
            </button>
          </div>
        </form>
      </OSCard>

      <div className="dashboardMetrics">
        <MetricCard label="SOPs" value={String(approvedSOPs.length)} helper="Approved SOPs in the live library." />
        <MetricCard label="Drafts" value={String(drafts.length)} helper="User-created or in-progress SOPs." />
        <MetricCard label="Recipes" value="Soon" helper="Recipe import arrives next." />
      </div>

      <div className="dashboardLists">
        <section className="detailSection">
          <div className="sectionHeader">
            <div>
              <h3>Recent SOPs</h3>
              <p>Recently updated approved SOPs from Supabase.</p>
            </div>
            <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
              <BookOpen aria-hidden="true" size={16} />
              Open Knowledge Base
            </button>
          </div>

          {error && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title="Recent SOPs unavailable"
              description={error}
              action={
                <button className="iconTextButton" onClick={loadKnowledge} type="button">
                  <RotateCcw aria-hidden="true" size={16} />
                  Retry
                </button>
              }
            />
          ) : isLoading && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title={isSlowLoading ? 'Still loading recent SOPs' : 'Loading recent SOPs'}
              description={isSlowLoading ? 'Supabase is taking a moment to respond.' : 'We’re pulling live SOPs from Supabase.'}
            />
          ) : approvedSOPs.length > 0 ? (
            <div className="homeDraftGrid">
              {approvedSOPs.slice(0, 4).map((object) => (
                <SOPCard
                  key={object.id}
                  title={object.title}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                  sourceLabel={knowledgeOriginLabel(object)}
                  sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                  status={object.status}
                  statusLabel="Ready"
                  action={
                    <button className="tableLink" onClick={onOpenKnowledgeBase} type="button">
                      Open
                    </button>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Workflow} title="No recent SOPs yet" description="Approved SOPs will appear here once the live library loads." />
          )}
        </section>

        <section className="detailSection">
          <div className="sectionHeader">
            <div>
              <h3>Recent drafts</h3>
              <p>Drafts and user-created SOPs that need attention.</p>
            </div>
          </div>

          {error && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title="Recent drafts unavailable"
              description={error}
              action={
                <button className="iconTextButton" onClick={loadKnowledge} type="button">
                  <RotateCcw aria-hidden="true" size={16} />
                  Retry
                </button>
              }
            />
          ) : isLoading && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title={isSlowLoading ? 'Still loading recent drafts' : 'Loading recent drafts'}
              description={isSlowLoading ? 'The live knowledge base is still coming in.' : 'We’re checking for draft SOPs in Supabase.'}
            />
          ) : drafts.length > 0 ? (
            <div className="homeDraftGrid">
              {drafts.slice(0, 4).map((object) => (
                <SOPCard
                  key={object.id}
                  title={object.title}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                  sourceLabel={knowledgeOriginLabel(object)}
                  sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                  status={object.status}
                  statusLabel={object.sourceType === 'user_created' ? 'Draft' : 'Needs review'}
                  action={
                    <button
                      className="tableLink"
                      onClick={() => onContinueLastDraft?.(object.id)}
                      type="button"
                    >
                      Continue
                    </button>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Workflow}
              title="No drafts yet"
              description="Create a new SOP in SOPs and it will appear here once it is saved as a draft."
              action={
                onCreateSOP ? (
                  <button className="iconTextButton" onClick={onCreateSOP} type="button">
                    <Plus aria-hidden="true" size={16} />
                    New SOP
                  </button>
                ) : undefined
              }
            />
          )}
        </section>
      </div>
    </section>
  );
}
