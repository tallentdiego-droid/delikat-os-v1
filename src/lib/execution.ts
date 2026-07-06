import { getAuditEngineData, type AuditRun, type AuditTemplate } from './audits';
import { getChecklistEngineData, type ChecklistRun, type ChecklistTemplate } from './checklists';
import { getKnowledgeEngineData } from './knowledge';
import { getOperationsEngineData, type OperationsProcess } from './operations';
import { getTrainingEngineData, type TrainingPath } from './training';

export type ExecutionType =
  | 'checklist'
  | 'audit'
  | 'training'
  | 'task'
  | 'maintenance'
  | 'inventory'
  | 'haccp';

export type ExecutionStatus = 'planned' | 'scheduled' | 'ready' | 'in_progress' | 'blocked' | 'waiting' | 'completed' | 'verified' | 'archived';
export type ExecutionGroupId = 'now' | 'next' | 'later_today' | 'completed' | 'blocked';
export type ExecutionRoute = 'checklists' | 'audits' | 'training' | 'operations' | 'knowledge';
export type ExecutionSourceKind = 'checklist_run' | 'audit_run' | 'training_path' | 'operation_process';

export interface ExecutionTimelineItem {
  id: string;
  title: string;
  description: string | null;
  executionType: ExecutionType;
  status: ExecutionStatus;
  priority: number;
  itemCount: number | null;
  executionDate: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  groupId: ExecutionGroupId;
  sourceKind: ExecutionSourceKind;
  sourceLabel: string;
  relatedModuleLabel: string;
  roleId: string | null;
  roleLabel: string | null;
  sourceId: string;
  sourceRoute: ExecutionRoute | null;
  progressLabel: string;
  nextAction: string;
  actionLabel: string;
  blockedReason: string | null;
  overdue: boolean;
  isFuture: boolean;
}

export interface ExecutionTimelineGroup {
  id: ExecutionGroupId;
  title: string;
  description: string;
  items: ExecutionTimelineItem[];
}

export interface ExecutionTimelineStats {
  total: number;
  now: number;
  next: number;
  laterToday: number;
  completed: number;
  blocked: number;
  overdue: number;
  highestPriority: number;
  missingCount: number;
}

export interface ExecutionTimelineData {
  items: ExecutionTimelineItem[];
  groups: ExecutionTimelineGroup[];
  stats: ExecutionTimelineStats;
  refreshedAt: string;
}

interface ExecutionSource {
  executionType: ExecutionType;
  title: string;
  description: string | null;
  status: ExecutionStatus;
  priority: number;
  itemCount: number | null;
  executionDate: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sourceKind: ExecutionSourceKind;
  sourceLabel: string;
  relatedModuleLabel: string;
  roleId: string | null;
  roleLabel: string | null;
  sourceId: string;
  sourceRoute: ExecutionRoute | null;
  progressLabel: string;
  nextAction: string;
  actionLabel: string;
  blockedReason: string | null;
}

