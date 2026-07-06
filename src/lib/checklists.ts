import { getKnowledgeEngineData, previewText, type KnowledgeObject, type KnowledgeOntologyEntity, type RequiredKnowledgeItem } from './knowledge';
import { getOperationsEngineData, type OperationsProcess, type OperationsProcessStep, type OperationsReference } from './operations';
import { supabase, supabaseConfigError } from './supabase';

export type ChecklistTemplateStatus = 'draft' | 'active' | 'archived';
export type ChecklistRunStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ChecklistRunItemStatus = 'pass' | 'fail' | 'not_applicable' | 'blocked';

export interface ChecklistTemplateItem {
  id: string;
  checklistTemplateId: string;
  processStepId: string | null;
  requiredKnowledgeItemId: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  evidenceRequired: boolean;
  completionRequired: boolean;
  processStep: OperationsProcessStep | null;
  requiredKnowledgeItem: RequiredKnowledgeItem | null;
  matchedKnowledge: KnowledgeObject[];
  coverageStatus: 'missing' | 'satisfied';
  gapSummary: string | null;
}

export interface ChecklistRunItem {
  id: string;
  checklistRunId: string;
  checklistTemplateItemId: string;
  status: ChecklistRunItemStatus;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  evidenceUrl: string | null;
  templateItem: ChecklistTemplateItem | null;
}

export interface ChecklistRun {
  id: string;
  checklistTemplateId: string | null;
  businessDate: string | null;
  assignedRoleId: string | null;
  assignedUserId: string | null;
  status: ChecklistRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  templateTitle: string | null;
  templateCode: string | null;
  itemCount: number;
  completedCount: number;
  items: ChecklistRunItem[];
}

export interface ChecklistTemplate {
  id: string;
  code: string;
  title: string;
  description: string | null;
  department: OperationsReference | null;
  role: OperationsReference | null;
  area: OperationsReference | null;
  process: OperationsProcess | null;
  frequency: string | null;
  status: ChecklistTemplateStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  linkedKnowledgeCount: number;
  missingKnowledgeCount: number;
  runCount: number;
  openRunCount: number;
  latestRunAt: string | null;
  coveragePercent: number;
  items: ChecklistTemplateItem[];
  runs: ChecklistRun[];
}

export interface ChecklistStats {
  totalTemplates: number;
  totalItems: number;
  templatesWithGaps: number;
  itemsMissingCoverage: number;
  runCount: number;
  openRunCount: number;
}

export interface ChecklistEngineData {
  templates: ChecklistTemplate[];
  runs: ChecklistRun[];
  stats: ChecklistStats;
}

interface ChecklistTemplateRow {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  department_id: string | null;
  role_id: string | null;
  area_id: string | null;
  process_id: string | null;
  frequency: string | null;
  status: ChecklistTemplateStatus;
  created_at: string;
  updated_at: string;
  process_code: string | null;
  process_name: string | null;
  item_count: number;
  linked_knowledge_count: number;
  missing_knowledge_count: number;
  run_count: number;
  latest_run_at: string | null;
  open_run_count: number;
}

interface ChecklistTemplateItemRow {
  id: string;
  organization_id: string;
  checklist_template_id: string;
  process_step_id: string | null;
  required_knowledge_item_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  evidence_required: boolean;
  completion_required: boolean;
  created_at: string;
  updated_at: string;
  process_step_sequence: number | null;
  process_step_title: string | null;
  process_step_description: string | null;
  required_knowledge_code: string | null;
  required_knowledge_title: string | null;
}

interface ChecklistRunRow {
  id: string;
  organization_id: string;
  checklist_id: string | null;
  checklist_template_id: string | null;
  business_date: string | null;
  assigned_role_id: string | null;
  assigned_user_id: string | null;
  location_id: string | null;
  station_id: string | null;
  audit_id: string | null;
  performed_by: string | null;
  status: ChecklistRunStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  checklist_template_code: string | null;
  checklist_template_title: string | null;
  item_count: number;
  completed_count: number;
}

