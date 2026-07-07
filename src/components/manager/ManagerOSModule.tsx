import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Clock3, ShieldAlert, Users } from 'lucide-react';
import { ExecutionCard, ExecutionTimeline } from '../execution';
import {
  EmptyState,
  MetricCard,
  OSCard,
  SOPCard,
  SOPCoverageWarning,
  StatusBadge,
  TrainingPathCard,
} from '../os';
import { executionStatusLabel, type ExecutionTimelineItem } from '../../lib/execution';
import { getManagerOSData, type ManagerOSData } from '../../lib/manager';

interface ManagerOSModuleProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenRoles?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Daily Operations could not reach live Supabase data. Ask an administrator to check the connection and read policies.';
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function executionRouteAction(item: ExecutionTimelineItem, callbacks: ManagerOSModuleProps): (() => void) | undefined {
  if (item.sourceRoute === 'checklists') return callbacks.onOpenChecklists;
  if (item.sourceRoute === 'audits') return callbacks.onOpenAudits;
  if (item.sourceRoute === 'training') return callbacks.onOpenTraining;
  if (item.sourceRoute === 'operations') {
    if (item.blockedReason) return callbacks.onOpenKnowledgeBase;
    return callbacks.onOpenOperations;
  }
  return callbacks.onOpenKnowledgeBase;
}

function checklistRunActionLabel(status: string): string {
  if (status === 'in_progress') return 'Continue checklist';
  if (status === 'completed') return 'Review checklist';
  return 'Open checklist';
}

function auditRunActionLabel(status: string): string {
  if (status === 'in_progress') return 'Continue audit';
  if (status === 'passed' || status === 'failed') return 'Review audit';
  return 'Open audit';
}

function roleReadinessLabel(role: ManagerOSData['roles']['roles'][number]): string {
  if (role.coverage.missingCount > 0) return 'Missing SOP';
  if (role.metrics.trainingPaths > 0 && role.metrics.checklistTemplates > 0) return 'Ready';
  if (role.metrics.trainingPaths > 0 || role.metrics.checklistTemplates > 0) return 'Execution not started';
  return 'Not started';
}

function summaryValue(count: number | null | undefined): string {
  return typeof count === 'number' ? String(count) : '0';
}

