import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Workflow } from 'lucide-react';
import { EmptyState, OSCard, SOPCard } from '../components/os';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData, type KnowledgeObject } from '../lib/knowledge';

interface DashboardPageProps {
  onOpenStudio?: () => void;
  onCreateSOP?: () => void;
  onSearchStudio?: (query: string) => void;
  onContinueLastDraft?: (id: string) => void;
}

function draftSort(a: KnowledgeObject, b: KnowledgeObject): number {
  return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
}

export function DashboardPage({
  onOpenStudio,
  onCreateSOP,
  onSearchStudio,
  onContinueLastDraft,
}: DashboardPageProps): JSX.Element {
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const slowTimer = window.setTimeout(() => {
      if (active) setIsSlowLoading(true);
    }, 3500);

    getKnowledgeEngineData()
      .then((data) => {
        if (!active) return;
        setKnowledge(data);
        setError(null);
        setIsLoading(false);
        setIsSlowLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Home could not reach live Supabase data.');
        setIsLoading(false);
        setIsSlowLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, []);

  const recentDrafts = useMemo(() => {
    if (!knowledge) return [];
    return knowledge.objects.filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved').sort(draftSort).slice(0, 4);
  }, [knowledge]);

  const recentSOPs = useMemo(() => {
    if (!knowledge) return [];
    return knowledge.objects.filter((object) => object.status === 'active' && object.approvedVersion.status === 'approved').sort(draftSort).slice(0, 4);
  }, [knowledge]);

  const lastDraft = recentDrafts[0] ?? null;

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed && onSearchStudio) {
      onSearchStudio(trimmed);
      return;
    }
    onOpenStudio?.();
  }

  return (
    <section className="pageStack homeLanding">
      <div className="sectionHeader">
        <div>
          <h2>Home</h2>
          <p>Start in Studio, search SOPs, and continue the last draft when you need to pick up work.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
        </div>
      ) : null}

      <OSCard className="homeHeroCard">
        <div className="homeHeroHeader">
          <div>
            <span className="eyebrow">Delikat Studio</span>
            <h3>Search SOPs, recipes, procedures…</h3>
            <p>Use Studio to browse imported manuals, open SOPs, edit drafts, and publish approved versions.</p>
          </div>
        </div>

        <form className="homeSearchForm" onSubmit={handleSearchSubmit}>
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
              <BookOpen aria-hidden="true" size={16} />
              Open Studio
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

      <div className="homeFeedGrid">
        <section className="detailSection">
          <div className="sectionHeader">
            <div>
              <h3>Recent SOPs</h3>
              <p>Approved SOPs from the live Supabase library.</p>
            </div>
            {onOpenStudio ? (
              <button className="iconTextButton" onClick={onOpenStudio} type="button">
                <BookOpen aria-hidden="true" size={16} />
                Open Studio
              </button>
            ) : null}
          </div>
          {isLoading && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title={isSlowLoading ? 'Still loading recent SOPs' : 'Loading recent SOPs'}
              description={
                isSlowLoading
                  ? 'Supabase is taking a moment to respond. Studio is still available if you want to keep working.'
                  : 'We’re pulling recent SOPs from Supabase.'
              }
            />
          ) : recentSOPs.length > 0 ? (
            <div className="homeDraftGrid">
              {recentSOPs.map((object) => (
                <SOPCard
                  key={object.id}
                  title={object.title}
                  summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                  sourceLabel={knowledgeOriginLabel(object)}
                  sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                  status={object.status}
                  statusLabel={object.approvedVersion.status === 'approved' ? 'Ready' : 'Draft'}
                  action={
                    <button className="tableLink" onClick={() => onOpenStudio?.()} type="button">
                      Open in Studio
                    </button>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Workflow} title="No recent SOPs yet" description="Once SOPs are available in the live library, they’ll appear here." />
          )}
        </section>

        <section className="detailSection">
          <div className="sectionHeader">
            <div>
              <h3>Recent drafts</h3>
              <p>Draft SOPs saved in Studio.</p>
            </div>
          </div>
          {isLoading && !knowledge ? (
            <EmptyState
              icon={Workflow}
              title={isSlowLoading ? 'Still loading recent drafts' : 'Loading recent drafts'}
              description={
                isSlowLoading
                  ? 'Supabase is taking longer than usual. The workspace remains available.'
                  : 'We’re checking for recent drafts in Supabase.'
              }
            />
          ) : recentDrafts.length > 0 ? (
            <div className="homeDraftGrid">
              {recentDrafts.map((object) => (
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
                      Continue draft
                    </button>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Workflow}
              title="No drafts yet"
              description="Start a new SOP in Studio and it will show up here as soon as it is saved as a draft."
              action={
                onCreateSOP ? (
                  <button className="iconTextButton" onClick={onCreateSOP} type="button">
                    <Plus aria-hidden="true" size={16} />
                    Create New SOP
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