interface TodayBuckets {
  checklistRuns: Map<string, ChecklistRun>;
  auditRuns: Map<string, AuditRun>;
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toDateKey(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function priorityFromNumber(value: number | null | undefined): number {
  if (!value || Number.isNaN(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function checklistStatus(run: ChecklistRun): ExecutionStatus {
  if (run.status === 'completed') return 'completed';
  if (run.status === 'in_progress') return 'in_progress';
  if (run.status === 'cancelled') return 'archived';
  if (run.status === 'scheduled') return 'scheduled';
  return 'planned';
}

function auditStatus(run: AuditRun): ExecutionStatus {
  if (run.status === 'passed') return 'verified';
  if (run.status === 'failed') return 'blocked';
  if (run.status === 'in_progress') return 'in_progress';
  if (run.status === 'cancelled') return 'archived';
  if (run.status === 'planned') return 'planned';
  return 'scheduled';
}

function trainingStatus(path: TrainingPath): ExecutionStatus {
  const required = path.items.length;
  const completed = path.progress.filter((item) => item.status === 'completed' || item.status === 'passed').length;
  if (required > 0 && completed >= required) return 'completed';
  if (path.missingItemCount > 0 && completed === 0) return 'blocked';
  if (completed > 0) return 'in_progress';
  if (path.assignments.length > 0) return 'waiting';
  if (path.status === 'active') return 'ready';
  if (path.status === 'archived') return 'archived';
  return 'planned';
}

function processStatus(process: OperationsProcess): ExecutionStatus {
  if (process.status !== 'active') return 'archived';
  if (process.knowledgeLinkCount === 0) return 'blocked';
  if (process.dependencyCount > 0) return 'waiting';
  return 'ready';
}

function groupFromStatus(status: ExecutionStatus, executionDate: string | null, scheduledAt: string | null, startedAt: string | null, completedAt: string | null): ExecutionGroupId {
  const today = todayBusinessDate();
  const executionDay = toDateKey(executionDate);
  const scheduleDay = toDateKey(scheduledAt);

  if (status === 'blocked') return 'blocked';
  if (status === 'completed' || status === 'verified' || status === 'archived') return 'completed';
  if (status === 'in_progress' || startedAt) return 'now';
  if (executionDay === today || scheduleDay === today) return 'later_today';
  if (status === 'scheduled' || status === 'planned' || status === 'ready' || status === 'waiting') return 'next';
  if (completedAt) return 'completed';
  return 'next';
}

function overdueFromDates(status: ExecutionStatus, executionDate: string | null, completedAt: string | null): boolean {
  if (completedAt || status === 'completed' || status === 'verified' || status === 'archived') return false;
  const today = todayBusinessDate();
  const executionDay = toDateKey(executionDate);
  return Boolean(executionDay && executionDay < today);
}

function labelForStatus(status: ExecutionStatus): string {
  switch (status) {
    case 'planned':
      return 'Planned';
    case 'scheduled':
      return 'Scheduled';
    case 'ready':
      return 'Ready';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'waiting':
      return 'Waiting';
    case 'completed':
      return 'Completed';
    case 'verified':
      return 'Verified';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

function labelForType(type: ExecutionType): string {
  if (type === 'checklist') return 'Checklist';
  if (type === 'audit') return 'Audit';
  if (type === 'training') return 'Training';
  if (type === 'task') return 'Task';
  if (type === 'maintenance') return 'Maintenance';
  if (type === 'inventory') return 'Inventory';
  return 'HACCP';
}

function blockedReasonForChecklist(template: ChecklistTemplate): string | null {
  if (template.missingKnowledgeCount > 0) return `${template.missingKnowledgeCount} missing SOP links`;
  return null;
}

function blockedReasonForAudit(template: AuditTemplate): string | null {
  if (template.missingKnowledgeCount > 0) return `${template.missingKnowledgeCount} missing SOP links`;
  return null;
}

function blockedReasonForTraining(path: TrainingPath): string | null {
  if (path.missingItemCount > 0) return `${path.missingItemCount} training gaps still need coverage`;
  return null;
}

function blockedReasonForProcess(process: OperationsProcess): string | null {
  if (process.knowledgeLinkCount === 0) return 'Missing SOP links';
  return null;
}

function checklistActionLabel(status: ExecutionStatus): string {
  if (status === 'completed') return 'Review checklist';
  if (status === 'in_progress') return 'Continue checklist';
  return 'Start checklist';
}

function roleLabelFromReference(reference: { id: string; title: string } | null | undefined): string | null {
  return reference ? reference.title : null;
}

function auditActionLabel(status: ExecutionStatus): string {
  if (status === 'verified' || status === 'completed') return 'Review audit';
  if (status === 'blocked') return 'Review audit';
  if (status === 'in_progress') return 'Continue audit';
  return 'Start audit';
}

function trainingActionLabel(status: ExecutionStatus): string {
  if (status === 'completed') return 'Review training';
  if (status === 'in_progress' || status === 'waiting') return 'Continue training';
  return 'Open training';
}

function processActionLabel(status: ExecutionStatus): string {
  if (status === 'blocked') return 'Review knowledge';
  return 'Open process';
}

function createItem(source: ExecutionSource): ExecutionTimelineItem {
  const groupId = groupFromStatus(source.status, source.executionDate, source.scheduledAt, source.startedAt, source.completedAt);

  return {
    id: source.sourceId,
    title: source.title,
    description: source.description,
    executionType: source.executionType,
    status: source.status,
    priority: priorityFromNumber(source.priority),
    itemCount: source.itemCount,
    executionDate: source.executionDate,
    scheduledAt: source.scheduledAt,
    startedAt: source.startedAt,
    completedAt: source.completedAt,
    groupId,
    sourceKind: source.sourceKind,
    sourceLabel: source.sourceLabel,
    relatedModuleLabel: source.relatedModuleLabel,
    roleId: source.roleId,
    roleLabel: source.roleLabel,
    sourceId: source.sourceId,
    sourceRoute: source.sourceRoute,
    progressLabel: source.progressLabel,
    nextAction: source.nextAction,
    actionLabel: source.actionLabel,
    blockedReason: source.blockedReason,
    overdue: overdueFromDates(source.status, source.executionDate, source.completedAt),
    isFuture: groupId === 'next' || groupId === 'later_today',
  };
}

function sortItems(items: ExecutionTimelineItem[]): ExecutionTimelineItem[] {
  return [...items].sort((a, b) => {
    const priorityCompare = b.priority - a.priority;
    if (priorityCompare !== 0) return priorityCompare;
    const aDate = a.executionDate ?? a.scheduledAt ?? a.startedAt ?? a.completedAt ?? '';
    const bDate = b.executionDate ?? b.scheduledAt ?? b.startedAt ?? b.completedAt ?? '';
    const dateCompare = aDate.localeCompare(bDate);
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });
}

function buildGroups(items: ExecutionTimelineItem[]): ExecutionTimelineGroup[] {
  const groups: Array<ExecutionTimelineGroup> = [
    { id: 'now', title: 'Now', description: 'Execution already in motion.', items: [] },
    { id: 'next', title: 'Next', description: 'Ready to launch after the current round finishes.', items: [] },
    { id: 'later_today', title: 'Later Today', description: 'Scheduled for later in the day or waiting on a manager action.', items: [] },
    { id: 'completed', title: 'Completed', description: 'Finished or verified today.', items: [] },
    { id: 'blocked', title: 'Blocked', description: 'Missing knowledge or dependencies are stopping execution.', items: [] },
  ];

  for (const item of items) {
    const group = groups.find((entry) => entry.id === item.groupId);
    if (group) group.items.push(item);
  }

  return groups.map((group) => ({ ...group, items: sortItems(group.items) }));
}

function buildChecklistItems(data: Awaited<ReturnType<typeof getChecklistEngineData>>, buckets: TodayBuckets): ExecutionSource[] {
  const items: ExecutionSource[] = [];

  for (const template of data.templates) {
    const todayRun = template.id ? buckets.checklistRuns.get(template.id) ?? null : null;
    if (todayRun) {
      items.push({
        executionType: 'checklist',
        title: todayRun.templateTitle ?? template.title,
        description: template.description,
        status: checklistStatus(todayRun),
        priority: priorityFromNumber(template.process?.priority),
        itemCount: todayRun.itemCount,
        executionDate: todayRun.businessDate,
        scheduledAt: todayRun.startedAt ?? todayRun.createdAt,
        startedAt: todayRun.startedAt,
        completedAt: todayRun.completedAt,
        sourceKind: 'checklist_run',
        sourceLabel: 'Checklist',
        relatedModuleLabel: 'Checklists',
        roleId: template.role?.id ?? null,
        roleLabel: roleLabelFromReference(template.role),
        sourceId: todayRun.id,
        sourceRoute: 'checklists',
        progressLabel: `${todayRun.completedCount}/${todayRun.itemCount} checklist items`,
        nextAction:
          todayRun.status === 'completed'
            ? 'Review checklist completion'
            : todayRun.status === 'in_progress'
              ? 'Continue checklist execution'
              : 'Open checklist execution',
        actionLabel: checklistActionLabel(checklistStatus(todayRun)),
        blockedReason: blockedReasonForChecklist(template),
      });
      continue;
    }

    const status = template.missingKnowledgeCount > 0 ? 'blocked' : template.openRunCount > 0 ? 'waiting' : 'ready';
    const executionDate = template.frequency && template.frequency.toLowerCase().includes('daily') ? todayBusinessDate() : null;

    items.push({
      executionType: 'checklist',
      title: template.title,
      description: template.description,
      status,
      priority: priorityFromNumber(template.process?.priority),
      itemCount: template.itemCount,
      executionDate,
      scheduledAt: executionDate ? `${executionDate}T08:00:00` : null,
      startedAt: null,
      completedAt: null,
      sourceKind: 'checklist_run',
      sourceLabel: 'Checklist',
      relatedModuleLabel: 'Checklists',
      roleId: template.role?.id ?? null,
      roleLabel: roleLabelFromReference(template.role),
      sourceId: template.id,
      sourceRoute: 'checklists',
      progressLabel: `${template.itemCount} template items`,
      nextAction: status === 'blocked' ? 'Review missing knowledge' : 'Start checklist execution',
      actionLabel: checklistActionLabel(status),
      blockedReason: blockedReasonForChecklist(template),
    });
  }

  return items;
}

function buildAuditItems(data: Awaited<ReturnType<typeof getAuditEngineData>>, buckets: TodayBuckets): ExecutionSource[] {
  const items: ExecutionSource[] = [];

  for (const template of data.templates) {
    const todayRun = template.id ? buckets.auditRuns.get(template.id) ?? null : null;
    if (todayRun) {
      items.push({
        executionType: 'audit',
        title: todayRun.templateTitle ?? template.title,
        description: template.description,
        status: auditStatus(todayRun),
        priority: priorityFromNumber(template.checklistTemplate?.process?.priority ?? (template.processId ? 4 : 3)),
        itemCount: todayRun.itemCount,
        executionDate: todayRun.businessDate,
        scheduledAt: todayRun.startedAt ?? todayRun.createdAt,
        startedAt: todayRun.startedAt,
        completedAt: todayRun.completedAt,
        sourceKind: 'audit_run',
        sourceLabel: 'Audit',
        relatedModuleLabel: 'Audits',
        roleId: template.checklistTemplate?.role?.id ?? null,
        roleLabel: roleLabelFromReference(template.checklistTemplate?.role ?? null),
        sourceId: todayRun.id,
        sourceRoute: 'audits',
        progressLabel: `${todayRun.completedCount}/${todayRun.itemCount} audit items`,
        nextAction:
          todayRun.status === 'passed'
            ? 'Review audit score'
            : todayRun.status === 'failed'
              ? 'Review failed audit'
            : todayRun.status === 'in_progress'
              ? 'Continue audit execution'
              : 'Open audit execution',
        actionLabel: auditActionLabel(auditStatus(todayRun)),
        blockedReason: blockedReasonForAudit(template),
      });
      continue;
    }

    const status = template.missingKnowledgeCount > 0 ? 'blocked' : template.openRunCount > 0 ? 'waiting' : 'ready';
    const executionDate = template.auditType.includes('visit') ? todayBusinessDate() : null;

    items.push({
      executionType: 'audit',
      title: template.title,
      description: template.description,
      status,
      priority: priorityFromNumber(template.checklistTemplate?.process?.priority ?? (template.processId ? 4 : 3)),
      itemCount: template.itemCount,
      executionDate,
      scheduledAt: executionDate ? `${executionDate}T14:00:00` : null,
      startedAt: null,
      completedAt: null,
      sourceKind: 'audit_run',
      sourceLabel: 'Audit',
      relatedModuleLabel: 'Audits',
      roleId: template.checklistTemplate?.role?.id ?? null,
      roleLabel: roleLabelFromReference(template.checklistTemplate?.role ?? null),
      sourceId: template.id,
      sourceRoute: 'audits',
      progressLabel: `${template.itemCount} template items`,
      nextAction: status === 'blocked' ? 'Review missing knowledge' : 'Start audit execution',
      actionLabel: auditActionLabel(status),
      blockedReason: blockedReasonForAudit(template),
    });
  }

  return items;
}

function buildTrainingItems(data: Awaited<ReturnType<typeof getTrainingEngineData>>): ExecutionSource[] {
  return data.paths.map((path) => {
    const status = trainingStatus(path);
    const assignedAt = path.assignments[0]?.assignedAt ?? null;
    const dueAt = path.assignments[0]?.dueAt ?? null;
    const completed = path.progress.filter((item) => item.status === 'completed' || item.status === 'passed').length;

    return {
      executionType: 'training',
      title: path.title,
      description: path.description,
      status,
      priority: priorityFromNumber(path.role?.code ? 3 : 2),
      itemCount: path.items.length,
      executionDate: dueAt ? toDateKey(dueAt) : null,
      scheduledAt: dueAt ?? assignedAt,
      startedAt: completed > 0 ? assignedAt : null,
      completedAt: completed > 0 && completed >= path.items.length ? dueAt ?? assignedAt : null,
      sourceKind: 'training_path',
      sourceLabel: 'Training',
      relatedModuleLabel: 'Training',
      roleId: path.role?.id ?? null,
      roleLabel: path.role?.name ?? null,
      sourceId: path.id,
      sourceRoute: 'training',
      progressLabel: `${completed}/${path.items.length} training items completed`,
      nextAction:
        status === 'completed'
          ? 'Review completed training'
          : status === 'blocked'
            ? 'Review training gaps'
            : completed > 0
              ? 'Continue training'
              : 'Open training path',
      actionLabel: trainingActionLabel(status),
      blockedReason: blockedReasonForTraining(path),
    };
  });
}

function buildProcessItems(data: Awaited<ReturnType<typeof getOperationsEngineData>>): ExecutionSource[] {
  return data.processes
    .filter((process) => process.status === 'active')
    .map((process) => {
      const status = processStatus(process);
      const isOpeningOrClosing = process.triggerType === 'opening' || process.triggerType === 'closing';
      const executionDate = isOpeningOrClosing ? todayBusinessDate() : null;

      return {
        executionType: 'task',
        title: process.name,
        description: process.description,
        status,
        priority: priorityFromNumber(process.priority),
        itemCount: process.stepCount,
        executionDate,
        scheduledAt: executionDate ? `${executionDate}T07:00:00` : null,
        startedAt: null,
        completedAt: null,
        sourceKind: 'operation_process',
        sourceLabel: 'Operations',
        relatedModuleLabel: 'Operations',
        roleId: process.role?.id ?? null,
        roleLabel: process.role?.title ?? null,
        sourceId: process.id,
        sourceRoute: 'operations',
        progressLabel: `${process.stepCount} process steps`,
        nextAction: status === 'blocked' ? 'Open knowledge coverage' : 'Open process detail',
        actionLabel: processActionLabel(status),
        blockedReason: blockedReasonForProcess(process),
      };
    });
}

function labelByRoute(route: ExecutionRoute | null): string {
  if (route === 'checklists') return 'Open Checklists';
  if (route === 'audits') return 'Open Audits';
  if (route === 'training') return 'Open Training';
  if (route === 'operations') return 'Open Operations';
  return 'Review Knowledge';
}

export function executionStatusLabel(status: ExecutionStatus): string {
  return labelForStatus(status);
}

export function executionTypeLabel(type: ExecutionType): string {
  return labelForType(type);
}

export function executionPriorityLabel(priority: number): string {
  if (priority >= 5) return 'Critical';
  if (priority === 4) return 'High';
  if (priority === 3) return 'Normal';
  if (priority === 2) return 'Low';
  return 'Backlog';
}

export async function getExecutionTimelineData(): Promise<ExecutionTimelineData> {
  const [checklists, audits, training, operations, knowledge] = await Promise.all([
    getChecklistEngineData(),
    getAuditEngineData(),
    getTrainingEngineData(),
    getOperationsEngineData(),
    getKnowledgeEngineData(),
  ]);

  const today = todayBusinessDate();
  const checklistRuns = new Map(checklists.runs.filter((run) => run.businessDate === today && run.checklistTemplateId).map((run) => [run.checklistTemplateId as string, run]));
  const auditRuns = new Map(audits.runs.filter((run) => run.businessDate === today).map((run) => [run.auditTemplateId, run]));
  const buckets: TodayBuckets = {
    checklistRuns,
    auditRuns,
  };

  const items = [
    ...buildChecklistItems(checklists, buckets),
    ...buildAuditItems(audits, buckets),
    ...buildTrainingItems(training),
    ...buildProcessItems(operations),
  ].map(createItem);

  const grouped = buildGroups(items);
  const highestPriority = items.reduce((max, item) => Math.max(max, item.priority), 0);
  const nowCount = grouped.find((group) => group.id === 'now')?.items.length ?? 0;
  const nextCount = grouped.find((group) => group.id === 'next')?.items.length ?? 0;
  const laterCount = grouped.find((group) => group.id === 'later_today')?.items.length ?? 0;
  const completedCount = grouped.find((group) => group.id === 'completed')?.items.length ?? 0;
  const blockedCount = grouped.find((group) => group.id === 'blocked')?.items.length ?? 0;
  const overdueCount = items.filter((item) => item.overdue).length;
  const missingCount =
    knowledge.coverage.missing.length + operations.stats.processesMissingKnowledge + checklists.stats.itemsMissingCoverage + audits.stats.itemsMissingCoverage + training.stats.itemsMissingCoverage;

  return {
    items,
    groups: grouped,
    stats: {
      total: items.length,
      now: nowCount,
      next: nextCount,
      laterToday: laterCount,
      completed: completedCount,
      blocked: blockedCount,
      overdue: overdueCount,
      highestPriority,
      missingCount,
    },
    refreshedAt: new Date().toISOString(),
  };
}

export function executionRouteLabel(route: ExecutionRoute | null): string {
  return labelByRoute(route);
}
