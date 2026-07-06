import { getKnowledgeEngineData, previewText, type KnowledgeObject, type KnowledgeOntologyEntity, type KnowledgeOntologyGroups } from './knowledge';
import { supabase, supabaseConfigError } from './supabase';

export type ProcessTriggerType = 'opening' | 'closing' | 'scheduled' | 'event' | 'manual';
export type ProcessDirection = 'input' | 'output';
export type ProcessReferenceKind =
  | 'knowledge'
  | 'checklist'
  | 'checklistItem'
  | 'equipment'
  | 'businessProcess'
  | 'department'
  | 'role'
  | 'area'
  | 'documentType'
  | 'tag';

export interface OperationsReference {
  kind: ProcessReferenceKind;
  id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  preview: string | null;
  code: string | null;
}

export interface OperationsProcessStep {
  id: string;
  sequence: number;
  title: string;
  description: string | null;
  expectedDurationMinutes: number | null;
  requiredKnowledge: OperationsReference | null;
  requiredEquipment: OperationsReference | null;
  requiredChecklistItem: OperationsReference | null;
}

export interface OperationsProcessLink {
  id: string;
  sequence: number;
  direction: ProcessDirection;
  title: string;
  description: string | null;
  notes: string | null;
  reference: OperationsReference | null;
}

export interface OperationsProcessDependency {
  id: string;
  notes: string | null;
  process: OperationsReference;
  dependsOn: OperationsReference;
}

export interface OperationsProcess {
  id: string;
  code: string;
  name: string;
  description: string | null;
  department: OperationsReference | null;
  role: OperationsReference | null;
  area: OperationsReference | null;
  frequency: string | null;
  estimatedDurationMinutes: number | null;
  priority: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  triggerType: ProcessTriggerType;
  status: string;
  createdAt: string;
  updatedAt: string;
  steps: OperationsProcessStep[];
  dependenciesIncoming: OperationsProcessDependency[];
  dependenciesOutgoing: OperationsProcessDependency[];
  inputs: OperationsProcessLink[];
  outputs: OperationsProcessLink[];
  knowledgeLinks: OperationsReference[];
  knowledgeLinkCount: number;
  stepCount: number;
  dependencyCount: number;
}

export interface OperationsStats {
  totalProcesses: number;
  criticalProcesses: number;
  processesMissingKnowledge: number;
  averageStepsPerProcess: number;
  dependencyLinks: number;
  dependencyConnectedProcesses: number;
  isolatedProcesses: number;
}

export interface OperationsEngineData {
  processes: OperationsProcess[];
  stats: OperationsStats;
  ontologyOptions: KnowledgeOntologyGroups;
}

interface ProcessRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  department_id: string | null;
  owner_role_id: string | null;
  area_id: string | null;
  frequency: string | null;
  estimated_duration_minutes: number | null;
  priority: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  trigger_type: ProcessTriggerType;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProcessStepRow {
  id: string;
  organization_id: string;
  process_id: string;
  sequence: number;
  title: string;
  description: string | null;
  expected_duration_minutes: number | null;
  required_knowledge_id: string | null;
  required_equipment_id: string | null;
  required_checklist_item_id: string | null;
}

interface ProcessDependencyRow {
  id: string;
  organization_id: string;
  process_id: string;
  depends_on_process_id: string;
  notes: string | null;
}

interface ProcessLinkRow {
  id: string;
  organization_id: string;
  process_id: string;
  sequence: number;
  title: string;
  description: string | null;
  knowledge_id: string | null;
  checklist_id: string | null;
  checklist_item_id: string | null;
  equipment_id: string | null;
  business_process_id: string | null;
  department_id: string | null;
  role_id: string | null;
  area_id: string | null;
  document_type_id: string | null;
  tag_id: string | null;
  notes: string | null;
}

interface ChecklistRow {
  id: string;
  organization_id: string;
  title: string;
  code: string;
  status: string;
}

interface ChecklistItemRow {
  id: string;
  organization_id: string;
  checklist_id: string;
  position: number;
  prompt: string;
  expected_evidence: string | null;
}

interface KnowledgeLookup {
  byId: Map<string, KnowledgeObject>;
  ontology: KnowledgeOntologyGroups;
}

function ensureSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  return supabase;
}

function toKnowledgeLookup(objects: KnowledgeObject[], ontology: KnowledgeOntologyGroups): KnowledgeLookup {
  return {
    byId: new Map(objects.map((object) => [object.id, object])),
    ontology,
  };
}