export function ManagerOSModule(props: ManagerOSModuleProps = {}): JSX.Element {
  const [data, setData] = useState<ManagerOSData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getManagerOSData()
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((reason: unknown) => {
        if (active) setError(friendlyError(reason));
      });

    return () => {
      active = false;
    };
  }, []);

  const checklistActive = data?.activeChecklistRuns ?? [];
  const auditActive = data?.activeAuditRuns ?? [];
  const roleCoverage = useMemo(() => {
    if (!data) return null;

    const totalRequired = data.roles.roles.reduce((sum, role) => sum + role.coverage.requiredCount, 0);
    const totalMissing = data.roles.roles.reduce((sum, role) => sum + role.coverage.missingCount, 0);
    const readyRoles = data.roles.roles.filter((role) => role.coverage.missingCount === 0 && (role.metrics.trainingPaths > 0 || role.metrics.checklistTemplates > 0)).length;

    return {
      totalRequired,
      totalMissing,
      readyRoles,
      coveragePercent: totalRequired === 0 ? 0 : Math.round(((totalRequired - totalMissing) / totalRequired) * 100),
    };
  }, [data]);

  const startChecklistLabel = checklistActive.length > 0 ? 'Continue checklist' : 'Start checklist';
  const startAuditLabel = auditActive.length > 0 ? 'Continue audit' : 'Start audit';

  return (
    <section className="pageStack managerEngine">
      <div className="sectionHeader">
        <div>
          <h2>Daily Operations</h2>
          <p>The live workspace for today’s operation: checklists, audits, roles, SOP support, and execution status.</p>
        </div>
        <div className="engineStats">
          <span>{data ? `${todayBusinessDate()}` : '...'}</span>
          <span>{data ? `${data.timeline.stats.now} now` : '...'} </span>
          <span>{data ? `${data.timeline.stats.blocked} blocked` : '...'}</span>
        </div>
      </div>

      {error && (
        <div className="notice error">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {!data ? (
        <EmptyState icon={Clock3} title="Loading Daily Operations" description="Pulling live operational work from Supabase." />
      ) : (
        <>
          <div className="metricGrid managerSummaryGrid">
            <MetricCard label="Now" value={data.timeline.stats.now} helper="Execution already in motion" />
            <MetricCard label="Next" value={data.timeline.stats.next} helper="Ready to launch next" />
            <MetricCard label="Later Today" value={data.timeline.stats.laterToday} helper="Scheduled or waiting" />
            <MetricCard label="Completed" value={data.timeline.stats.completed} helper="Finished today" />
            <MetricCard label="Blocked" value={data.timeline.stats.blocked} helper="Missing SOP or dependency" />
            <MetricCard label="Checklist runs" value={checklistActive.length} helper="Active today" />
            <MetricCard label="Audit runs" value={auditActive.length} helper="Active today" />
            <MetricCard label="Training warnings" value={data.trainingWarnings.length} helper="Coverage gaps" />
            <MetricCard label="Missing SOPs" value={roleCoverage?.totalMissing ?? 0} helper="Role coverage gaps" />
          </div>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Manager actions</h3>
                <p>Open the right workspace for the work that needs attention now.</p>
              </div>
            </div>
            <div className="managerActionGrid">
              <OSCard className="managerActionCard">
                <div className="managerActionHeader">
                  <CheckCircle2 aria-hidden="true" size={16} />
                  <strong>{startChecklistLabel}</strong>
                </div>
                <p>{checklistActive.length > 0 ? 'Continue the active checklist run.' : 'Start today’s opening checklist or the next planned run.'}</p>
                <button className="iconTextButton" onClick={props.onOpenChecklists} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Checklists
                </button>
              </OSCard>

              <OSCard className="managerActionCard">
                <div className="managerActionHeader">
                  <ShieldAlert aria-hidden="true" size={16} />
                  <strong>{startAuditLabel}</strong>
                </div>
                <p>{auditActive.length > 0 ? 'Continue the active audit run.' : 'Start the next audit or review the current score.'}</p>
                <button className="iconTextButton" onClick={props.onOpenAudits} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Audits
                </button>
              </OSCard>

              <OSCard className="managerActionCard">
                <div className="managerActionHeader">
                  <Users aria-hidden="true" size={16} />
                  <strong>Review role readiness</strong>
                </div>
                <p>Check which workspaces are ready, blocked, or still missing SOP support.</p>
                <button className="iconTextButton" onClick={props.onOpenRoles} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Roles
                </button>
              </OSCard>

              <OSCard className="managerActionCard">
                <div className="managerActionHeader">
                  <ClipboardList aria-hidden="true" size={16} />
                  <strong>Review missing SOPs</strong>
                </div>
                <p>Jump into the knowledge base for the gaps that are blocking execution.</p>
                <button className="iconTextButton" onClick={props.onOpenKnowledgeBase} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Studio
                </button>
              </OSCard>

              <OSCard className="managerActionCard">
                <div className="managerActionHeader">
                  <Clock3 aria-hidden="true" size={16} />
                  <strong>Review training paths</strong>
                </div>
                <p>See which paths still need coverage before the shift is truly ready.</p>
                <button className="iconTextButton" onClick={props.onOpenTraining} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Training
                </button>
              </OSCard>
            </div>
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Today’s timeline</h3>
                <p>Now, next, later today, completed, and blocked work from the shared execution timeline.</p>
              </div>
            </div>
            <ExecutionTimeline
              data={data.timeline}
              onAction={(item) => {
                const handler = executionRouteAction(item, props);
                handler?.();
              }}
            />
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Active checklist runs</h3>
                <p>Work already in motion or scheduled for today.</p>
              </div>
            </div>
            {checklistActive.length > 0 ? (
              <div className="managerRunGrid">
                {checklistActive.map((run) => (
                  <SOPCard
                    key={run.id}
                    title={run.templateTitle ?? 'Checklist run'}
                    summary={run.templateCode ?? 'Today’s checklist'}
                    status={run.status}
                    sourceLabel="Checklist run"
                    sourceDetail={run.businessDate ?? todayBusinessDate()}
                    metadata={[
                    { label: 'Items', value: `${summaryValue(run.completedCount)}/${summaryValue(run.itemCount)}` },
                      { label: 'State', value: executionStatusLabel(run.status as Parameters<typeof executionStatusLabel>[0]) },
                    ]}
                    action={
                      <button className="tableLink" onClick={props.onOpenChecklists} type="button">
                        {checklistRunActionLabel(run.status)}
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No active checklist runs"
                description="Start today’s opening checklist or continue the next planned run from Checklists."
                action={
                  <button className="iconTextButton" onClick={props.onOpenChecklists} type="button">
                    <ArrowRight aria-hidden="true" size={16} />
                    Open Checklists
                  </button>
                }
              />
            )}
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Active audit runs</h3>
                <p>Audits that are planned or already underway today.</p>
              </div>
            </div>
            {auditActive.length > 0 ? (
              <div className="managerRunGrid">
                {auditActive.map((run) => (
                  <SOPCard
                    key={run.id}
                    title={run.templateTitle ?? 'Audit run'}
                    summary={run.templateCode ?? 'Today’s audit'}
                    status={run.status}
                    sourceLabel="Audit run"
                    sourceDetail={run.businessDate ?? todayBusinessDate()}
                    metadata={[
                      { label: 'Items', value: `${summaryValue(run.completedCount)}/${summaryValue(run.itemCount)}` },
                      { label: 'State', value: executionStatusLabel(run.status as Parameters<typeof executionStatusLabel>[0]) },
                      { label: 'Score', value: run.totalScore !== null ? `${run.totalScore}%` : 'Not scored' },
                    ]}
                    action={
                      <button className="tableLink" onClick={props.onOpenAudits} type="button">
                        {auditRunActionLabel(run.status)}
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="No active audit runs"
                description="Start the readiness audit or review the latest score from Audits."
                action={
                  <button className="iconTextButton" onClick={props.onOpenAudits} type="button">
                    <ArrowRight aria-hidden="true" size={16} />
                    Open Audits
                  </button>
                }
              />
            )}
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Role readiness</h3>
                <p>Workspaces for the restaurant roles that managers need to keep moving.</p>
              </div>
              {props.onOpenRoles ? (
                <button className="iconTextButton" onClick={props.onOpenRoles} type="button">
                  <ArrowRight aria-hidden="true" size={16} />
                  Open Roles
                </button>
              ) : null}
            </div>

            <div className="metricGrid managerRoleSummaryGrid">
              <MetricCard label="Roles ready" value={roleCoverage?.readyRoles ?? 0} helper="Enough coverage to work" />
              <MetricCard label="Roles missing SOPs" value={roleCoverage?.totalMissing ?? 0} helper="Coverage gaps remain" />
              <MetricCard label="Role coverage" value={`${roleCoverage?.coveragePercent ?? 0}%`} helper="Across the role workspaces" />
            </div>

            <div className="managerRoleGrid">
              {data.roles.roles.map((role) => (
                <OSCard key={role.definition.id} className="managerRoleCard">
                  <div className="managerRoleHeader">
                    <div>
                      <strong>{role.definition.title}</strong>
                      <p>{role.matchedRoles.length ? role.matchedRoles.map((entity) => entity.name).join(' · ') : 'Waiting for ontology links.'}</p>
                    </div>
                    <StatusBadge status={role.coverage.missingCount > 0 ? 'blocked' : role.metrics.trainingPaths > 0 ? 'active' : 'planned'} label={roleReadinessLabel(role)} />
                  </div>
                  <div className="managerRoleMeta">
                    <span>{role.metrics.trainingPaths} training paths</span>
                    <span>{role.metrics.checklistTemplates} checklists</span>
                    <span>{role.metrics.auditTemplates} audits</span>
                    <span>{role.coverage.missingCount} missing SOPs</span>
                  </div>
                  <div className="managerRoleFooter">
                    <button className="tableLink" onClick={props.onOpenTraining} type="button">Review training</button>
                    <button className="tableLink" onClick={props.onOpenChecklists} type="button">Review checklists</button>
                    <button className="tableLink" onClick={props.onOpenAudits} type="button">Review audits</button>
                  </div>
                </OSCard>
              ))}
            </div>
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Training warnings</h3>
                <p>Paths with gaps that are slowing execution readiness.</p>
              </div>
            </div>
            {data.trainingWarnings.length > 0 ? (
              <div className="managerStack">
                {data.trainingWarnings.slice(0, 4).map((path) => (
                  <TrainingPathCard key={path.id} path={path} onSelect={() => props.onOpenTraining?.()} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No training warnings"
                description="All linked training paths have coverage for the current live catalog."
              />
            )}
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Missing SOPs</h3>
                <p>Approved knowledge gaps that are still blocking parts of the operation.</p>
              </div>
            </div>
            {data.missingSops.length > 0 ? (
              <SOPCoverageWarning
                action={
                  <button className="iconTextButton" onClick={props.onOpenKnowledgeBase} type="button">
                    <ArrowRight aria-hidden="true" size={16} />
                    Open Studio
                  </button>
                }
                coveragePercent={roleCoverage?.coveragePercent ?? 0}
                description="Some roles still have required knowledge that is not fully covered by approved SOPs."
                detail={data.missingSops.slice(0, 4).map((item) => item.item.title).join(' · ')}
                title="Missing SOP coverage"
              />
            ) : (
              <EmptyState icon={ClipboardList} title="No missing SOPs" description="The seeded catalog currently covers the linked requirements." />
            )}
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Completed execution</h3>
                <p>Work finished today and ready for review.</p>
              </div>
            </div>
            {data.completedItems.length > 0 ? (
              <div className="executionSummaryStack">
                {data.completedItems.slice(0, 4).map((item) => (
                  <ExecutionCard key={item.id} actionLabel={item.actionLabel} item={item} onAction={() => executionRouteAction(item, props)?.()} />
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckCircle2} title="No completed execution yet" description="Completed work will appear here once the day starts moving." />
            )}
          </section>

          <section className="detailSection">
            <div className="sectionHeader">
              <div>
                <h3>Blocked work</h3>
                <p>Items that need SOP support, dependencies, or manager attention.</p>
              </div>
            </div>
            {data.blockedItems.length > 0 ? (
              <div className="executionSummaryStack">
                {data.blockedItems.slice(0, 4).map((item) => (
                  <ExecutionCard key={item.id} actionLabel="Review issue" item={item} onAction={() => executionRouteAction(item, props)?.()} />
                ))}
              </div>
            ) : (
              <EmptyState icon={AlertCircle} title="No blocked work" description="Anything waiting on SOP support will show up here." />
            )}
          </section>
        </>
      )}
    </section>
  );
}
