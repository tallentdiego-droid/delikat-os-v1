import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { getExecutionTimelineData, type ExecutionTimelineData, type ExecutionTimelineItem } from '../lib/execution';
import { EmptyState, MetricCard, OSCard } from '../components/os';
import { ExecutionTimeline } from '../components/execution';

interface DashboardPageProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

interface QuickAction {
  label: string;
  detail: string;
  icon: LucideIcon;
  onClick?: () => void;
}

interface ManagerPrompt {
  title: string;
  detail: string;
  actionLabel: string;
  onClick?: () => void;
}

function routeAction(
  item: ExecutionTimelineItem,
  callbacks: DashboardPageProps,
): (() => void) | undefined {
  if (item.sourceRoute === 'checklists') return callbacks.onOpenChecklists;
  if (item.sourceRoute === 'audits') return callbacks.onOpenAudits;
  if (item.sourceRoute === 'training') return callbacks.onOpenTraining;
  if (item.sourceRoute === 'operations') {
    if (item.blockedReason) return callbacks.onOpenKnowledgeBase;
    return callbacks.onOpenOperations;
  }
  return callbacks.onOpenKnowledgeBase;
}

function sortByPriority(items: ExecutionTimelineItem[]): ExecutionTimelineItem[] {
  return [...items].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
}

export function DashboardPage(props: DashboardPageProps): JSX.Element {
  const [timeline, setTimeline] = useState<ExecutionTimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getExecutionTimelineData()
      .then((data) => {
        if (active) setTimeline(data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the execution timeline.');
      });

    return () => {
      active = false;
    };
  }, []);

  const highestPriorityItem = useMemo(() => {
    if (!timeline) return null;
    return sortByPriority(timeline.items)[0] ?? null;
  }, [timeline]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        label: 'Now',
        detail: 'Execution already in motion.',
        icon: CheckCircle2,
      },
      {
        label: 'Next',
        detail: 'Ready to start after the active work clears.',
        icon: ArrowRight,
      },
      {
        label: 'Later Today',
        detail: 'Scheduled or waiting for manager attention.',
        icon: ArrowRight,
      },
    ],
    [],
  );

  const managerPrompts = useMemo<ManagerPrompt[]>(
    () => [
      {
        title: "Start today's opening checklist",
        detail: 'Kick off the opening flow from Checklists.',
        actionLabel: 'Open Checklists',
        onClick: props.onOpenChecklists,
      },
      {
        title: 'Start cash closing',
        detail: 'Jump to the closing checklist for the register.',
        actionLabel: 'Open Checklists',
        onClick: props.onOpenChecklists,
      },
      {
        title: 'Start opening readiness audit',
        detail: 'Open the audit flow for the morning readiness check.',
        actionLabel: 'Open Audits',
        onClick: props.onOpenAudits,
      },
      {
        title: 'Review training readiness',
        detail: 'Check who still needs training coverage.',
        actionLabel: 'Open Training',
        onClick: props.onOpenTraining,
      },
    ],
    [props.onOpenAudits, props.onOpenChecklists, props.onOpenTraining],
  );

  const todayStatus = timeline
    ? [
        { label: 'Now', value: timeline.stats.now },
        { label: 'Next', value: timeline.stats.next },
        { label: 'Later Today', value: timeline.stats.laterToday },
        { label: 'Completed', value: timeline.stats.completed },
        { label: 'Blocked', value: timeline.stats.blocked },
        { label: 'Overdue', value: timeline.stats.overdue },
      ]
    : [];

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Execution Command Center</h2>
          <p>One timeline for checklist, audit, training, and future operational work.</p>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="metricGrid executionSummaryGrid">
        {todayStatus.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} helper={item.label === 'Blocked' ? 'Missing SOP or dependencies' : undefined} />
        ))}
      </div>

      {timeline && timeline.stats.now === 0 ? (
        <section className="countPanel">
          <h3>Start the shift</h3>
          <div className="executionPromptGrid">
            {managerPrompts.map((prompt) => (
              <OSCard key={prompt.title} className="executionPromptCard">
                <div>
                  <strong>{prompt.title}</strong>
                  <p>{prompt.detail}</p>
                </div>
                {prompt.onClick ? (
                  <button className="iconTextButton" onClick={prompt.onClick} type="button">
                    <ArrowRight aria-hidden="true" size={16} />
                    {prompt.actionLabel}
                  </button>
                ) : null}
              </OSCard>
            ))}
          </div>
        </section>
      ) : null}

      {highestPriorityItem && (
        <OSCard className="executionCallout">
          <div className="executionCalloutHeader">
            <div>
              <strong>Highest priority</strong>
              <p>{highestPriorityItem.title}</p>
            </div>
            <span className={`executionBadge ${highestPriorityItem.status === 'blocked' ? 'danger' : highestPriorityItem.status === 'completed' || highestPriorityItem.status === 'verified' ? 'success' : 'warning'}`}>
              {highestPriorityItem.nextAction}
            </span>
          </div>
          <p className="previewText">
            {highestPriorityItem.description ?? 'Ready to move from the shared execution timeline.'}
          </p>
          <div className="executionCalloutMeta">
            <span>{highestPriorityItem.progressLabel}</span>
            <span>{highestPriorityItem.relatedModuleLabel}</span>
            <span>{highestPriorityItem.executionDate ?? 'No execution date'}</span>
            <span>{highestPriorityItem.overdue ? 'Overdue' : highestPriorityItem.blockedReason ?? 'Ready'}</span>
          </div>
        </OSCard>
      )}

      {timeline ? (
        <ExecutionTimeline
          data={timeline}
          onAction={(item) => {
            const handler = routeAction(item, props);
            handler?.();
          }}
        />
      ) : (
        <EmptyState title="Loading execution timeline" description="The unified execution backbone is loading live Supabase data." />
      )}

      <div className="executionQuickStrip">
        {quickActions.map((item) => (
          <OSCard key={item.label} className="executionQuickCard">
            <div className="executionQuickHeader">
              <item.icon aria-hidden="true" size={16} />
              <strong>{item.label}</strong>
            </div>
            <p>{item.detail}</p>
          </OSCard>
        ))}
      </div>
    </section>
  );
}
