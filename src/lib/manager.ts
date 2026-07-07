import { getAuditEngineData, type AuditRun } from './audits';
import { getChecklistEngineData, type ChecklistRun } from './checklists';
import { getExecutionTimelineData, type ExecutionTimelineData, type ExecutionTimelineItem } from './execution';
import { getKnowledgeEngineData, type KnowledgeCoverageResult } from './knowledge';
import { getRolesOSData, type RoleOSData } from './roles';
import { getTrainingEngineData, type TrainingPath } from './training';

export interface ManagerOSData {
  refreshedAt: string;
  timeline: ExecutionTimelineData;
  roles: RoleOSData;
  activeChecklistRuns: ChecklistRun[];
  activeAuditRuns: AuditRun[];
  trainingWarnings: TrainingPath[];
  missingSops: KnowledgeCoverageResult[];
  completedItems: ExecutionTimelineItem[];
  blockedItems: ExecutionTimelineItem[];
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isActiveChecklistRun(run: ChecklistRun, today: string): boolean {
  if (run.status === 'in_progress') return true;
  if (run.status !== 'scheduled') return false;
  return run.businessDate === today;
}

function isActiveAuditRun(run: AuditRun, today: string): boolean {
  if (run.status === 'in_progress') return true;
  if (run.status !== 'planned') return false;
  return run.businessDate === today;
}

export async function getManagerOSData(): Promise<ManagerOSData> {
  const [timeline, roles, checklists, audits, training, knowledge] = await Promise.all([
    getExecutionTimelineData(),
    getRolesOSData(),
    getChecklistEngineData(),
    getAuditEngineData(),
    getTrainingEngineData(),
    getKnowledgeEngineData(),
  ]);

  const today = todayBusinessDate();
  const activeChecklistRuns = checklists.runs.filter((run) => isActiveChecklistRun(run, today));
  const activeAuditRuns = audits.runs.filter((run) => isActiveAuditRun(run, today));
  const trainingWarnings = [...training.paths]
    .filter((path) => path.missingItemCount > 0)
    .sort((a, b) => b.missingItemCount - a.missingItemCount || a.title.localeCompare(b.title));
  const missingSops = [...knowledge.coverage.topMissing]
    .sort((a, b) => b.item.priority - a.item.priority || a.item.title.localeCompare(b.item.title))
    .slice(0, 8);
  const completedItems = timeline.groups.find((group) => group.id === 'completed')?.items ?? [];
  const blockedItems = timeline.groups.find((group) => group.id === 'blocked')?.items ?? [];

  return {
    refreshedAt: new Date().toISOString(),
    timeline,
    roles,
    activeChecklistRuns,
    activeAuditRuns,
    trainingWarnings,
    missingSops,
    completedItems,
    blockedItems,
  };
}
