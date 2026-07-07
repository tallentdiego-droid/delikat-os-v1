import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ClipboardList, Plus, Search, Workflow } from 'lucide-react';
import { EmptyState, MetricCard, OSCard, SOPCard } from '../components/os';
import { getExecutionTimelineData, type ExecutionTimelineData } from '../lib/execution';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData } from '../lib/knowledge';

interface DashboardPageProps {
  onOpenStudio?: () => void;
  onCreateSOP?: () => void;
  onOpenDailyOperations?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onSearchStudio?: (query: string) => void;
}

export function DashboardPage({
  onOpenStudio,
  onCreateSOP,
  onOpenDailyOperations,
  onSearchStudio,
}: DashboardPageProps): JSX.Element {
  const [timeline, setTimeline] = useState<ExecutionTimelineData | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([getExecutionTimelineData(), getKnowledgeEngineData()])
      .then(([executionData, knowledgeData]) => {
        if (!active) return;
        setTimeline(executionData);
        setKnowledge(knowledgeData);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Home could not reach live Supabase data.');
      });

    return () => {
      active = false;
    };
  }, []);

  const recentDrafts = useMemo(() => {
    if (!knowledge) return [];
    return knowledge.objects
      .filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
  }, [knowledge]);

  const dailySummary = useMemo(() => {
    if (!timeline) {
      return [
        { label: 'Now', value: '—', helper: 'Loading live work' },
        { label: 'Next', value: '—', helper: 'Loading live work' },
        { label: 'Later Today', value: '—', helper: 'Loading live work' },
        { label: 'Blocked', value: '—', helper: 'Loading live work' },
      ];
    }

    return [
      { label: 'Now', value: timeline.stats.now, helper: 'Already in motion' },
      { label: 'Next', value: timeline.stats.next, helper: 'Ready to start' },
      { label: 'Later Today', value: timeline.stats.laterToday, helper: 'Scheduled or waiting' },
      { label: 'Blocked', value: timeline.stats.blocked, helper: 'Needs SOP support' },
    ];
  }, [timeline]);

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
          <p>Start in Studio, check today’s work, and keep the kitchen, floor, and manager teams moving.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="homeHeroGrid">
        <OSCard className="homeHeroCard">
          <div className="homeHeroHeader">
            <div>
              <span className="eyebrow">Delikat Studio</span>
              <h3>Search SOPs, recipes, procedures…</h3>
              <p>Find live SOPs, draft work, source evidence, and related operational guidance in one place.</p>
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
              <button className="iconTextButton" onClick={onOpenDailyOperations} type="button">
                <ClipboardList aria-hidden="true" size={16} />
                Daily Operations
              </button>
            </div>
          </form>

          <p className="homeHeroNote">Studio keeps imported manuals read only while draft work stays separate and easy to review.</p>
        </OSCard>

        <OSCard className="homeSummaryCard">
          <div className="homeSummaryHeader">
            <div>
              <span className="eyebrow">Daily Operations</span>
              <h3>Simple summary for today</h3>
              <p>At a glance, see what is ready, in motion, and blocked.</p>
            </div>
            <button className="iconTextButton" onClick={onOpenDailyOperations} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open Daily Operations
            </button>
          </div>

          <div className="metricGrid homeSummaryGrid">
            {dailySummary.map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
            ))}
          </div>

          <div className="homeTodayList">
            <div className="homeTodayListHeader">
              <strong>Today’s next moves</strong>
              <span>{timeline?.stats.total ?? 0} items in the live timeline</span>
            </div>
            {timeline ? (
              <div className="homeTodayItems">
                {timeline.groups
                  .flatMap((group) => group.items)
                  .filter((item) => item.groupId !== 'completed')
                  .slice(0, 3)
                  .map((item) => (
                    <OSCard className="homeTodayItem" key={item.id}>
                      <div className="homeTodayItemHeader">
                        <strong>{item.title}</strong>
                        <span>{item.relatedModuleLabel}</span>
                      </div>
                      <p>{item.nextAction}</p>
                      <button className="tableLink" onClick={item.sourceRoute ? onOpenDailyOperations : onOpenStudio} type="button">
                        {item.actionLabel}
                      </button>
                    </OSCard>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="Loading live work"
                description="We are pulling today’s execution timeline from Supabase."
                icon={Workflow}
              />
            )}
          </div>
        </OSCard>
      </div>

      <section className="detailSection">
        <div className="sectionHeader">
          <div>
            <h3>Recent SOPs and drafts</h3>
            <p>Work that was edited recently or is still in draft.</p>
          </div>
          {onOpenStudio ? (
            <button className="iconTextButton" onClick={onOpenStudio} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open Studio
            </button>
          ) : null}
        </div>
        {recentDrafts.length > 0 ? (
          <div className="homeDraftGrid">
            {recentDrafts.map((object) => (
              <SOPCard
                key={object.id}
                title={object.title}
                summary={object.summary ?? previewText(object.approvedVersion.body, 120)}
                sourceLabel={knowledgeOriginLabel(object)}
                sourceDetail={object.sourceType === 'user_created' ? 'Created in Studio' : `${object.manualCode ?? object.manualTitle} · ${object.sourceSectionHeading}`}
                status={object.status}
                statusLabel={object.sourceType === 'user_created' ? 'Draft' : object.approvedVersion.status === 'approved' ? 'Edited' : 'Draft'}
                action={
                  <button className="tableLink" onClick={onOpenStudio} type="button">
                    Open in Studio
                  </button>
                }
              />
            ))}
          </div>
        ) : knowledge === null ? (
          <EmptyState
            icon={BookOpen}
            title="Loading recent SOPs"
            description="We’re pulling recent drafts and edits from Supabase."
          />
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
    </section>
  );
}
