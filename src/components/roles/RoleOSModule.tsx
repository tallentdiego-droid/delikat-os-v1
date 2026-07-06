import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, ClipboardList, ShieldAlert, Users } from 'lucide-react';
import { ExecutionGroup } from '../execution';
import {
  EmptyState,
  MetricCard,
  OSCard,
  ProcessCard,
  SOPCard,
  SOPCoverageWarning,
  SOPRelatedKnowledge,
  StatusBadge,
  TrainingPathCard,
} from '../os';
import { type ExecutionStatus, type ExecutionTimelineItem } from '../../lib/execution';
import { getRolesOSData, type RoleOSData, type RoleOSWorkspace } from '../../lib/roles';

interface RoleOSModuleProps {
  onOpenKnowledgeBase?: () => void;
  onOpenOperations?: () => void;
  onOpenTraining?: () => void;
  onOpenChecklists?: () => void;
  onOpenAudits?: () => void;
}

function friendlyError(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Role OS could not reach the live Supabase data. Ask an administrator to check the connection and read policies.';
}

function routeAction(
  item: ExecutionTimelineItem,
  callbacks: RoleOSModuleProps,
): (() => void) | undefined {
  if (item.sourceRoute === 'checklists') return callbacks.onOpenChecklists;
  if (item.sourceRoute === 'audits') return callbacks.onOpenAudits;
  if (item.sourceRoute === 'training') return callbacks.onOpenTraining;
  if (item.sourceRoute === 'operations') return callbacks.onOpenOperations;
  return callbacks.onOpenKnowledgeBase;
}

function executionStatusFromRole(role: RoleOSWorkspace): ExecutionStatus {
  if (role.coverage.missingCount > 0) return 'blocked';
  if (role.metrics.now > 0) return 'in_progress';
  if (role.metrics.next > 0 || role.metrics.laterToday > 0) return 'ready';
  if (role.metrics.executionItems > 0) return 'waiting';
  return 'planned';
}

function readinessLabel(role: RoleOSWorkspace): string {
  if (role.coverage.missingCount > 0) return 'Missing SOP';
  if (role.metrics.now > 0) return 'In progress';
  if (role.metrics.next > 0 || role.metrics.laterToday > 0) return 'Ready';
  if (role.metrics.executionItems > 0) return 'Execution queued';
  return 'Not started';
}

function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role: RoleOSWorkspace;
  selected: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  return (
    <OSCard className={selected ? 'roleCard active' : 'roleCard'}>
      <button className="roleCardButton" onClick={() => onSelect(role.definition.id)} type="button">
        <div className="roleCardHeader">
          <div>
            <strong>{role.definition.title}</strong>
            <p>{role.matchedRoles.length ? role.matchedRoles.map((item) => item.name).join(' · ') : 'No exact ontology match yet.'}</p>
          </div>
          <StatusBadge status={executionStatusFromRole(role)} label={readinessLabel(role)} />
        </div>
        <div className="roleCardMeta">
          <span>{role.metrics.trainingPaths} training paths</span>
          <span>{role.metrics.processes} processes</span>
          <span>{role.metrics.executionItems} execution items</span>
          <span>{role.metrics.sopObjects} SOPs</span>
        </div>
        <div className="roleCardFooter">
          <span>{role.coverage.coveragePercent}% SOP coverage</span>
          <span>{role.coverage.missingCount} missing SOPs</span>
        </div>
      </button>
    </OSCard>
  );
}

function SummaryMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }): JSX.Element {
  return <MetricCard label={label} value={value} helper={helper} />;
}

function roleTemplateItems(role: RoleOSWorkspace): Array<{ id: string; title: string; description: string | null; status: string; runs: number; type: string }> {
  return role.checklistTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    status: template.status,
    runs: template.runs.length,
    type: 'Checklist',
  }));
}