interface ChecklistRunItemRow {
  id: string;
  organization_id: string;
  checklist_run_id: string;
  checklist_template_item_id: string;
  status: ChecklistRunItemStatus;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
  checklist_template_item_title: string | null;
  checklist_template_item_sort_order: number | null;
  process_step_id: string | null;
  required_knowledge_item_id: string | null;
}

interface ChecklistLookups {
  byKnowledgeId: Map<string, KnowledgeObject>;
  requiredKnowledgeById: Map<string, RequiredKnowledgeItem>;
  coverageByRequiredId: Map<string, ChecklistCoverageLookup>;
  processById: Map<string, OperationsProcess>;
  stepById: Map<string, OperationsProcessStep>;
  ontologyById: Map<string, KnowledgeOntologyEntity>;
}

interface ChecklistCoverageLookup {
  item: RequiredKnowledgeItem;
  matchedObjects: KnowledgeObject[];
}

function ensureSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  return supabase;
}

function isMissingChecklistTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === '42501' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') === true ||
    error.message?.toLowerCase().includes('permission denied') === true
  );
}

async function selectRows<T>(table: string, columns: string, orderColumn = 'created_at'): Promise<T[]> {
  const client = ensureSupabase();
  const query = client.from(table).select(columns);
  const ordered = orderColumn ? query.order(orderColumn, { ascending: true }) : query;
  const { data, error } = await ordered;
  if (error) {
    if (isMissingChecklistTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as T[];
}

function buildCoverageLookup(coverage: Awaited<ReturnType<typeof getKnowledgeEngineData>>['coverage']): Map<string, ChecklistCoverageLookup> {
  const map = new Map<string, ChecklistCoverageLookup>();
  for (const result of [...coverage.missing, ...coverage.satisfied]) {
    map.set(result.item.id, { item: result.item, matchedObjects: result.matchedObjects });
  }
  return map;
}

function referenceFromOntology(entity: KnowledgeOntologyEntity | undefined, kind: OperationsReference['kind']): OperationsReference | null {
  if (!entity) return null;
  return {
    kind,
    id: entity.id,
    title: entity.name,
    subtitle: entity.description ?? null,
    status: entity.status,
    preview: entity.description ? previewText(entity.description, 120) : null,
    code: entity.code,
  };
}

function coveragePercent(existing: number, required: number): number {
  return required === 0 ? 0 : Math.round((existing / required) * 100);
}

function buildLookups(knowledge: Awaited<ReturnType<typeof getKnowledgeEngineData>>, operations: Awaited<ReturnType<typeof getOperationsEngineData>>): ChecklistLookups {
  const byKnowledgeId = new Map(knowledge.objects.map((object) => [object.id, object] as const));
  const requiredKnowledgeById = new Map(knowledge.requiredKnowledgeItems.map((item) => [item.id, item] as const));
  const coverageByRequiredId = buildCoverageLookup(knowledge.coverage);
  const processById = new Map(operations.processes.map((process) => [process.id, process] as const));
  const stepById = new Map<string, OperationsProcessStep>();

  for (const process of operations.processes) {
    for (const step of process.steps) {
      stepById.set(step.id, step);
    }
  }

  const ontologyById = new Map<string, KnowledgeOntologyEntity>();
  for (const entity of [
    ...operations.catalog.ontologyOptions.departments,
    ...operations.catalog.ontologyOptions.roles,
    ...operations.catalog.ontologyOptions.areas,
    ...operations.catalog.ontologyOptions.equipment,
    ...operations.catalog.ontologyOptions.businessProcesses,
    ...operations.catalog.ontologyOptions.documentTypes,
    ...operations.catalog.ontologyOptions.tags,
  ]) {
    ontologyById.set(entity.id, entity);
  }

  return { byKnowledgeId, requiredKnowledgeById, coverageByRequiredId, processById, stepById, ontologyById };
}

function buildTemplateItems(rows: ChecklistTemplateItemRow[], lookups: ChecklistLookups): Map<string, ChecklistTemplateItem[]> {
  const byTemplate = new Map<string, ChecklistTemplateItem[]>();

  for (const row of rows) {
    const processStep = row.process_step_id ? lookups.stepById.get(row.process_step_id) ?? null : null;
    const requiredKnowledgeItem = row.required_knowledge_item_id ? lookups.requiredKnowledgeById.get(row.required_knowledge_item_id) ?? null : null;
    const coverage = requiredKnowledgeItem ? lookups.coverageByRequiredId.get(requiredKnowledgeItem.id) : undefined;
    const matchedKnowledge = coverage?.matchedObjects ?? [];
    const coverageStatus = matchedKnowledge.length > 0 ? 'satisfied' : 'missing';
    const gapSummary =
      coverageStatus === 'missing'
        ? requiredKnowledgeItem
          ? `No approved knowledge object currently satisfies ${requiredKnowledgeItem.title}.`
          : 'No required knowledge has been linked yet for this checklist step.'
        : null;

    const item: ChecklistTemplateItem = {
      id: row.id,
      checklistTemplateId: row.checklist_template_id,
      processStepId: row.process_step_id,
      requiredKnowledgeItemId: row.required_knowledge_item_id,
      title: row.title,
      description: row.description,
      sortOrder: row.sort_order,
      evidenceRequired: row.evidence_required,
      completionRequired: row.completion_required,
      processStep,
      requiredKnowledgeItem,
      matchedKnowledge,
      coverageStatus,
      gapSummary,
    };

    byTemplate.set(row.checklist_template_id, [...(byTemplate.get(row.checklist_template_id) ?? []), item]);
  }

  for (const items of byTemplate.values()) {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return byTemplate;
}

function buildRunItems(rows: ChecklistRunItemRow[], templateItems: Map<string, ChecklistTemplateItem[]>): Map<string, ChecklistRunItem[]> {
  const byRun = new Map<string, ChecklistRunItem[]>();
  const templateItemById = new Map<string, ChecklistTemplateItem>();

  for (const items of templateItems.values()) {
    for (const item of items) {
      templateItemById.set(item.id, item);
    }
  }

  for (const row of rows) {
    const item = templateItemById.get(row.checklist_template_item_id) ?? null;
    const nextItem: ChecklistRunItem = {
      id: row.id,
      checklistRunId: row.checklist_run_id,
      checklistTemplateItemId: row.checklist_template_item_id,
      status: row.status,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      notes: row.notes,
      evidenceUrl: row.evidence_url,
      templateItem: item,
    };

    byRun.set(row.checklist_run_id, [...(byRun.get(row.checklist_run_id) ?? []), nextItem]);
  }

  return byRun;
}

export async function getChecklistEngineData(): Promise<ChecklistEngineData> {
  const [knowledge, operations, templateRows, templateItemRows, runRows, runItemRows] = await Promise.all([
    getKnowledgeEngineData(),
    getOperationsEngineData(),
    selectRows<ChecklistTemplateRow>(
      'os_checklist_templates_public',
      'id,organization_id,code,title,description,department_id,role_id,area_id,process_id,frequency,status,created_at,updated_at,process_code,process_name,item_count,linked_knowledge_count,missing_knowledge_count,run_count,latest_run_at,open_run_count',
    ),
    selectRows<ChecklistTemplateItemRow>(
      'os_checklist_template_items_public',
      'id,organization_id,checklist_template_id,process_step_id,required_knowledge_item_id,title,description,sort_order,evidence_required,completion_required,created_at,updated_at,process_step_sequence,process_step_title,process_step_description,required_knowledge_code,required_knowledge_title',
    ),
    selectRows<ChecklistRunRow>(
      'os_checklist_runs_public',
      'id,organization_id,checklist_id,checklist_template_id,business_date,assigned_role_id,assigned_user_id,location_id,station_id,audit_id,performed_by,status,started_at,completed_at,created_at,updated_at,checklist_template_code,checklist_template_title,item_count,completed_count',
    ),
    selectRows<ChecklistRunItemRow>(
      'os_checklist_run_items_public',
      'id,organization_id,checklist_run_id,checklist_template_item_id,status,completed_at,completed_by,notes,evidence_url,created_at,updated_at,checklist_template_item_title,checklist_template_item_sort_order,process_step_id,required_knowledge_item_id',
    ),
  ]);

  const lookups = buildLookups(knowledge, operations);
  const templateItems = buildTemplateItems(templateItemRows, lookups);
  const runItems = buildRunItems(runItemRows, templateItems);

  const templates = templateRows
    .map<ChecklistTemplate>((row) => {
      const process = row.process_id ? lookups.processById.get(row.process_id) ?? null : null;
      const department = process?.department ?? referenceFromOntology(row.department_id ? lookups.ontologyById.get(row.department_id) : undefined, 'department');
      const role = process?.role ?? referenceFromOntology(row.role_id ? lookups.ontologyById.get(row.role_id) : undefined, 'role');
      const area = process?.area ?? referenceFromOntology(row.area_id ? lookups.ontologyById.get(row.area_id) : undefined, 'area');
      const items = templateItems.get(row.id) ?? [];
      const runs = (runRows.filter((run) => run.checklist_template_id === row.id) ?? []).map<ChecklistRun>((run) => ({
        id: run.id,
        checklistTemplateId: run.checklist_template_id,
        businessDate: run.business_date,
        assignedRoleId: run.assigned_role_id,
        assignedUserId: run.assigned_user_id,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        templateTitle: run.checklist_template_title,
        templateCode: run.checklist_template_code,
        itemCount: run.item_count,
        completedCount: run.completed_count,
        items: runItems.get(run.id) ?? [],
      }));

      const itemCount = row.item_count ?? items.length;
      const missingKnowledgeCount = row.missing_knowledge_count ?? items.filter((item) => item.coverageStatus === 'missing').length;
      const linkedKnowledgeCount = row.linked_knowledge_count ?? items.filter((item) => item.coverageStatus === 'satisfied').length;
      const runCount = row.run_count ?? runs.length;
      const openRunCount = row.open_run_count ?? runs.filter((run) => run.status === 'scheduled' || run.status === 'in_progress').length;
      const latestRunAt = row.latest_run_at ?? runs.reduce<string | null>((latest, run) => {
        if (!run.createdAt) return latest;
        if (!latest) return run.createdAt;
        return new Date(run.createdAt).getTime() > new Date(latest).getTime() ? run.createdAt : latest;
      }, null);

      return {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        department,
        role,
        area,
        process,
        frequency: row.frequency,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        itemCount,
        linkedKnowledgeCount,
        missingKnowledgeCount,
        runCount,
        openRunCount,
        latestRunAt,
        coveragePercent: coveragePercent(itemCount - missingKnowledgeCount, itemCount),
        items,
        runs,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const allRuns = templates.flatMap((template) => template.runs);
  const stats: ChecklistStats = {
    totalTemplates: templates.length,
    totalItems: templates.reduce((sum, template) => sum + template.itemCount, 0),
    templatesWithGaps: templates.filter((template) => template.missingKnowledgeCount > 0).length,
    itemsMissingCoverage: templates.reduce((sum, template) => sum + template.missingKnowledgeCount, 0),
    runCount: allRuns.length,
    openRunCount: allRuns.filter((run) => run.status === 'scheduled' || run.status === 'in_progress').length,
  };

  return {
    templates,
    runs: allRuns,
    stats,
  };
}