function referenceFromKnowledge(object: KnowledgeObject): OperationsReference {
  return {
    kind: 'knowledge',
    id: object.id,
    title: object.title,
    subtitle: object.manualTitle,
    status: object.status,
    preview: previewText(object.approvedVersion.body, 120),
    code: object.slug,
  };
}

function referenceFromOntology(entity: KnowledgeOntologyEntity | undefined, kind: ProcessReferenceKind): OperationsReference | null {
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

function referenceFromChecklist(checklist: ChecklistRow | undefined): OperationsReference | null {
  if (!checklist) return null;
  return {
    kind: 'checklist',
    id: checklist.id,
    title: checklist.title,
    subtitle: checklist.code,
    status: checklist.status,
    preview: null,
    code: checklist.code,
  };
}

function referenceFromChecklistItem(item: ChecklistItemRow | undefined, checklist: ChecklistRow | undefined): OperationsReference | null {
  if (!item) return null;
  return {
    kind: 'checklistItem',
    id: item.id,
    title: item.prompt,
    subtitle: checklist ? `${checklist.title} • #${item.position}` : `Item #${item.position}`,
    status: checklist?.status ?? null,
    preview: item.expected_evidence ? previewText(item.expected_evidence, 120) : null,
    code: checklist?.code ?? null,
  };
}

function referenceFromProcess(process: ProcessRow): OperationsReference {
  return {
    kind: 'businessProcess',
    id: process.id,
    title: process.name,
    subtitle: process.code,
    status: process.status,
    preview: process.description ? previewText(process.description, 120) : null,
    code: process.code,
  };
}

function buildReference(
  row: ProcessLinkRow | ProcessStepRow,
  lookups: {
    knowledge: KnowledgeLookup['byId'];
    checklists: Map<string, ChecklistRow>;
    checklistItems: Map<string, ChecklistItemRow>;
    equipment: Map<string, KnowledgeOntologyEntity>;
    businessProcesses: Map<string, KnowledgeOntologyEntity>;
    departments: Map<string, KnowledgeOntologyEntity>;
    roles: Map<string, KnowledgeOntologyEntity>;
    areas: Map<string, KnowledgeOntologyEntity>;
    documentTypes: Map<string, KnowledgeOntologyEntity>;
    tags: Map<string, KnowledgeOntologyEntity>;
  },
): OperationsReference | null {
  if ('knowledge_id' in row && row.knowledge_id) {
    const knowledge = lookups.knowledge.get(row.knowledge_id);
    if (knowledge) return referenceFromKnowledge(knowledge);
  }

  if ('checklist_id' in row && row.checklist_id) {
    const checklist = lookups.checklists.get(row.checklist_id);
    if (checklist) return referenceFromChecklist(checklist);
  }

  if ('checklist_item_id' in row && row.checklist_item_id) {
    const item = lookups.checklistItems.get(row.checklist_item_id);
    const checklist = item ? lookups.checklists.get(item.checklist_id) : undefined;
    if (item) return referenceFromChecklistItem(item, checklist);
  }

  if ('equipment_id' in row && row.equipment_id) return referenceFromOntology(lookups.equipment.get(row.equipment_id), 'equipment');
  if ('business_process_id' in row && row.business_process_id) {
    return referenceFromOntology(lookups.businessProcesses.get(row.business_process_id), 'businessProcess');
  }
  if ('department_id' in row && row.department_id) return referenceFromOntology(lookups.departments.get(row.department_id), 'department');
  if ('role_id' in row && row.role_id) return referenceFromOntology(lookups.roles.get(row.role_id), 'role');
  if ('area_id' in row && row.area_id) return referenceFromOntology(lookups.areas.get(row.area_id), 'area');
  if ('document_type_id' in row && row.document_type_id) return referenceFromOntology(lookups.documentTypes.get(row.document_type_id), 'documentType');
  if ('tag_id' in row && row.tag_id) return referenceFromOntology(lookups.tags.get(row.tag_id), 'tag');

  return null;
}

function countUniqueKnowledgeLinks(processes: OperationsProcess[]): number {
  return processes.reduce((sum, process) => sum + process.knowledgeLinks.length, 0);
}

function buildOperationsStats(processes: OperationsProcess[]): OperationsStats {
  const dependencyLinkedProcesses = processes.filter(
    (process) => process.dependenciesIncoming.length + process.dependenciesOutgoing.length > 0,
  ).length;
  const totalSteps = processes.reduce((sum, process) => sum + process.stepCount, 0);
  const missingKnowledge = processes.filter((process) => process.knowledgeLinkCount === 0).length;

  return {
    totalProcesses: processes.length,
    criticalProcesses: processes.filter((process) => process.criticality === 'critical').length,
    processesMissingKnowledge: missingKnowledge,
    averageStepsPerProcess: processes.length === 0 ? 0 : Math.round((totalSteps / processes.length) * 10) / 10,
    dependencyLinks: processes.reduce((sum, process) => sum + process.dependenciesOutgoing.length, 0),
    dependencyConnectedProcesses: dependencyLinkedProcesses,
    isolatedProcesses: processes.length - dependencyLinkedProcesses,
  };
}

function groupBy<T extends { process_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    grouped.set(row.process_id, [...(grouped.get(row.process_id) ?? []), row]);
  }
  return grouped;
}

