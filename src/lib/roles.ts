import { getAuditEngineData, type AuditRun, type AuditTemplate } from './audits';
import { getChecklistEngineData, type ChecklistRun, type ChecklistTemplate } from './checklists';
import { getExecutionTimelineData, type ExecutionTimelineData, type ExecutionTimelineItem } from './execution';
import { getKnowledgeEngineData, type KnowledgeCoverageResult, type KnowledgeObject, type KnowledgeOntologyEntity } from './knowledge';
import { getOperationsEngineData, type OperationsProcess } from './operations';
import { getTrainingEngineData, type TrainingPath } from './training';

export interface RoleOSDefinition {
  id: string;
  title: string;
  aliases: string[];
}

export interface RoleOSCoverageSummary {
  requiredCount: number;
  satisfiedCount: number;
  missingCount: number;
  coveragePercent: number;
  topMissing: KnowledgeCoverageResult[];
}

export interface RoleOSMetrics {
  trainingPaths: number;
  processes: number;
  checklistTemplates: number;
  checklistRuns: number;
  auditTemplates: number;
  auditRuns: number;
  sopObjects: number;
  executionItems: number;
  now: number;
  next: number;
  laterToday: number;
  blocked: number;
  completed: number;
  ready: number;
}

export interface RoleOSWorkspace {
  definition: RoleOSDefinition;
  matchedRoles: KnowledgeOntologyEntity[];
  coverage: RoleOSCoverageSummary;
  metrics: RoleOSMetrics;
  trainingPaths: TrainingPath[];
  processes: OperationsProcess[];
  checklistTemplates: ChecklistTemplate[];
  checklistRuns: ChecklistRun[];
  auditTemplates: AuditTemplate[];
  auditRuns: AuditRun[];
  sopObjects: KnowledgeObject[];
  executionItems: ExecutionTimelineItem[];
  timeline: ExecutionTimelineData;
}

export interface RoleOSData {
  roles: RoleOSWorkspace[];
  refreshedAt: string;
}

export const ROLE_OS_DEFINITIONS: RoleOSDefinition[] = [
  { id: 'mesero-waiter', title: 'Mesero / Waiter', aliases: ['mesero', 'waiter', 'server'] },
  { id: 'caja-cashier', title: 'Caja / Cashier', aliases: ['caja', 'cashier'] },
  { id: 'cocina-kitchen', title: 'Cocina / Kitchen', aliases: ['cocina', 'kitchen', 'cook', 'line cook', 'prep cook'] },
  { id: 'bar', title: 'Bar', aliases: ['bar', 'bartender', 'mixologist'] },
  { id: 'supervisor', title: 'Supervisor', aliases: ['supervisor', 'manager', 'operations manager', 'kitchen manager', 'general manager'] },
];

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function containsAlias(value: string, aliases: string[]): boolean {
  const haystack = normalize(value);
  return aliases.some((alias) => haystack.includes(normalize(alias)));
}

function matchingOntologyRoles(allRoles: KnowledgeOntologyEntity[], definition: RoleOSDefinition): KnowledgeOntologyEntity[] {
  return allRoles.filter((role) => containsAlias(`${role.name} ${role.code}`, definition.aliases));
}

function roleIds(roles: KnowledgeOntologyEntity[]): string[] {
  return roles.map((role) => role.id);
}

function matchesRoleEntity<T extends { role?: KnowledgeOntologyEntity | null }>(item: T, roles: KnowledgeOntologyEntity[], aliases: string[], label?: string | null): boolean {
  if (item.role && roles.some((role) => role.id === item.role?.id)) return true;
  if (label && containsAlias(label, aliases)) return true;
  if (item.role && containsAlias(item.role.name, aliases)) return true;
  return false;
}

function coverageSummary(results: KnowledgeCoverageResult[], matchedRoleIds: string[]): RoleOSCoverageSummary {
  const filtered = results.filter((result) =>
    result.item.ontology.roles.some((role) => matchedRoleIds.includes(role.id)),
  );
  const satisfiedCount = filtered.filter((result) => result.status === 'satisfied').length;
  const missingCount = filtered.filter((result) => result.status === 'missing').length;
  const requiredCount = filtered.length;
  return {
    requiredCount,
    satisfiedCount,
    missingCount,
    coveragePercent: requiredCount === 0 ? 0 : Math.round((satisfiedCount / requiredCount) * 100),
    topMissing: filtered
      .filter((result) => result.status === 'missing')
      .sort((a, b) => a.item.priority - b.item.priority || a.item.title.localeCompare(b.item.title))
      .slice(0, 5),
  };
}

