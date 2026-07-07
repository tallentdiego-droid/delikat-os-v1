import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ClipboardList, Plus, Search, Workflow, type LucideIcon } from 'lucide-react';
import { EmptyState, MetricCard, OSCard, SOPCard } from '../components/os';
import { getExecutionTimelineData, type ExecutionTimelineData } from '../lib/execution';
import { getKnowledgeEngineData, knowledgeOriginLabel, previewText, type KnowledgeEngineData } from '../lib/knowledge';

interface DashboardPageProps {
  onOpenStudio?: () => void;
  onCreateSOP?: () => void;
  onOpenDailyOperations?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
}

interface HomeAction {
  title: string;
  detail: string;
  icon: LucideIcon;
  onClick?: () => void;
  actionLabel: string;
}

function actionCard({ title, detail, icon: Icon, onClick, actionLabel }: HomeAction): JSX.Element {
  return (
    <OSCard className="homeActionCard">
      <div className="homeActionHeader">
        <Icon aria-hidden="true" size={18} />
        <strong>{title}</strong>
      </div>
      <p>{detail}</p>
      {onClick ? (
        <button className="iconTextButton" onClick={onClick} type="button">
          <ArrowRight aria-hidden="true" size={16} />
          {actionLabel}
        </button>
      ) : null}
    </OSCard>
  );
}

export function DashboardPage({ onOpenStudio, onCreateSOP, onOpenDailyOperations }: DashboardPageProps): JSX.Element {
  const [timeline, setTimeline] = useState<ExecutionTimelineData | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const quickActions = useMemo<HomeAction[]>(
    () => [
      {
        title: 'Continue in Studio',
        detail: 'Pick up where you left off in the SOP workspace.',
        icon: BookOpen,
        onClick: onOpenStudio,
        actionLabel: 'Open Studio',
      },
      {
        title: 'Search SOPs',
        detail: 'Find a procedure, source section, or draft in a few seconds.',
        icon: Search,
        onClick: onOpenStudio,
        actionLabel: 'Search SOPs',
      },
      {
        title: 'Create New SOP',
        detail: 'Start a draft in Studio. It will stay in draft until you publish it.',
        icon: Plus,
        onClick: onCreateSOP,
        actionLabel: 'New SOP',
      },
      {
        title: 'Daily Operations',
        detail: 'Open the live shift workspace for today’s checklists and audits.',
        icon: ClipboardList,
        onClick: onOpenDailyOperations,
        actionLabel: 'Open Daily Operations',
      },
    ],
    [onCreateSOP, onOpenDailyOperations, onOpenStudio],
  );

  const recentDrafts = useMemo(() => {
    if (!knowledge) return [];
    return knowledge.objects
      .filter((object) => object.sourceType === 'user_created' || object.status !== 'active' || object.approvedVersion.status !== 'approved')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
  }, [knowledge]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Home</h2>
          <p>Continue in Studio, review today’s work, and start a new SOP when needed.</p>
        </div>
      </div>

      {error ? (
        <div className="notice error">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="homeActionGrid">
        {quickActions.map((action) => (
          <div key={action.title}>{actionCard(action)}</div>
        ))}
      </div>

      <section className="detailSection">
        <div className="sectionHeader">
          <div>
            <h3>Daily Operations summary</h3>
            <p>What is in motion today.</p>
          </div>
        </div>
        <div className="metricGrid homeSummaryGrid">
          <MetricCard label="Now" value={timeline?.stats.now ?? '...'} helper="Already in motion" />
          <MetricCard label="Next" value={timeline?.stats.next ?? '...'} helper="Ready to start" />
          <MetricCard label="Later Today" value={timeline?.stats.laterToday ?? '...'} helper="Scheduled or waiting" />
          <MetricCard label="Blocked" value={timeline?.stats.blocked ?? '...'} helper="Needs SOP support" />
        </div>
      </section>

      <section className="detailSection">
        <div className="sectionHeader">
          <div>
            <h3>Recent Drafts</h3>
            <p>Work in progress that is still being shaped in Studio.</p>
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
                action={
                  <button className="tableLink" onClick={onOpenStudio} type="button">
                    Open in Studio
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
    </section>
  );
}