async function selectRows<T>(
  table: string,
  columns: string,
  ids: string[],
  idColumn = 'id',
): Promise<T[]> {
  const client = ensureSupabase();
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client.from(table).select(columns).in(idColumn, uniqueIds);
  if (error) throw error;
  return (data ?? []) as T[];
}

function extractReferenceIds(processes: ProcessRow[], steps: ProcessStepRow[], inputs: ProcessLinkRow[], outputs: ProcessLinkRow[]): {
  departmentIds: string[];
  roleIds: string[];
  areaIds: string[];
  knowledgeIds: string[];
  equipmentIds: string[];
  checklistIds: string[];
  checklistItemIds: string[];
  businessProcessIds: string[];
  documentTypeIds: string[];
  tagIds: string[];
} {
  const ids = {
    departmentIds: new Set<string>(),
    roleIds: new Set<string>(),
    areaIds: new Set<string>(),
    knowledgeIds: new Set<string>(),
    equipmentIds: new Set<string>(),
    checklistIds: new Set<string>(),
    checklistItemIds: new Set<string>(),
    businessProcessIds: new Set<string>(),
    documentTypeIds: new Set<string>(),
    tagIds: new Set<string>(),
  };

  for (const process of processes) {
    if (process.department_id) ids.departmentIds.add(process.department_id);
    if (process.owner_role_id) ids.roleIds.add(process.owner_role_id);
    if (process.area_id) ids.areaIds.add(process.area_id);
  }

  const collect = (row: ProcessLinkRow | ProcessStepRow): void => {
    if ('required_knowledge_id' in row && row.required_knowledge_id) ids.knowledgeIds.add(row.required_knowledge_id);
    if ('required_equipment_id' in row && row.required_equipment_id) ids.equipmentIds.add(row.required_equipment_id);
    if ('required_checklist_item_id' in row && row.required_checklist_item_id) ids.checklistItemIds.add(row.required_checklist_item_id);
    if ('knowledge_id' in row && row.knowledge_id) ids.knowledgeIds.add(row.knowledge_id);
    if ('checklist_id' in row && row.checklist_id) ids.checklistIds.add(row.checklist_id);
    if ('checklist_item_id' in row && row.checklist_item_id) ids.checklistItemIds.add(row.checklist_item_id);
    if ('equipment_id' in row && row.equipment_id) ids.equipmentIds.add(row.equipment_id);
    if ('business_process_id' in row && row.business_process_id) ids.businessProcessIds.add(row.business_process_id);
    if ('department_id' in row && row.department_id) ids.departmentIds.add(row.department_id);
    if ('role_id' in row && row.role_id) ids.roleIds.add(row.role_id);
    if ('area_id' in row && row.area_id) ids.areaIds.add(row.area_id);
    if ('document_type_id' in row && row.document_type_id) ids.documentTypeIds.add(row.document_type_id);
    if ('tag_id' in row && row.tag_id) ids.tagIds.add(row.tag_id);
  };

  for (const row of steps) collect(row);
  for (const row of inputs) collect(row);
  for (const row of outputs) collect(row);

  return {
    departmentIds: Array.from(ids.departmentIds),
    roleIds: Array.from(ids.roleIds),
    areaIds: Array.from(ids.areaIds),
    knowledgeIds: Array.from(ids.knowledgeIds),
    equipmentIds: Array.from(ids.equipmentIds),
    checklistIds: Array.from(ids.checklistIds),
    checklistItemIds: Array.from(ids.checklistItemIds),
    businessProcessIds: Array.from(ids.businessProcessIds),
    documentTypeIds: Array.from(ids.documentTypeIds),
    tagIds: Array.from(ids.tagIds),
  };
}