function buildTimelineForRole(items: ExecutionTimelineItem[], roles: KnowledgeOntologyEntity[], aliases: string[]): ExecutionTimelineData {
  const filtered = items.filter(
    (item) => (item.roleId !== null && roles.some((role) => role.id === item.roleId)) || (item.roleLabel ? containsAlias(item.roleLabel, aliases) : false),
  );

  const now = filtered.filter((item) => item.groupId === 'now').length;
  const next = filtered.filter((item) => item.groupId === 'next').length;
  const laterToday = filtered.filter((item) => item.groupId === 'later_today').length;
  const completed = filtered.filter((item) => item.groupId === 'completed').length;
  const blocked = filtered.filter((item) => item.groupId === 'blocked').length;
  const overdue = filtered.filter((item) => item.overdue).length;
  const highestPriority = filtered.reduce((max, item) => Math.max(max, item.priority), 0);

  return {
    items: filtered,
    groups: [
      { id: 'now', title: 'Now', description: 'Work already in motion for this role.', items: filtered.filter((item) => item.groupId === 'now') },
      { id: 'next', title: 'Next', description: 'Ready when the current work clears.', items: filtered.filter((item) => item.groupId === 'next') },
      { id: 'later_today', title: 'Later Today', description: 'Scheduled or waiting for a manager action.', items: filtered.filter((item) => item.groupId === 'later_today') },
      { id: 'completed', title: 'Completed', description: 'Finished or verified for this role.', items: filtered.filter((item) => item.groupId === 'completed') },
      { id: 'blocked', title: 'Blocked', description: 'Missing SOPs or dependencies are stopping execution.', items: filtered.filter((item) => item.groupId === 'blocked') },
    ],
    stats: {
      total: filtered.length,
      now,
      next,
      laterToday,
      completed,
      blocked,
      overdue,
      highestPriority,
      missingCount: filtered.filter((item) => item.status === 'blocked').length,
    },
    refreshedAt: new Date().toISOString(),
  };
}

export async function getRolesOSData(): Promise<RoleOSData> {
  const [knowledge, operations, training, checklists, audits, execution] = await Promise.all([
    getKnowledgeEngineData(),
    getOperationsEngineData(),
    getTrainingEngineData(),
    getChecklistEngineData(),
    getAuditEngineData(),
    getExecutionTimelineData(),
  ]);

  const ontologyRoles = knowledge.ontologyOptions.roles;
  const roleWorkspaces = ROLE_OS_DEFINITIONS.map((definition) => {
    const matchedRoles = matchingOntologyRoles(ontologyRoles, definition);
    const matchedRoleIds = roleIds(matchedRoles);

    const trainingPaths = training.paths.filter((path) =>
      (path.role && matchedRoleIds.includes(path.role.id)) || containsAlias(path.role?.name ?? '', definition.aliases),
    );
    const processes = operations.processes.filter((process) =>
      (process.role && matchedRoleIds.includes(process.role.id)) || containsAlias(process.role?.title ?? '', definition.aliases),
    );
    const checklistTemplates = checklists.templates.filter(
      (template) => (template.role && matchedRoleIds.includes(template.role.id)) || containsAlias(template.role?.title ?? '', definition.aliases),
    );
    const checklistTemplateIds = new Set(checklistTemplates.map((template) => template.id));
    const checklistRuns = checklists.runs.filter((run) => run.checklistTemplateId && checklistTemplateIds.has(run.checklistTemplateId));
    const auditTemplates = audits.templates.filter(
      (template) =>
        (template.checklistTemplate?.role && matchedRoleIds.includes(template.checklistTemplate.role.id)) ||
        containsAlias(template.checklistTemplate?.role?.title ?? '', definition.aliases),
    );
    const auditTemplateIds = new Set(auditTemplates.map((template) => template.id));
    const auditRuns = audits.runs.filter((run) => auditTemplateIds.has(run.auditTemplateId));
    const sopObjects = knowledge.objects.filter((object) => object.ontology.roles.some((role) => matchedRoleIds.includes(role.id)));
    const timeline = buildTimelineForRole(execution.items, matchedRoles, definition.aliases);
    const coverage = coverageSummary(knowledge.coverage.satisfied.concat(knowledge.coverage.missing), matchedRoleIds);

    const metrics: RoleOSMetrics = {
      trainingPaths: trainingPaths.length,
      processes: processes.length,
      checklistTemplates: checklistTemplates.length,
      checklistRuns: checklistRuns.length,
      auditTemplates: auditTemplates.length,
      auditRuns: auditRuns.length,
      sopObjects: sopObjects.length,
      executionItems: timeline.items.length,
      now: timeline.stats.now,
      next: timeline.stats.next,
      laterToday: timeline.stats.laterToday,
      blocked: timeline.stats.blocked,
      completed: timeline.stats.completed,
      ready: timeline.items.filter((item) => item.status === 'ready').length,
    };

    return {
      definition,
      matchedRoles,
      coverage,
      metrics,
      trainingPaths,
      processes,
      checklistTemplates,
      checklistRuns,
      auditTemplates,
      auditRuns,
      sopObjects,
      executionItems: timeline.items,
      timeline,
    };
  });

  return {
    roles: roleWorkspaces,
    refreshedAt: new Date().toISOString(),
  };
}
