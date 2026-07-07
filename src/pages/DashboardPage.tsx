import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { getExecutionTimelineData, type ExecutionTimelineData, type ExecutionTimelineItem } from '../lib/execution';
import { getRolesOSData, type RoleOSData, type RoleOSWorkspace } from '../lib/roles';
import { EmptyState, MetricCard, OSCard } from '../components/os';
import { ExecutionTimeline } from '../components/execution';

interface DashboardPageProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenManager?: () => void;
  onOpenRoles?: () => void;
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

function roleReadinessLabel(role: RoleOSWorkspace): string {
  if (role.coverage.missingCount > 0) return 'Missing SOP';
  if (role.metrics.trainingPaths > 0 && role.metrics.checklistTemplates > 0) return 'Ready';
  if (role.metrics.trainingPaths > 0 || role.metrics.checklistTemplates > 0) return 'Execution not started';
  return 'Not started';
}

function roleReadinessDetail(role: RoleOSWorkspace): string {
  const parts = [
    `${role.metrics.trainingPaths} training`,
    `${role.metrics.checklistTemplates} checklists`,
    `${role.coverage.missingCount} missing SOPs`,
  ];
  return parts.join(' · ');
}

export function DashboardPage(props: DashboardPageProps): JSX.Element {
  const [timeline, setTimeline] = useState<ExecutionTimelineData | null>(null);
  const [roles, setRoles] = useState<RoleOSData | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
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

  useEffect(() => {
    let active = true;

    getRolesOSData()
      .then((data) => {
        if (active) {
          setRoles(data);
          setRoleError(null);
        }
      })
      .catch(() => {
        if (active) {
          setRoles(null);
          setRoleError('Role readiness is temporarily unavailable. An administrator should check live Supabase access.');
        }
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

  const roleSummary = useMemo(() => {
    if (!roles) return null;

    return {
      rolesWithTraining: roles.roles.filter((role) => role.metrics.trainingPaths > 0).length,
      rolesWithChecklistCoverage: roles.roles.filter((role) => role.metrics.checklistTemplates > 0).length,
      rolesMissingSops: roles.roles.filter((role) => role.coverage.missingCount > 0).length,
    };
  }, [roles]);

  return (
    <section className="pageStack">
      <div className="sectionHeader">
        <div>
          <h2>Execution Command Center</h2>
          <p>One timeline for checklist, audit, training, and future operational work.</p>
        </div>
        {props.onOpenManager ? (
          <button className="iconTextButton" onClick={props.onOpenManager} type="button">
            <ArrowRight aria-hidden="true" size={16} />
            Open Manager OS
          </button>
        ) : null}
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

      <section className="detailSection">
        <div className="sectionHeader">
          <div>
            <h3>Role readiness</h3>
            <p>Job-based workspaces for the team are built from live training, checklists, and SOP coverage.</p>
          </div>
          {props.onOpenRoles ? (
            <button className="iconTextButton" onClick={props.onOpenRoles} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open Roles
            </button>
          ) : null}
        </div>

        {roleError ? (
          <div className="notice error">
            <AlertCircle aria-hidden="true" size={18} />
            <span>{roleError}</span>
          </div>
        ) : roleSummary && roles ? (
          <>
            <div className="metricGrid roleSummaryGrid">
              <MetricCard label="Roles with training" value={roleSummary.rolesWithTraining} helper="Paths linked to the role" />
              <MetricCard label="Roles with checklist coverage" value={roleSummary.rolesWithChecklistCoverage} helper="Operational work is mapped" />
              <MetricCard label="Roles missing SOPs" value={roleSummary.rolesMissingSops} helper="Coverage gaps remain" />
            </div>

            <div className="rolesPreviewGrid">
              {roles.roles.map((role) => (
                <OSCard key={role.definition.id} className="rolePreviewCard">
                  <div className="rolePreviewHeader">
                    <strong>{role.definition.title}</strong>
                    <span className={`executionBadge ${role.coverage.missingCount > 0 ? 'danger' : 'success'}`}>{roleReadinessLabel(role)}</span>
                  </div>
                  <p>{roleReadinessDetail(role)}</p>
                  <div className="rolePreviewMeta">
                    <span>{role.metrics.trainingPaths} training paths</span>
                    <span>{role.metrics.executionItems} execution items</span>
                  </div>
                  {props.onOpenRoles ? (
                    <button className="tableLink" onClick={props.onOpenRoles} type="button">
                      Open role workspace
                    </button>
                  ) : null}
                </OSCard>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Loading role readiness" description="Role workspaces are being assembled from live operational data." />
        )}
      </section>
    </section>
  );
}
