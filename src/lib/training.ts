import { getKnowledgeEngineData, type KnowledgeCoverageResult, type KnowledgeObject, type KnowledgeOntologyEntity, type RequiredKnowledgeItem } from './knowledge';
import { getOperationsEngineData, type OperationsProcess, type OperationsProcessStep } from './operations';
import { supabase, supabaseConfigError } from './supabase';

export type TrainingPathStatus = 'active' | 'draft' | 'archived';
export type TrainingPathItemType = 'knowledge' | 'process' | 'process_step';
export type TrainingItemCoverageStatus = 'missing' | 'satisfied';

export interface TrainingAssignment {
  id: string;
  trainingPathId: string;
  roleId: string | null;
  role: KnowledgeOntologyEntity | null;
  status: string;
  assignedAt: string;
  dueAt: string | null;
}

export interface TrainingProgress {
  id: string;
  assignmentId: string;
  trainingPathItemId: string;
  status: string;
  completedAt: string | null;
}

export interface TrainingPathItem {
  id: string;
  requiredKnowledgeItemId: string;
  requiredKnowledgeItem: RequiredKnowledgeItem;
  knowledgeObjectId: string | null;
  knowledgeObject: KnowledgeObject | null;
  processId: string | null;
  process: OperationsProcess | null;
  processStepId: string | null;
  processStep: OperationsProcessStep | null;
  sortOrder: number;
  itemType: TrainingPathItemType;
  completionRequired: boolean;
  coverageStatus: TrainingItemCoverageStatus;
  matchedKnowledge: KnowledgeObject[];
  gapSummary: string | null;
}

export interface TrainingPath {
  id: string;
  code: string;
  title: string;
  description: string | null;
  department: KnowledgeOntologyEntity | null;
  role: KnowledgeOntologyEntity | null;
  area: KnowledgeOntologyEntity | null;
  status: TrainingPathStatus;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  items: TrainingPathItem[];
  assignments: TrainingAssignment[];
  progress: TrainingProgress[];
  coveragePercent: number;
  requiredItemCount: number;
  satisfiedItemCount: number;
  missingItemCount: number;
  linkedKnowledgeCount: number;
  linkedProcessCount: number;
  linkedProcessStepCount: number;
}

export interface TrainingStats {
  totalPaths: number;
  totalItems: number;
  pathsWithGaps: number;
  itemsMissingCoverage: number;
  assignmentCount: number;
  progressCount: number;
}

export interface TrainingEngineData {
  paths: TrainingPath[];
  assignments: TrainingAssignment[];
  progress: TrainingProgress[];
  coverage: KnowledgeCoverageResult[];
  stats: TrainingStats;
}

interface TrainingPathRow {
  id: string;
  organization_id: string;
  role_id: string | null;
  department_id: string | null;
  area_id: string | null;
  title: string;
  description: string | null;
  code: string;
  status: TrainingPathStatus;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface TrainingPathItemRow {
  id: string;
  organization_id: string;
  training_path_id: string;
  required_knowledge_item_id: string;
  knowledge_object_id: string | null;
  process_id: string | null;
  process_step_id: string | null;
  sort_order: number;
  item_type: TrainingPathItemType;
  completion_required: boolean;
  created_at: string;
  updated_at: string;
}

interface TrainingAssignmentRow {
  id: string;
  organization_id: string;
  training_path_id: string;
  role_id: string | null;
  status: string;
  assigned_at: string;
  due_at: string | null;
}

interface TrainingProgressRow {
  id: string;
  organization_id: string;
  assignment_id: string;
  training_path_item_id: string;
  status: string;
  completed_at: string | null;
}

interface TrainingPathLinkMaps {
  byKnowledgeId: Map<string, KnowledgeObject>;
  requiredKnowledgeById: Map<string, RequiredKnowledgeItem>;
  coverageByRequiredId: Map<string, KnowledgeCoverageResult>;
  processById: Map<string, OperationsProcess>;
  processStepById: Map<string, { process: OperationsProcess; step: OperationsProcessStep }>;
  ontologyById: Map<string, KnowledgeOntologyEntity>;
}

function ensureSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  return supabase;
}

function isMissingTrainingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === '42501' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') === true ||
    error.message?.toLowerCase().includes('permission denied') === true
  );
}

