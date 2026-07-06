import { getChecklistEngineData, type ChecklistTemplate, type ChecklistTemplateItem } from './checklists';
import { getKnowledgeEngineData, previewText, type KnowledgeObject, type RequiredKnowledgeItem } from './knowledge';
import { supabase, supabaseConfigError } from './supabase';

export type AuditTemplateStatus = 'draft' | 'active' | 'archived';
export type AuditRunStatus = 'planned' | 'in_progress' | 'passed' | 'failed' | 'cancelled';
export type AuditRunItemStatus = 'pass' | 'fail' | 'not_applicable' | 'blocked';

export interface AuditReference {
  id: string;
  title: string;
  subtitle: string | null;
  code: string | null;
  status: string | null;
  preview: string | null;
}

export interface AuditTemplateItem {
  id: string;
  auditTemplateId: string;
  checklistTemplateItemId: string | null;
  processStepId: string | null;
  requiredKnowledgeItemId: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  evidenceRequired: boolean;
  scoringType: string;
  maxScore: number | null;
  weight: number | null;
  checklistTemplateItem: ChecklistTemplateItem | null;
  requiredKnowledgeItem: RequiredKnowledgeItem | null;
  matchedKnowledge: KnowledgeObject[];
  coverageStatus: 'missing' | 'satisfied';
  gapSummary: string | null;
}

export interface AuditRunItem {
  id: string;
  auditRunId: string;
  auditTemplateItemId: string;
  status: AuditRunItemStatus;
  score: number | null;
  notes: string | null;
  evidenceUrl: string | null;
  completedAt: string | null;
  templateItem: AuditTemplateItem | null;
}

export interface AuditRun {
  id: string;
  auditTemplateId: string;
  businessDate: string;
  locationId: string | null;
  status: AuditRunStatus;
  auditorUserId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalScore: number | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  completedCount: number;
  templateTitle: string | null;
  templateCode: string | null;
  items: AuditRunItem[];
}

export interface AuditTemplate {
  id: string;
  code: string;
  title: string;
  description: string | null;
  auditType: string;
  status: AuditTemplateStatus;
  createdAt: string;
  updatedAt: string;
  checklistTemplateId: string | null;
  processId: string | null;
  departmentId: string | null;
  roleId: string | null;
  areaId: string | null;
  checklistTemplate: ChecklistTemplate | null;
  itemCount: number;
  linkedKnowledgeCount: number;
  missingKnowledgeCount: number;
  coveragePercent: number;
  runCount: number;
  openRunCount: number;
  latestRunAt: string | null;
  items: AuditTemplateItem[];
  runs: AuditRun[];
}

export interface AuditStats {
  totalTemplates: number;
  totalItems: number;
  templatesWithGaps: number;
  itemsMissingCoverage: number;
  runCount: number;
  openRunCount: number;
  completedRunCount: number;
}

export interface AuditEngineData {
  templates: AuditTemplate[];
  runs: AuditRun[];
  stats: AuditStats;
}

export interface AuditRunCreationResult {
  run: AuditRun;
  created: boolean;
}

interface AuditTemplateRow {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  department_id: string | null;
  role_id: string | null;
  area_id: string | null;
  process_id: string | null;
  checklist_template_id: string | null;
  audit_type: string;
  status: AuditTemplateStatus;
  created_at: string;
  updated_at: string;
  item_count: number;
  linked_knowledge_count: number;
  missing_knowledge_count: number;
  run_count: number;
  latest_run_at: string | null;
  open_run_count: number;
}

interface AuditTemplateItemRow {
  id: string;
  organization_id: string;
  audit_template_id: string;
  checklist_template_item_id: string | null;
  process_step_id: string | null;
  required_knowledge_item_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  evidence_required: boolean;
  scoring_type: string;
  max_score: number | null;
  weight: number | null;
}

interface AuditRunRow {
  id: string;
  organization_id: string;
  audit_template_id: string;
  business_date: string;
  location_id: string | null;
  status: AuditRunStatus;
  auditor_user_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  completed_count: number;
}