function roleAuditItems(role: RoleOSWorkspace): Array<{ id: string; title: string; description: string | null; status: string; runs: number; type: string }> {
  return role.auditTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    status: template.status,
    runs: template.runs.length,
    type: 'Audit',
  }));
}

function RoleDetail({
  role,
  onOpenKnowledgeBase,
  onOpenOperations,
  onOpenTraining,
  onOpenChecklists,
  onOpenAudits,
}: {
  role: RoleOSWorkspace;
} & RoleOSModuleProps): JSX.Element {
  const missingSops = role.coverage.topMissing;

  return (
    <div className="detailStack roleDetail">
      <section className="detailSection">
        <div className="roleDetailHeader">
          <div>
            <h3>{role.definition.title}</h3>
            <p>Today’s work, training, SOPs, checklists, and audits for this role.</p>
          </div>
          <div className="detailHeaderActions">
            <StatusBadge status={executionStatusFromRole(role)} label={readinessLabel(role)} />
            <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Open SOP coverage
            </button>
          </div>
        </div>

        <div className="summaryGrid">
          <SummaryMetric label="Training" value={role.metrics.trainingPaths} helper="Role-based paths" />
          <SummaryMetric label="Processes" value={role.metrics.processes} helper="Operational work" />
          <SummaryMetric label="Checklists" value={role.metrics.checklistTemplates} helper={`${role.metrics.checklistRuns} runs`} />
          <SummaryMetric label="Audits" value={role.metrics.auditTemplates} helper={`${role.metrics.auditRuns} runs`} />
          <SummaryMetric label="SOPs" value={role.metrics.sopObjects} helper="Linked approved SOPs" />
          <SummaryMetric label="Missing SOPs" value={role.coverage.missingCount} helper="Coverage gaps" />
        </div>
      </section>

      {role.coverage.missingCount > 0 && (
        <SOPCoverageWarning
          action={
            <button className="iconTextButton" onClick={onOpenKnowledgeBase} type="button">
              <ArrowRight aria-hidden="true" size={16} />
              Review missing SOPs
            </button>
          }
          coveragePercent={role.coverage.coveragePercent}
          description="This role still has training requirements without approved SOP support."
          detail={missingSops.map((item) => item.item.title).join(' · ') || 'No specific missing requirements listed yet.'}
          title="Missing SOP coverage"
        />
      )}

      <section className="detailSection">
        <h4>Today’s work</h4>
        {role.timeline.items.length > 0 ? (
          <div className="executionTimelineGrid">
            {role.timeline.groups.map((group) => (
              <ExecutionGroup
                group={{
                  ...group,
                  items: group.items.filter((item) => item.roleId === null || role.matchedRoles.some((matched) => matched.id === item.roleId)),
                }}
                key={group.id}
                onAction={(item) => routeAction(item, { onOpenAudits, onOpenChecklists, onOpenKnowledgeBase, onOpenOperations, onOpenTraining })}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No execution items yet"
            description="This role is ready, but no live checklist, audit, or training execution is currently linked."
          />
        )}
      </section>

      <section className="detailSection">
        <h4>Training</h4>
        {role.trainingPaths.length > 0 ? (
          <div className="roleItemGrid">
            {role.trainingPaths.map((path) => (
              <TrainingPathCard key={path.id} path={path} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ShieldAlert} title="No training path yet" description="Training readiness will appear once a path is linked to this role." />
        )}
      </section>

      <section className="detailSection">
        <h4>Processes</h4>
        {role.processes.length > 0 ? (
          <div className="roleItemGrid">
            {role.processes.map((process) => (
              <ProcessCard key={process.id} process={process} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No processes yet" description="Operational work for this role will appear once process links exist." />
        )}
      </section>

      <section className="detailSection">
        <h4>Checklists</h4>
        {role.checklistTemplates.length > 0 ? (
          <div className="roleItemGrid">
            {roleTemplateItems(role).map((item) => (
              <SOPCard
                action={onOpenChecklists ? <button className="tableLink" onClick={onOpenChecklists} type="button">Open Checklists</button> : undefined}
                key={item.id}
                sourceDetail={`${item.runs} runs`}
                sourceLabel={item.type}
                status={item.status}
                summary={item.description}
                title={item.title}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No checklist templates" description="Checklist coverage for this role will appear once a template is linked." />
        )}
      </section>

      <section className="detailSection">
        <h4>Audits</h4>
        {role.auditTemplates.length > 0 ? (
          <div className="roleItemGrid">
            {roleAuditItems(role).map((item) => (
              <SOPCard
                action={onOpenAudits ? <button className="tableLink" onClick={onOpenAudits} type="button">Open Audits</button> : undefined}
                key={item.id}
                sourceDetail={`${item.runs} runs`}
                sourceLabel={item.type}
                status={item.status}
                summary={item.description}
                title={item.title}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={AlertCircle} title="No audit templates" description="Audit coverage for this role will appear once a template is linked." />
        )}
      </section>

      <SOPRelatedKnowledge
        emptyLabel="No approved SOPs are linked to this role yet."
        items={role.sopObjects.map((object) => ({
          id: object.id,
          title: object.title,
          subtitle: object.manualTitle,
          summary: object.preview,
          status: object.status,
          notes: object.sourceSectionHeading,
          action: onOpenKnowledgeBase ? (
            <button className="tableLink" onClick={onOpenKnowledgeBase} type="button">
              Open SOP
            </button>
          ) : undefined,
        }))}
        title="Linked SOPs"
      />
    </div>
  );
}

export function RoleOSModule(props: RoleOSModuleProps = {}): JSX.Element {
  const [data, setData] = useState<RoleOSData | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getRolesOSData()
      .then((nextData) => {
        if (!active) return;
        setData(nextData);
        setSelectedRoleId((current) => current ?? nextData.roles[0]?.definition.id ?? null);
      })
      .catch((reason: unknown) => {
        if (active) setError(friendlyError(reason));
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedRole = useMemo(
    () => data?.roles.find((role) => role.definition.id === selectedRoleId) ?? data?.roles[0] ?? null,
    [data, selectedRoleId],
  );

  return (
    <section className="pageStack rolesEngine">
      <div className="sectionHeader">
        <div>
          <h2>Roles</h2>
          <p>Job-based workspaces built from live SOPs, operations, training, checklists, and audits.</p>
        </div>
        <div className="engineStats">
          <span>{data?.roles.length ?? '...'} roles</span>
          <span>{data?.roles.reduce((sum, role) => sum + role.metrics.trainingPaths, 0) ?? '...'} training paths</span>
          <span>{data?.roles.reduce((sum, role) => sum + role.coverage.missingCount, 0) ?? '...'} missing SOPs</span>
        </div>
      </div>

      {error && (
        <div className="notice error actionNotice">
          <AlertCircle aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      {!data ? (
        <EmptyState icon={Users} title="Loading roles" description="Pulling live role workspaces from Supabase." />
      ) : (
        <div className="rolesLayout">
          <aside className="listPanel rolesList">
            <div className="rolesCardGrid">
              {data.roles.map((role) => (
                <RoleCard key={role.definition.id} onSelect={setSelectedRoleId} role={role} selected={role.definition.id === selectedRole?.definition.id} />
              ))}
            </div>
          </aside>
          <div className="detailPanel rolesDetailPanel">
            {selectedRole ? (
              <RoleDetail
                onOpenAudits={props.onOpenAudits}
                onOpenChecklists={props.onOpenChecklists}
                onOpenKnowledgeBase={props.onOpenKnowledgeBase}
                onOpenOperations={props.onOpenOperations}
                onOpenTraining={props.onOpenTraining}
                role={selectedRole}
              />
            ) : (
              <EmptyState icon={Users} title="Select a role" description="Pick a job-based workspace to review today’s work, SOPs, and execution status." />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