async function selectRows<T>(table: string, columns: string): Promise<T[]> {
  const client = ensureSupabase();
  const { data, error } = await client.from(table).select(columns).order('created_at', { ascending: true });
  if (error) {
    if (isMissingTrainingTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as T[];
}

function coverageMap(coverage: KnowledgeCoverageResult[]): Map<string, KnowledgeCoverageResult> {
  return new Map(coverage.map((result) => [result.item.id, result]));
}

function toOntologyMap(groups: ReturnType<typeof emptyOntologyGroups>): Map<string, KnowledgeOntologyEntity> {
  return new Map([
    ...groups.departments.map((entity) => [entity.id, entity] as const),
    ...groups.roles.map((entity) => [entity.id, entity] as const),
    ...groups.areas.map((entity) => [entity.id, entity] as const),
    ...groups.equipment.map((entity) => [entity.id, entity] as const),
    ...groups.businessProcesses.map((entity) => [entity.id, entity] as const),
    ...groups.documentTypes.map((entity) => [entity.id, entity] as const),
    ...groups.tags.map((entity) => [entity.id, entity] as const),
  ]);
}

function emptyOntologyGroups(): {
  departments: KnowledgeOntologyEntity[];
  roles: KnowledgeOntologyEntity[];
  areas: KnowledgeOntologyEntity[];
  equipment: KnowledgeOntologyEntity[];
  businessProcesses: KnowledgeOntologyEntity[];
  documentTypes: KnowledgeOntologyEntity[];
  tags: KnowledgeOntologyEntity[];
} {
  return {
    departments: [],
    roles: [],
    areas: [],
    equipment: [],
    businessProcesses: [],
    documentTypes: [],
    tags: [],
  };
}

function coveragePercent(existing: number, required: number): number {
  return required === 0 ? 0 : Math.round((existing / required) * 100);
}

function buildStepIndex(processes: OperationsProcess[]): Map<string, { process: OperationsProcess; step: OperationsProcessStep }> {
  const map = new Map<string, { process: OperationsProcess; step: OperationsProcessStep }>();
  for (const process of processes) {
    for (const step of process.steps) {
      map.set(step.id, { process, step });
    }
  }
  return map;
}

function buildPathItems(
  rows: TrainingPathItemRow[],
  context: TrainingPathLinkMaps,
): Map<string, TrainingPathItem[]> {
  const byPath = new Map<string, TrainingPathItem[]>();

  for (const row of rows) {
    const requiredKnowledgeItem = context.requiredKnowledgeById.get(row.required_knowledge_item_id);
    if (!requiredKnowledgeItem) continue;

    const knowledgeObject = row.knowledge_object_id ? context.byKnowledgeId.get(row.knowledge_object_id) ?? null : null;
    const process = row.process_id ? context.processById.get(row.process_id) ?? null : null;
    const processStep = row.process_step_id ? context.processStepById.get(row.process_step_id)?.step ?? null : null;
    const coverageResult = context.coverageByRequiredId.get(requiredKnowledgeItem.id);
    const matchedKnowledge = coverageResult?.matchedObjects ?? (knowledgeObject ? [knowledgeObject] : []);
    const coverageStatus = coverageResult?.status ?? (matchedKnowledge.length > 0 ? 'satisfied' : 'missing');

    const gapSummary =
      coverageStatus === 'missing'
        ? `No approved knowledge object currently satisfies ${requiredKnowledgeItem.title}.`
        : null;

    const item: TrainingPathItem = {
      id: row.id,
      requiredKnowledgeItemId: requiredKnowledgeItem.id,
      requiredKnowledgeItem,
      knowledgeObjectId: row.knowledge_object_id,
      knowledgeObject,
      processId: row.process_id,
      process,
      processStepId: row.process_step_id,
      processStep,
      sortOrder: row.sort_order,
      itemType: row.item_type,
      completionRequired: row.completion_required,
      coverageStatus,
      matchedKnowledge,
      gapSummary,
    };

    byPath.set(row.training_path_id, [...(byPath.get(row.training_path_id) ?? []), item]);
  }

  for (const [pathId, items] of byPath.entries()) {
    byPath.set(
      pathId,
      [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.requiredKnowledgeItem.title.localeCompare(b.requiredKnowledgeItem.title)),
    );
  }

  return byPath;
}

function buildAssignments(rows: TrainingAssignmentRow[], ontologyById: Map<string, KnowledgeOntologyEntity>): TrainingAssignment[] {
  return rows.map((row) => ({
    id: row.id,
    trainingPathId: row.training_path_id,
    roleId: row.role_id,
    role: row.role_id ? ontologyById.get(row.role_id) ?? null : null,
    status: row.status,
    assignedAt: row.assigned_at,
    dueAt: row.due_at,
  }));
}

function buildProgress(rows: TrainingProgressRow[]): TrainingProgress[] {
  return rows.map((row) => ({
    id: row.id,
    assignmentId: row.assignment_id,
    trainingPathItemId: row.training_path_item_id,
    status: row.status,
    completedAt: row.completed_at,
  }));
}

export async function getTrainingEngineData(): Promise<TrainingEngineData> {
  const [knowledgeData, operationsData, pathRows, itemRows, assignmentRows, progressRows] = await Promise.all([
    getKnowledgeEngineData(),
    getOperationsEngineData(),
    selectRows<TrainingPathRow>(
      'os_training_paths_public',
      'id,organization_id,role_id,department_id,area_id,title,description,code,status,source_type,created_at,updated_at',
    ),
    selectRows<TrainingPathItemRow>(
      'os_training_path_items_public',
      'id,organization_id,training_path_id,required_knowledge_item_id,knowledge_object_id,process_id,process_step_id,sort_order,item_type,completion_required,created_at,updated_at',
    ),
    selectRows<TrainingAssignmentRow>(
      'os_training_assignments_public',
      'id,organization_id,training_path_id,role_id,status,assigned_at,due_at',
    ),
    selectRows<TrainingProgressRow>(
      'os_training_progress_public',
      'id,organization_id,assignment_id,training_path_item_id,status,completed_at',
    ),
  ]);

  const ontologyById = toOntologyMap(knowledgeData.ontologyOptions);
  const knowledgeById = new Map(knowledgeData.objects.map((object) => [object.id, object]));
  const requiredKnowledgeById = new Map(knowledgeData.requiredKnowledgeItems.map((item) => [item.id, item]));
  const coverageByRequiredId = coverageMap(knowledgeData.coverage.satisfied.concat(knowledgeData.coverage.missing));
  const processById = new Map(operationsData.processes.map((process) => [process.id, process]));
  const processStepById = buildStepIndex(operationsData.processes);
  const itemByPath = buildPathItems(itemRows, {
    byKnowledgeId: knowledgeById,
    requiredKnowledgeById,
    coverageByRequiredId,
    processById,
    processStepById,
    ontologyById,
  });
  const assignments = buildAssignments(assignmentRows, ontologyById);
  const progress = buildProgress(progressRows);
  const progressByAssignment = new Map<string, TrainingProgress[]>();
  for (const item of progress) {
    progressByAssignment.set(item.assignmentId, [...(progressByAssignment.get(item.assignmentId) ?? []), item]);
  }

  const paths = pathRows.map((row) => {
    const department = row.department_id ? ontologyById.get(row.department_id) ?? null : null;
    const role = row.role_id ? ontologyById.get(row.role_id) ?? null : null;
    const area = row.area_id ? ontologyById.get(row.area_id) ?? null : null;
    const items = itemByPath.get(row.id) ?? [];
    const satisfiedItemCount = items.filter((item) => item.coverageStatus === 'satisfied').length;
    const missingItemCount = items.length - satisfiedItemCount;
    const linkedKnowledgeCount = items.filter((item) => item.knowledgeObject !== null).length;
    const linkedProcessCount = items.filter((item) => item.process !== null).length;
    const linkedProcessStepCount = items.filter((item) => item.processStep !== null).length;
    const relatedAssignments = assignments.filter((assignment) => assignment.trainingPathId === row.id);

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      department,
      role,
      area,
      status: row.status,
      sourceType: row.source_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
      assignments: relatedAssignments,
      progress: relatedAssignments.flatMap((assignment) => progressByAssignment.get(assignment.id) ?? []),
      coveragePercent: coveragePercent(satisfiedItemCount, items.length),
      requiredItemCount: items.length,
      satisfiedItemCount,
      missingItemCount,
      linkedKnowledgeCount,
      linkedProcessCount,
      linkedProcessStepCount,
    };
  });

  const stats: TrainingStats = {
    totalPaths: paths.length,
    totalItems: paths.reduce((sum, path) => sum + path.items.length, 0),
    pathsWithGaps: paths.filter((path) => path.missingItemCount > 0).length,
    itemsMissingCoverage: paths.reduce((sum, path) => sum + path.missingItemCount, 0),
    assignmentCount: assignments.length,
    progressCount: progress.length,
  };

  return {
    paths: paths.sort((a, b) => {
      const roleCompare = (a.role?.name ?? 'Unassigned').localeCompare(b.role?.name ?? 'Unassigned');
      return roleCompare || a.title.localeCompare(b.title);
    }),
    assignments,
    progress,
    coverage: knowledgeData.coverage.satisfied.concat(knowledgeData.coverage.missing),
    stats,
  };
}