interface AuditRunItemRow {
  id: string;
  organization_id: string;
  audit_run_id: string;
  audit_template_item_id: string;
  status: AuditRunItemStatus;
  score: number | null;
  notes: string | null;
  evidence_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  audit_template_item_title: string | null;
  audit_template_item_sort_order: number | null;
  checklist_template_item_id: string | null;
  process_step_id: string | null;
  required_knowledge_item_id: string | null;
}

interface ChecklistLookups {
  checklistTemplateById: Map<string, ChecklistTemplate>;
  checklistItemById: Map<string, ChecklistTemplateItem>;
  requiredKnowledgeById: Map<string, RequiredKnowledgeItem>;
  coverageByRequiredId: Map<string, { item: RequiredKnowledgeItem; matchedObjects: KnowledgeObject[] }>;
}

function ensureSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  return supabase;
}

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isMissingAuditTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === '42501' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') === true ||
    error.message?.toLowerCase().includes('permission denied') === true
  );
}

async function selectRows<T>(table: string, columns: string, orderColumn = 'created_at', ascending = true): Promise<T[]> {
  const client = ensureSupabase();
  const query = client.from(table).select(columns);
  const ordered = orderColumn ? query.order(orderColumn, { ascending }) : query;
  const { data, error } = await ordered;
  if (error) {
    if (isMissingAuditTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as T[];
}

interface AuditRunCreationResponse {
  run: AuditRunCreationRow;
  created: boolean;
}

interface AuditRunCreationRow {
  id: string;
  auditTemplateId: string;
  auditTemplateTitle: string;
  auditTemplateCode: string;
  businessDate: string;
  status: AuditRunStatus;
  itemCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

function buildChecklistLookups(data: Awaited<ReturnType<typeof getChecklistEngineData>>, knowledge: Awaited<ReturnType<typeof getKnowledgeEngineData>>): ChecklistLookups {
  const checklistTemplateById = new Map<string, ChecklistTemplate>();
  const checklistItemById = new Map<string, ChecklistTemplateItem>();

  for (const template of data.templates) {
    checklistTemplateById.set(template.id, template);
    for (const item of template.items) {
      checklistItemById.set(item.id, item);
    }
  }

  const requiredKnowledgeById = new Map(knowledge.requiredKnowledgeItems.map((item) => [item.id, item] as const));
  const coverageByRequiredId = new Map<string, { item: RequiredKnowledgeItem; matchedObjects: KnowledgeObject[] }>();
  for (const result of [...knowledge.coverage.missing, ...knowledge.coverage.satisfied]) {
    coverageByRequiredId.set(result.item.id, { item: result.item, matchedObjects: result.matchedObjects });
  }

  return {
    checklistTemplateById,
    checklistItemById,
    requiredKnowledgeById,
    coverageByRequiredId,
  };
}

function referenceFromChecklist(template: ChecklistTemplate | null): AuditReference | null {
  if (!template) return null;
  return {
    id: template.id,
    title: template.title,
    subtitle: template.description ?? null,
    code: template.code,
    status: template.status,
    preview: template.process?.name ?? template.description ?? null,
  };
}

function coveragePercent(linkedKnowledgeCount: number, itemCount: number): number {
  if (itemCount === 0) return 0;
  return Math.round((linkedKnowledgeCount / itemCount) * 100);
}

export async function getAuditEngineData(): Promise<AuditEngineData> {
  const [knowledgeData, checklistData, templateRows, itemRows, runRows, runItemRows] = await Promise.all([
    getKnowledgeEngineData(),
    getChecklistEngineData(),
    selectRows<AuditTemplateRow>(
      'os_audit_templates_public',
      'id,organization_id,code,title,description,department_id,role_id,area_id,process_id,checklist_template_id,audit_type,status,created_at,updated_at,item_count,linked_knowledge_count,missing_knowledge_count,run_count,latest_run_at,open_run_count',
    ),
    selectRows<AuditTemplateItemRow>(
      'os_audit_template_items_public',
      'id,organization_id,audit_template_id,checklist_template_item_id,process_step_id,required_knowledge_item_id,title,description,sort_order,evidence_required,scoring_type,max_score,weight',
      'sort_order',
    ),
    selectRows<AuditRunRow>(
      'os_audit_runs_public',
      'id,organization_id,audit_template_id,business_date,location_id,status,auditor_user_id,started_at,completed_at,total_score,created_at,updated_at,item_count,completed_count',
      'created_at',
      false,
    ),
    selectRows<AuditRunItemRow>(
      'os_audit_run_items_public',
      'id,organization_id,audit_run_id,audit_template_item_id,status,score,notes,evidence_url,completed_at,created_at,updated_at,audit_template_item_title,audit_template_item_sort_order,checklist_template_item_id,process_step_id,required_knowledge_item_id',
      'created_at',
    ),
  ]);

  const lookups = buildChecklistLookups(checklistData, knowledgeData);

  const templateItemsByTemplateId = new Map<string, AuditTemplateItemRow[]>();
  for (const row of itemRows) {
    templateItemsByTemplateId.set(row.audit_template_id, [...(templateItemsByTemplateId.get(row.audit_template_id) ?? []), row]);
  }

  const runItemsByRunId = new Map<string, AuditRunItemRow[]>();
  for (const row of runItemRows) {
    runItemsByRunId.set(row.audit_run_id, [...(runItemsByRunId.get(row.audit_run_id) ?? []), row]);
  }

  const templates: AuditTemplate[] = templateRows.map((row) => {
    const checklistTemplate = row.checklist_template_id ? lookups.checklistTemplateById.get(row.checklist_template_id) ?? null : null;
    const rowItems = [...(templateItemsByTemplateId.get(row.id) ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const mappedItems: AuditTemplateItem[] = rowItems.map((itemRow) => {
      const checklistTemplateItem = itemRow.checklist_template_item_id ? lookups.checklistItemById.get(itemRow.checklist_template_item_id) ?? null : null;
      const requiredKnowledgeItem = itemRow.required_knowledge_item_id ? lookups.requiredKnowledgeById.get(itemRow.required_knowledge_item_id) ?? null : null;
      const coverage = requiredKnowledgeItem ? lookups.coverageByRequiredId.get(requiredKnowledgeItem.id) : null;
      const matchedKnowledge = coverage?.matchedObjects ?? checklistTemplateItem?.matchedKnowledge ?? [];
      const coverageStatus: AuditTemplateItem['coverageStatus'] = matchedKnowledge.length > 0 ? 'satisfied' : 'missing';

      return {
        id: itemRow.id,
        auditTemplateId: itemRow.audit_template_id,
        checklistTemplateItemId: itemRow.checklist_template_item_id,
        processStepId: itemRow.process_step_id,
        requiredKnowledgeItemId: itemRow.required_knowledge_item_id,
        title: itemRow.title,
        description: itemRow.description,
        sortOrder: itemRow.sort_order,
        evidenceRequired: itemRow.evidence_required,
        scoringType: itemRow.scoring_type,
        maxScore: itemRow.max_score,
        weight: itemRow.weight,
        checklistTemplateItem,
        requiredKnowledgeItem,
        matchedKnowledge,
        coverageStatus,
        gapSummary:
          coverageStatus === 'missing'
            ? requiredKnowledgeItem
              ? `No approved knowledge currently satisfies ${requiredKnowledgeItem.title}.`
              : 'No required knowledge is linked to this audit item yet.'
            : null,
      };
    });

    const coveredItems = mappedItems.filter((item) => item.coverageStatus === 'satisfied').length;
    const uncoveredItems = mappedItems.filter((item) => item.coverageStatus === 'missing').length;

    const rowRuns = [...(runRows.filter((run) => run.audit_template_id === row.id) ?? [])].sort((a, b) => {
      if (a.created_at === b.created_at) return a.id.localeCompare(b.id);
      return a.created_at < b.created_at ? 1 : -1;
    });

    const mappedRuns: AuditRun[] = rowRuns.map((runRow) => {
      const relatedItems = [...(runItemsByRunId.get(runRow.id) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const mappedRunItems: AuditRunItem[] = relatedItems.map((itemRow) => {
        const templateItem = mappedItems.find((candidate) => candidate.id === itemRow.audit_template_item_id) ?? null;
        return {
          id: itemRow.id,
          auditRunId: itemRow.audit_run_id,
          auditTemplateItemId: itemRow.audit_template_item_id,
          status: itemRow.status,
          score: itemRow.score,
          notes: itemRow.notes,
          evidenceUrl: itemRow.evidence_url,
          completedAt: itemRow.completed_at,
          templateItem,
        };
      });

      return {
        id: runRow.id,
        auditTemplateId: runRow.audit_template_id,
        businessDate: runRow.business_date,
        locationId: runRow.location_id,
        status: runRow.status,
        auditorUserId: runRow.auditor_user_id,
        startedAt: runRow.started_at,
        completedAt: runRow.completed_at,
        totalScore: runRow.total_score,
        createdAt: runRow.created_at,
        updatedAt: runRow.updated_at,
        itemCount: runRow.item_count,
        completedCount: runRow.completed_count,
        templateTitle: checklistTemplate?.title ?? null,
        templateCode: checklistTemplate?.code ?? null,
        items: mappedRunItems,
      };
    });

    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      auditType: row.audit_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      checklistTemplateId: row.checklist_template_id,
      processId: row.process_id,
      departmentId: row.department_id,
      roleId: row.role_id,
      areaId: row.area_id,
      checklistTemplate,
      itemCount: mappedItems.length || row.item_count,
      linkedKnowledgeCount: coveredItems,
      missingKnowledgeCount: uncoveredItems,
      coveragePercent: coveragePercent(coveredItems, mappedItems.length || row.item_count),
      runCount: row.run_count,
      openRunCount: row.open_run_count,
      latestRunAt: row.latest_run_at,
      items: mappedItems,
      runs: mappedRuns,
    };
  });

  const runs = templates.flatMap((template) => template.runs);
  const stats: AuditStats = {
    totalTemplates: templates.length,
    totalItems: templates.reduce((sum, template) => sum + template.itemCount, 0),
    templatesWithGaps: templates.filter((template) => template.missingKnowledgeCount > 0).length,
    itemsMissingCoverage: templates.reduce((sum, template) => sum + template.items.filter((item) => item.coverageStatus === 'missing').length, 0),
    runCount: runs.length,
    openRunCount: runs.filter((run) => run.status === 'planned' || run.status === 'in_progress').length,
    completedRunCount: runs.filter((run) => run.completedAt !== null).length,
  };

  return { templates, runs, stats };
}

export function auditPreview(value: string, maxLength = 180): string {
  return previewText(value, maxLength);
}

export async function loadAuditRuns(): Promise<AuditRun[]> {
  return (await getAuditEngineData()).runs;
}

export async function createAuditRunFromTemplate(
  auditTemplateId: string,
  businessDate = todayBusinessDate(),
): Promise<AuditRunCreationResult> {
  const response = await fetch('/api/audits/runs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ auditTemplateId, businessDate }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Audit run creation failed.');
  }

  const payload = (await response.json()) as { run?: AuditRunCreationRow; created?: boolean };
  if (!payload.run) throw new Error('Audit run creation did not return a run.');
  const row = payload.run;

  const runs = await loadAuditRuns();
  const run =
    runs.find((item) => item.id === row.id) ??
    ({
      id: row.id,
      auditTemplateId: row.auditTemplateId,
      businessDate: row.businessDate,
      locationId: null,
      status: row.status,
      auditorUserId: null,
      startedAt: null,
      completedAt: null,
      totalScore: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      itemCount: row.itemCount,
      completedCount: row.completedCount,
      templateTitle: row.auditTemplateTitle,
      templateCode: row.auditTemplateCode,
      items: [],
    } as AuditRun);

  return { run, created: payload.created ?? false };
}