export async function getOperationsEngineData(): Promise<OperationsEngineData> {
  const [knowledgeData, processResponse] = await Promise.all([
    getKnowledgeEngineData(),
    ensureSupabase()
      .from('os_processes_public')
      .select('id,organization_id,code,name,description,department_id,owner_role_id,area_id,frequency,estimated_duration_minutes,priority,criticality,trigger_type,status,created_at,updated_at')
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(1000),
  ]);

  if (processResponse.error) throw processResponse.error;

  const processRows = (processResponse.data ?? []) as ProcessRow[];
  if (processRows.length === 0) {
    return {
      processes: [],
      stats: {
        totalProcesses: 0,
        criticalProcesses: 0,
        processesMissingKnowledge: 0,
        averageStepsPerProcess: 0,
        dependencyLinks: 0,
        dependencyConnectedProcesses: 0,
        isolatedProcesses: 0,
      },
      ontologyOptions: knowledgeData.ontologyOptions,
    };
  }

  const processIds = processRows.map((row) => row.id);
  const [stepRows, dependencyRows, inputRows, outputRows] = await Promise.all([
    selectRows<ProcessStepRow>(
      'os_process_steps_public',
      'id,organization_id,process_id,sequence,title,description,expected_duration_minutes,required_knowledge_id,required_equipment_id,required_checklist_item_id',
      processIds,
      'process_id',
    ),
    selectRows<ProcessDependencyRow>(
      'os_process_dependencies_public',
      'id,organization_id,process_id,depends_on_process_id,notes',
      processIds,
      'process_id',
    ),
    selectRows<ProcessLinkRow>(
      'os_process_inputs_public',
      'id,organization_id,process_id,sequence,title,description,knowledge_id,checklist_id,checklist_item_id,equipment_id,business_process_id,department_id,role_id,area_id,document_type_id,tag_id,notes',
      processIds,
      'process_id',
    ),
    selectRows<ProcessLinkRow>(
      'os_process_outputs_public',
      'id,organization_id,process_id,sequence,title,description,knowledge_id,checklist_id,checklist_item_id,equipment_id,business_process_id,department_id,role_id,area_id,document_type_id,tag_id,notes',
      processIds,
      'process_id',
    ),
  ]);

  const referenceIds = extractReferenceIds(processRows, stepRows, inputRows, outputRows);
  const [
    checklistRows,
    checklistItemRows,
  ] = await Promise.all([
    selectRows<ChecklistRow>('os_checklists_public', 'id,organization_id,title,code,status', referenceIds.checklistIds),
    selectRows<ChecklistItemRow>('os_checklist_items_public', 'id,organization_id,checklist_id,position,prompt,expected_evidence', referenceIds.checklistItemIds),
  ]);

  const { byId: knowledgeById, ontology } = toKnowledgeLookup(knowledgeData.objects, knowledgeData.ontologyOptions);
  const checklistById = new Map(checklistRows.map((row) => [row.id, row]));
  const checklistItemById = new Map(checklistItemRows.map((row) => [row.id, row]));
  const departments = new Map(ontology.departments.map((entity) => [entity.id, entity]));
  const roles = new Map(ontology.roles.map((entity) => [entity.id, entity]));
  const areas = new Map(ontology.areas.map((entity) => [entity.id, entity]));
  const equipment = new Map(ontology.equipment.map((entity) => [entity.id, entity]));
  const businessProcesses = new Map(ontology.businessProcesses.map((entity) => [entity.id, entity]));
  const documentTypes = new Map(ontology.documentTypes.map((entity) => [entity.id, entity]));
  const tags = new Map(ontology.tags.map((entity) => [entity.id, entity]));
  const processById = new Map(processRows.map((row) => [row.id, row]));

  const stepByProcess = groupBy(stepRows);
  const inputByProcess = groupBy(inputRows);
  const outputByProcess = groupBy(outputRows);
  const outgoingByProcess = new Map<string, ProcessDependencyRow[]>();
  const incomingByProcess = new Map<string, ProcessDependencyRow[]>();
  for (const dependency of dependencyRows) {
    outgoingByProcess.set(dependency.process_id, [...(outgoingByProcess.get(dependency.process_id) ?? []), dependency]);
    incomingByProcess.set(dependency.depends_on_process_id, [...(incomingByProcess.get(dependency.depends_on_process_id) ?? []), dependency]);
  }

  const processes: OperationsProcess[] = processRows.map((row) => {
    const department = row.department_id ? referenceFromOntology(departments.get(row.department_id), 'department') : null;
    const role = row.owner_role_id ? referenceFromOntology(roles.get(row.owner_role_id), 'role') : null;
    const area = row.area_id ? referenceFromOntology(areas.get(row.area_id), 'area') : null;

    const steps = (stepByProcess.get(row.id) ?? [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((step) => ({
        id: step.id,
        sequence: step.sequence,
        title: step.title,
        description: step.description,
        expectedDurationMinutes: step.expected_duration_minutes,
        requiredKnowledge: step.required_knowledge_id && knowledgeById.get(step.required_knowledge_id)
          ? referenceFromKnowledge(knowledgeById.get(step.required_knowledge_id)!)
          : null,
        requiredEquipment: step.required_equipment_id ? referenceFromOntology(equipment.get(step.required_equipment_id), 'equipment') : null,
        requiredChecklistItem: step.required_checklist_item_id
          ? referenceFromChecklistItem(
              checklistItemById.get(step.required_checklist_item_id),
              checklistItemById.get(step.required_checklist_item_id)
                ? checklistById.get(checklistItemById.get(step.required_checklist_item_id)!.checklist_id)
                : undefined,
            )
          : null,
      }));

    const inputs = (inputByProcess.get(row.id) ?? [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((link) => ({
        id: link.id,
        sequence: link.sequence,
        direction: 'input' as const,
        title: link.title,
        description: link.description,
        notes: link.notes,
        reference: buildReference(link, {
          knowledge: knowledgeById,
          checklists: checklistById,
          checklistItems: checklistItemById,
          equipment,
          businessProcesses,
          departments,
          roles,
          areas,
          documentTypes,
          tags,
        }),
      }));

    const outputs = (outputByProcess.get(row.id) ?? [])
      .sort((a, b) => a.sequence - b.sequence)
      .map((link) => ({
        id: link.id,
        sequence: link.sequence,
        direction: 'output' as const,
        title: link.title,
        description: link.description,
        notes: link.notes,
        reference: buildReference(link, {
          knowledge: knowledgeById,
          checklists: checklistById,
          checklistItems: checklistItemById,
          equipment,
          businessProcesses,
          departments,
          roles,
          areas,
          documentTypes,
          tags,
        }),
      }));

    const dependencyOutgoing = (outgoingByProcess.get(row.id) ?? []).map((dependency) => {
      const process = processById.get(dependency.process_id);
      const dependsOn = processById.get(dependency.depends_on_process_id);
      return process && dependsOn
        ? {
            id: dependency.id,
            notes: dependency.notes,
            process: referenceFromProcess(process),
            dependsOn: referenceFromProcess(dependsOn),
          }
        : null;
    }).filter((item): item is OperationsProcessDependency => item !== null);

    const dependencyIncoming = (incomingByProcess.get(row.id) ?? []).map((dependency) => {
      const process = processById.get(dependency.process_id);
      const dependsOn = processById.get(dependency.depends_on_process_id);
      return process && dependsOn
        ? {
            id: dependency.id,
            notes: dependency.notes,
            process: referenceFromProcess(process),
            dependsOn: referenceFromProcess(dependsOn),
          }
        : null;
    }).filter((item): item is OperationsProcessDependency => item !== null);

    const knowledgeReferences = [
      ...steps.map((step) => step.requiredKnowledge).filter((item): item is OperationsReference => Boolean(item)),
      ...inputs
        .map((link) => (link.reference && link.reference.kind === 'knowledge' ? link.reference : null))
        .filter((item): item is OperationsReference => item !== null),
      ...outputs
        .map((link) => (link.reference && link.reference.kind === 'knowledge' ? link.reference : null))
        .filter((item): item is OperationsReference => item !== null),
    ];
    const knowledgeLinks = Array.from(new Map(knowledgeReferences.map((reference) => [reference.id, reference])).values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      department,
      role,
      area,
      frequency: row.frequency,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      priority: row.priority,
      criticality: row.criticality,
      triggerType: row.trigger_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      steps,
      dependenciesIncoming: dependencyIncoming,
      dependenciesOutgoing: dependencyOutgoing,
      inputs,
      outputs,
      knowledgeLinks,
      knowledgeLinkCount: knowledgeLinks.length,
      stepCount: steps.length,
      dependencyCount: dependencyIncoming.length + dependencyOutgoing.length,
    };
  });

  return {
    processes,
    stats: buildOperationsStats(processes),
    ontologyOptions: ontology,
  };
}

export function operationsPreview(text: string | null | undefined, maxLength = 220): string {
  if (!text) return '';
  return previewText(text, maxLength);
}
