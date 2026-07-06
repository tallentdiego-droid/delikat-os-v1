import { supabase, supabaseConfigError } from './supabase';

export type ManualCode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9';
export type ManualFilter = ManualCode | 'all';
export type RelationshipKind =
  | 'supports'
  | 'depends_on'
  | 'references'
  | 'supersedes'
  | 'duplicates'
  | 'requires'
  | 'generated_from';
export type OntologyKind =
  | 'department'
  | 'role'
  | 'area'
  | 'equipment'
  | 'businessProcess'
  | 'documentType'
  | 'tag';

export interface KnowledgeStats {
  manuals: number;
  sourceSections: number;
  canonicalKnowledge: number;
}

export interface KnowledgeManual {
  id: string;
  title: string;
  manualCode: ManualCode | null;
  sourceUri: string;
  contentHash: string;
  capturedAt: string;
  category: string;
  sections: KnowledgeSection[];
}

export interface KnowledgeSection {
  id: string;
  manualId: string;
  heading: string;
  body: string;
  contentHash: string;
  knowledgeIds: string[];
}

export interface KnowledgeEvidence {
  id: string;
  sourceSectionId: string;
  sourceSectionHeading: string;
  sourceSectionBody: string;
  sourceSectionHash: string;
  sourceManualId: string;
  sourceManualTitle: string;
  sourceFileUri: string;
  manualCode: ManualCode | null;
}

export interface KnowledgeVersion {
  id: string;
  knowledgeId: string;
  versionNumber: number;
  body: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeObject {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  category: string;
  manualCode: ManualCode | null;
  manualTitle: string;
  sourceFileUri: string;
  sourceSectionHeading: string;
  currentApprovedVersionId: string;
  approvedVersion: KnowledgeVersion;
  versions: KnowledgeVersion[];
  evidence: KnowledgeEvidence[];
  updatedAt: string;
  preview: string;
  related: KnowledgeRelatedObject[];
  ontology: KnowledgeOntologyGroups;
}

export interface KnowledgeCategory {
  name: string;
  manualCode: ManualCode | null;
  count: number;
  objects: KnowledgeObject[];
}

export interface KnowledgeRelationship {
  id: string;
  fromKnowledgeId: string;
  toKnowledgeId: string;
  kind: RelationshipKind;
  typeId: string;
  typeName: string;
  strength: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sourceTitle: string;
  sourceStatus: string;
  sourceManual: string;
  targetTitle: string;
  targetStatus: string;
  targetManual: string;
}

export interface KnowledgeRelatedObject {
  relationship: KnowledgeRelationship;
  direction: 'incoming' | 'outgoing';
  object: {
    id: string;
    title: string;
    status: string;
    manualTitle: string;
    manualCode: ManualCode | null;
  };
}

export interface KnowledgeRelationshipType {
  id: string;
  code: RelationshipKind;
  name: string;
  description: string | null;
}

export interface KnowledgeOntologyEntity {
  id: string;
  type: OntologyKind;
  name: string;
  code: string;
  description: string | null;
  status: string;
}

export interface KnowledgeOntologyGroups {
  departments: KnowledgeOntologyEntity[];
  roles: KnowledgeOntologyEntity[];
  areas: KnowledgeOntologyEntity[];
  equipment: KnowledgeOntologyEntity[];
  businessProcesses: KnowledgeOntologyEntity[];
  documentTypes: KnowledgeOntologyEntity[];
  tags: KnowledgeOntologyEntity[];
}

export interface KnowledgeOntologyStats {
  objectsByDepartment: Array<{ id: string; name: string; count: number }>;
  objectsByRole: Array<{ id: string; name: string; count: number }>;
  objectsByDocumentType: Array<{ id: string; name: string; count: number }>;
  objectsWithoutClassification: number;
}

export interface RequiredKnowledgeGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  sortOrder: number;
}

export interface RequiredKnowledgeItem {
  id: string;
  groupId: string | null;
  groupName: string | null;
  title: string;
  code: string;
  description: string | null;
  priority: number;
  status: string;
  sortOrder: number;
  ontology: KnowledgeOntologyGroups;
}

export interface KnowledgeCoverageResult {
  item: RequiredKnowledgeItem;
  status: 'missing' | 'satisfied';
  matchedObjects: KnowledgeObject[];
  completedAt: string | null;
}

export interface KnowledgeCoverageSummary {
  requiredCount: number;
  existingCount: number;
  missingCount: number;
  coveragePercent: number;
  missing: KnowledgeCoverageResult[];
  satisfied: KnowledgeCoverageResult[];
  byDepartment: Array<{ id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }>;
  byRole: Array<{ id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }>;
  byArea: Array<{ id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }>;
  byBusinessProcess: Array<{ id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }>;
  topMissing: KnowledgeCoverageResult[];
  recentlyCompleted: KnowledgeCoverageResult[];
}

export interface KnowledgeEngineData {
  manuals: KnowledgeManual[];
  objects: KnowledgeObject[];
  categories: KnowledgeCategory[];
  relationships: KnowledgeRelationship[];
  relationshipTypes: KnowledgeRelationshipType[];
  ontologyOptions: KnowledgeOntologyGroups;
  ontologyStats: KnowledgeOntologyStats;
  requiredKnowledgeGroups: RequiredKnowledgeGroup[];
  requiredKnowledgeItems: RequiredKnowledgeItem[];
  coverage: KnowledgeCoverageSummary;
  versions: KnowledgeVersion[];
}

export interface CreateKnowledgeRelationshipInput {
  sourceKnowledgeId: string;
  targetKnowledgeId: string;
  relationshipTypeId: string;
  notes?: string;
  strength?: number;
}

export interface KnowledgeSearchParams {
  query?: string;
  manualCode?: ManualFilter;
  category?: string;
  limit?: number;
}

interface CanonicalKnowledgeRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  current_approved_version_id: string | null;
  updated_at: string;
}

interface KnowledgeVersionRow {
  id: string;
  knowledge_id: string;
  version_number: number;
  body: string;
  status: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EvidenceLinkRow {
  id: string;
  object_id: string;
  source_section_id: string;
}

interface SourceSectionRow {
  id: string;
  manual_id: string;
  heading: string;
  body: string;
  content_hash: string;
}

interface SourceManualRow {
  id: string;
  title: string;
  source_uri: string | null;
  content_hash: string;
  captured_at: string;
}

interface RelationshipRow {
  id: string;
  source_knowledge_id: string;
  target_knowledge_id: string;
  relationship_type_id: string;
  strength: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OntologyLinkRow {
  id: string;
  knowledge_id: string;
  department_id: string | null;
  role_id: string | null;
  area_id: string | null;
  equipment_id: string | null;
  business_process_id: string | null;
  document_type_id: string | null;
  tag_id: string | null;
  notes: string | null;
}

interface OntologyEntityRow {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
}

interface RequiredKnowledgeGroupRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  sort_order: number;
}

interface RequiredKnowledgeItemRow {
  id: string;
  group_id: string | null;
  title: string;
  code: string;
  description: string | null;
  priority: number;
  status: string;
  sort_order: number;
  department_id: string | null;
  role_id: string | null;
  area_id: string | null;
  equipment_id: string | null;
  business_process_id: string | null;
  document_type_id: string | null;
}

const MANUAL_CODE_PATTERN = /(?:^|\/)(M[1-9])[-_]/i;
const DEFAULT_LIMIT = 80;

export const EMPTY_ONTOLOGY_GROUPS: KnowledgeOntologyGroups = {
  departments: [],
  roles: [],
  areas: [],
  equipment: [],
  businessProcesses: [],
  documentTypes: [],
  tags: [],
};

function isMissingOntologyTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === '42501' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') === true ||
    error.message?.toLowerCase().includes('permission denied') === true
  );
}

function isMissingCoverageTableError(error: { code?: string; message?: string }): boolean {
  return isMissingOntologyTableError(error);
}

function ensureSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  return supabase;
}

function inferManualCode(sourceUri: string | null): ManualCode | null {
  const match = sourceUri?.match(MANUAL_CODE_PATTERN);
  return match ? (match[1].toUpperCase() as ManualCode) : null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function previewText(value: string, maxLength = 220): string {
  const normalized = normalizeText(value);
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function emptyOntologyGroups(): KnowledgeOntologyGroups {
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

function ontologyGroupValues(groups: KnowledgeOntologyGroups): KnowledgeOntologyEntity[] {
  return [
    ...groups.departments,
    ...groups.roles,
    ...groups.areas,
    ...groups.equipment,
    ...groups.businessProcesses,
    ...groups.documentTypes,
    ...groups.tags,
  ];
}

function matchesText(object: KnowledgeObject, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    object.title,
    object.summary ?? '',
    object.approvedVersion.body,
    object.sourceSectionHeading,
    object.manualTitle,
    object.category,
    ...ontologyGroupValues(object.ontology).map((item) => `${item.name} ${item.code}`),
    ...object.evidence.map((item) => item.sourceSectionBody),
  ].some((value) => value.toLowerCase().includes(needle));
}

async function selectByIds<T extends { id: string }>(
  table: string,
  ids: string[],
  columns: string,
): Promise<T[]> {
  const client = ensureSupabase();
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client.from(table).select(columns).in('id', uniqueIds);
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

async function selectVersionsByKnowledgeIds(knowledgeIds: string[]): Promise<KnowledgeVersionRow[]> {
  const client = ensureSupabase();
  const uniqueIds = Array.from(new Set(knowledgeIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client
    .from('os_knowledge_versions')
    .select('id,knowledge_id,version_number,body,status,approved_at,created_at,updated_at')
    .in('knowledge_id', uniqueIds);

  if (error) throw error;
  return (data ?? []) as KnowledgeVersionRow[];
}

async function selectOntologyLinks(knowledgeIds: string[]): Promise<OntologyLinkRow[]> {
  const client = ensureSupabase();
  const uniqueIds = Array.from(new Set(knowledgeIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client
    .from('os_knowledge_ontology_links')
    .select('id,knowledge_id,department_id,role_id,area_id,equipment_id,business_process_id,document_type_id,tag_id,notes')
    .in('knowledge_id', uniqueIds);

  if (error) {
    if (isMissingOntologyTableError(error)) return [];
    throw error;
  }

  return (data ?? []) as OntologyLinkRow[];
}

async function selectOntologyEntities(
  table: string,
  ids: string[],
  type: OntologyKind,
  hasDescription = true,
): Promise<KnowledgeOntologyEntity[]> {
  const client = ensureSupabase();
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const columns = hasDescription ? 'id,name,code,description,status' : 'id,name,code,status';
  const { data, error } = await client.from(table).select(columns).in('id', uniqueIds).eq('status', 'active');

  if (error) {
    if (isMissingOntologyTableError(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as OntologyEntityRow[])
    .map((row) => ({
      id: row.id,
      type,
      name: row.name,
      code: row.code,
      description: row.description ?? null,
      status: row.status,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function buildOntologyFromLinks(
  ontologyLinks: OntologyLinkRow[],
): Promise<{
  byKnowledgeId: Map<string, KnowledgeOntologyGroups>;
  options: KnowledgeOntologyGroups;
}> {
  const departmentIds = ontologyLinks.flatMap((row) => (row.department_id ? [row.department_id] : []));
  const roleIds = ontologyLinks.flatMap((row) => (row.role_id ? [row.role_id] : []));
  const areaIds = ontologyLinks.flatMap((row) => (row.area_id ? [row.area_id] : []));
  const equipmentIds = ontologyLinks.flatMap((row) => (row.equipment_id ? [row.equipment_id] : []));
  const businessProcessIds = ontologyLinks.flatMap((row) => (row.business_process_id ? [row.business_process_id] : []));
  const documentTypeIds = ontologyLinks.flatMap((row) => (row.document_type_id ? [row.document_type_id] : []));
  const tagIds = ontologyLinks.flatMap((row) => (row.tag_id ? [row.tag_id] : []));

  const [
    departments,
    roles,
    areas,
    equipment,
    businessProcesses,
    documentTypes,
    tags,
  ] = await Promise.all([
    selectOntologyEntities('os_departments', departmentIds, 'department', false),
    selectOntologyEntities('os_roles', roleIds, 'role'),
    selectOntologyEntities('os_areas', areaIds, 'area'),
    selectOntologyEntities('os_equipment', equipmentIds, 'equipment'),
    selectOntologyEntities('os_business_processes', businessProcessIds, 'businessProcess'),
    selectOntologyEntities('os_document_types', documentTypeIds, 'documentType'),
    selectOntologyEntities('os_tags', tagIds, 'tag'),
  ]);

  const entityMaps = {
    departments: new Map(departments.map((item) => [item.id, item])),
    roles: new Map(roles.map((item) => [item.id, item])),
    areas: new Map(areas.map((item) => [item.id, item])),
    equipment: new Map(equipment.map((item) => [item.id, item])),
    businessProcesses: new Map(businessProcesses.map((item) => [item.id, item])),
    documentTypes: new Map(documentTypes.map((item) => [item.id, item])),
    tags: new Map(tags.map((item) => [item.id, item])),
  };

  const byKnowledgeId = new Map<string, KnowledgeOntologyGroups>();
  for (const link of ontologyLinks) {
    const groups = byKnowledgeId.get(link.knowledge_id) ?? emptyOntologyGroups();
    if (link.department_id) {
      const entity = entityMaps.departments.get(link.department_id);
      if (entity) groups.departments.push(entity);
    }
    if (link.role_id) {
      const entity = entityMaps.roles.get(link.role_id);
      if (entity) groups.roles.push(entity);
    }
    if (link.area_id) {
      const entity = entityMaps.areas.get(link.area_id);
      if (entity) groups.areas.push(entity);
    }
    if (link.equipment_id) {
      const entity = entityMaps.equipment.get(link.equipment_id);
      if (entity) groups.equipment.push(entity);
    }
    if (link.business_process_id) {
      const entity = entityMaps.businessProcesses.get(link.business_process_id);
      if (entity) groups.businessProcesses.push(entity);
    }
    if (link.document_type_id) {
      const entity = entityMaps.documentTypes.get(link.document_type_id);
      if (entity) groups.documentTypes.push(entity);
    }
    if (link.tag_id) {
      const entity = entityMaps.tags.get(link.tag_id);
      if (entity) groups.tags.push(entity);
    }
    byKnowledgeId.set(link.knowledge_id, groups);
  }

  return {
    byKnowledgeId,
    options: {
      departments,
      roles,
      areas,
      equipment,
      businessProcesses,
      documentTypes,
      tags,
    },
  };
}

async function selectRequiredKnowledge(): Promise<{
  groups: RequiredKnowledgeGroup[];
  items: RequiredKnowledgeItem[];
}> {
  const client = ensureSupabase();
  const { data: groupData, error: groupError } = await client
    .from('os_required_knowledge_groups')
    .select('id,name,code,description,status,sort_order')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (groupError) {
    if (isMissingCoverageTableError(groupError)) return { groups: [], items: [] };
    throw groupError;
  }

  const { data: itemData, error: itemError } = await client
    .from('os_required_knowledge_items')
    .select('id,group_id,title,code,description,priority,status,sort_order,department_id,role_id,area_id,equipment_id,business_process_id,document_type_id')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (itemError) {
    if (isMissingCoverageTableError(itemError)) return { groups: [], items: [] };
    throw itemError;
  }

  const groups = ((groupData ?? []) as RequiredKnowledgeGroupRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
  }));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const rows = (itemData ?? []) as RequiredKnowledgeItemRow[];

  const [
    departments,
    roles,
    areas,
    equipment,
    businessProcesses,
    documentTypes,
  ] = await Promise.all([
    selectOntologyEntities('os_departments', rows.flatMap((row) => (row.department_id ? [row.department_id] : [])), 'department', false),
    selectOntologyEntities('os_roles', rows.flatMap((row) => (row.role_id ? [row.role_id] : [])), 'role'),
    selectOntologyEntities('os_areas', rows.flatMap((row) => (row.area_id ? [row.area_id] : [])), 'area'),
    selectOntologyEntities('os_equipment', rows.flatMap((row) => (row.equipment_id ? [row.equipment_id] : [])), 'equipment'),
    selectOntologyEntities('os_business_processes', rows.flatMap((row) => (row.business_process_id ? [row.business_process_id] : [])), 'businessProcess'),
    selectOntologyEntities('os_document_types', rows.flatMap((row) => (row.document_type_id ? [row.document_type_id] : [])), 'documentType'),
  ]);

  const departmentById = new Map(departments.map((item) => [item.id, item]));
  const roleById = new Map(roles.map((item) => [item.id, item]));
  const areaById = new Map(areas.map((item) => [item.id, item]));
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  const businessProcessById = new Map(businessProcesses.map((item) => [item.id, item]));
  const documentTypeById = new Map(documentTypes.map((item) => [item.id, item]));

  return {
    groups,
    items: rows.map((row) => {
      const group = row.group_id ? groupById.get(row.group_id) : null;
      return {
        id: row.id,
        groupId: row.group_id,
        groupName: group?.name ?? null,
        title: row.title,
        code: row.code,
        description: row.description,
        priority: row.priority,
        status: row.status,
        sortOrder: row.sort_order,
        ontology: {
          departments: row.department_id && departmentById.has(row.department_id) ? [departmentById.get(row.department_id)!] : [],
          roles: row.role_id && roleById.has(row.role_id) ? [roleById.get(row.role_id)!] : [],
          areas: row.area_id && areaById.has(row.area_id) ? [areaById.get(row.area_id)!] : [],
          equipment: row.equipment_id && equipmentById.has(row.equipment_id) ? [equipmentById.get(row.equipment_id)!] : [],
          businessProcesses: row.business_process_id && businessProcessById.has(row.business_process_id) ? [businessProcessById.get(row.business_process_id)!] : [],
          documentTypes: row.document_type_id && documentTypeById.has(row.document_type_id) ? [documentTypeById.get(row.document_type_id)!] : [],
          tags: [],
        },
      };
    }),
  };
}

function countOntologyObjects(
  objects: KnowledgeObject[],
  group: keyof Pick<KnowledgeOntologyGroups, 'departments' | 'roles' | 'documentTypes'>,
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const object of objects) {
    for (const entity of object.ontology[group]) {
      const current = counts.get(entity.id) ?? { id: entity.id, name: entity.name, count: 0 };
      current.count += 1;
      counts.set(entity.id, current);
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function buildOntologyStats(objects: KnowledgeObject[]): KnowledgeOntologyStats {
  return {
    objectsByDepartment: countOntologyObjects(objects, 'departments'),
    objectsByRole: countOntologyObjects(objects, 'roles'),
    objectsByDocumentType: countOntologyObjects(objects, 'documentTypes'),
    objectsWithoutClassification: objects.filter((object) => ontologyGroupValues(object.ontology).length === 0).length,
  };
}

function hasOntologyRequirement(item: RequiredKnowledgeItem): boolean {
  return ontologyGroupValues(item.ontology).length > 0;
}

function objectSatisfiesRequirement(object: KnowledgeObject, item: RequiredKnowledgeItem): boolean {
  if (!hasOntologyRequirement(item)) return false;
  return (
    item.ontology.departments.every((entity) => object.ontology.departments.some((objectEntity) => objectEntity.id === entity.id)) &&
    item.ontology.roles.every((entity) => object.ontology.roles.some((objectEntity) => objectEntity.id === entity.id)) &&
    item.ontology.areas.every((entity) => object.ontology.areas.some((objectEntity) => objectEntity.id === entity.id)) &&
    item.ontology.equipment.every((entity) => object.ontology.equipment.some((objectEntity) => objectEntity.id === entity.id)) &&
    item.ontology.businessProcesses.every((entity) => object.ontology.businessProcesses.some((objectEntity) => objectEntity.id === entity.id)) &&
    item.ontology.documentTypes.every((entity) => object.ontology.documentTypes.some((objectEntity) => objectEntity.id === entity.id))
  );
}

function coveragePercent(existing: number, required: number): number {
  return required === 0 ? 0 : Math.round((existing / required) * 100);
}

function buildCoverageBreakdown(
  results: KnowledgeCoverageResult[],
  group: keyof Pick<KnowledgeOntologyGroups, 'departments' | 'roles' | 'areas' | 'businessProcesses'>,
): Array<{ id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }> {
  const rows = new Map<string, { id: string; name: string; required: number; existing: number; missing: number; coveragePercent: number }>();

  for (const result of results) {
    for (const entity of result.item.ontology[group]) {
      const row = rows.get(entity.id) ?? { id: entity.id, name: entity.name, required: 0, existing: 0, missing: 0, coveragePercent: 0 };
      row.required += 1;
      if (result.status === 'satisfied') row.existing += 1;
      if (result.status === 'missing') row.missing += 1;
      row.coveragePercent = coveragePercent(row.existing, row.required);
      rows.set(entity.id, row);
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.coveragePercent - b.coveragePercent || b.missing - a.missing || a.name.localeCompare(b.name));
}

function buildCoverageSummary(items: RequiredKnowledgeItem[], objects: KnowledgeObject[]): KnowledgeCoverageSummary {
  const results = items.map((item) => {
    const matchedObjects = objects.filter((object) => objectSatisfiesRequirement(object, item));
    const completedAt = matchedObjects.length
      ? matchedObjects
          .map((object) => object.updatedAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    return {
      item,
      status: matchedObjects.length > 0 ? 'satisfied' : 'missing',
      matchedObjects,
      completedAt,
    } satisfies KnowledgeCoverageResult;
  });

  const missing = results
    .filter((result) => result.status === 'missing')
    .sort((a, b) => a.item.priority - b.item.priority || a.item.title.localeCompare(b.item.title));
  const satisfied = results
    .filter((result) => result.status === 'satisfied')
    .sort((a, b) => a.item.title.localeCompare(b.item.title));

  return {
    requiredCount: items.length,
    existingCount: satisfied.length,
    missingCount: missing.length,
    coveragePercent: coveragePercent(satisfied.length, items.length),
    missing,
    satisfied,
    byDepartment: buildCoverageBreakdown(results, 'departments'),
    byRole: buildCoverageBreakdown(results, 'roles'),
    byArea: buildCoverageBreakdown(results, 'areas'),
    byBusinessProcess: buildCoverageBreakdown(results, 'businessProcesses'),
    topMissing: missing.slice(0, 8),
    recentlyCompleted: satisfied
      .filter((result) => result.completedAt)
      .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())
      .slice(0, 8),
  };
}

function buildCategories(objects: KnowledgeObject[]): KnowledgeCategory[] {
  const byCategory = new Map<string, KnowledgeObject[]>();
  for (const object of objects) {
    byCategory.set(object.category, [...(byCategory.get(object.category) ?? []), object]);
  }

  return Array.from(byCategory.entries())
    .map(([name, categoryObjects]) => ({
      name,
      manualCode: categoryObjects.find((object) => object.manualCode)?.manualCode ?? null,
      count: categoryObjects.length,
      objects: categoryObjects.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildRelationship(
  row: RelationshipRow,
  typeById: Map<string, KnowledgeRelationshipType>,
  objectById: Map<string, KnowledgeObject>,
): KnowledgeRelationship | null {
  const relationshipType = typeById.get(row.relationship_type_id);
  const source = objectById.get(row.source_knowledge_id);
  const target = objectById.get(row.target_knowledge_id);

  if (!relationshipType || !source || !target) return null;

  return {
    id: row.id,
    fromKnowledgeId: row.source_knowledge_id,
    toKnowledgeId: row.target_knowledge_id,
    kind: relationshipType.code,
    typeId: relationshipType.id,
    typeName: relationshipType.name,
    strength: Number(row.strength),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceTitle: source.title,
    sourceStatus: source.status,
    sourceManual: source.manualTitle,
    targetTitle: target.title,
    targetStatus: target.status,
    targetManual: target.manualTitle,
  };
}

function attachRelationships(
  objects: KnowledgeObject[],
  relationships: KnowledgeRelationship[],
): KnowledgeObject[] {
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const relatedByObject = new Map<string, KnowledgeRelatedObject[]>();

  for (const relationship of relationships) {
    const source = objectById.get(relationship.fromKnowledgeId);
    const target = objectById.get(relationship.toKnowledgeId);
    if (!source || !target) continue;

    relatedByObject.set(relationship.fromKnowledgeId, [
      ...(relatedByObject.get(relationship.fromKnowledgeId) ?? []),
      {
        relationship,
        direction: 'outgoing',
        object: {
          id: target.id,
          title: target.title,
          status: target.status,
          manualTitle: target.manualTitle,
          manualCode: target.manualCode,
        },
      },
    ]);

    relatedByObject.set(relationship.toKnowledgeId, [
      ...(relatedByObject.get(relationship.toKnowledgeId) ?? []),
      {
        relationship,
        direction: 'incoming',
        object: {
          id: source.id,
          title: source.title,
          status: source.status,
          manualTitle: source.manualTitle,
          manualCode: source.manualCode,
        },
      },
    ]);
  }

  return objects.map((object) => ({
    ...object,
    related: (relatedByObject.get(object.id) ?? []).sort((a, b) => a.object.title.localeCompare(b.object.title)),
  }));
}

function attachSectionsToManuals(
  manuals: SourceManualRow[],
  sections: SourceSectionRow[],
  evidenceRows: EvidenceLinkRow[],
): KnowledgeManual[] {
  const knowledgeIdsBySection = new Map<string, string[]>();
  for (const evidence of evidenceRows) {
    knowledgeIdsBySection.set(evidence.source_section_id, [
      ...(knowledgeIdsBySection.get(evidence.source_section_id) ?? []),
      evidence.object_id,
    ]);
  }

  const sectionsByManual = new Map<string, KnowledgeSection[]>();
  for (const section of sections) {
    sectionsByManual.set(section.manual_id, [
      ...(sectionsByManual.get(section.manual_id) ?? []),
      {
        id: section.id,
        manualId: section.manual_id,
        heading: section.heading,
        body: section.body,
        contentHash: section.content_hash,
        knowledgeIds: knowledgeIdsBySection.get(section.id) ?? [],
      },
    ]);
  }

  return manuals
    .map((manual) => {
      const manualCode = inferManualCode(manual.source_uri);
      return {
        id: manual.id,
        title: manual.title,
        manualCode,
        sourceUri: manual.source_uri ?? '',
        contentHash: manual.content_hash,
        capturedAt: manual.captured_at,
        category: manualCode ? `${manualCode} - ${manual.title}` : manual.title,
        sections: (sectionsByManual.get(manual.id) ?? []).sort((a, b) => a.heading.localeCompare(b.heading)),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const client = ensureSupabase();

  const [manuals, sourceSections, canonicalKnowledge] = await Promise.all([
    client.from('os_source_manuals').select('id', { count: 'exact', head: true }),
    client.from('os_source_sections').select('id', { count: 'exact', head: true }),
    client
      .from('os_canonical_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('current_approved_version_id', 'is', null),
  ]);

  for (const response of [manuals, sourceSections, canonicalKnowledge]) {
    if (response.error) throw response.error;
  }

  return {
    manuals: manuals.count ?? 0,
    sourceSections: sourceSections.count ?? 0,
    canonicalKnowledge: canonicalKnowledge.count ?? 0,
  };
}

export async function getKnowledgeEngineData(): Promise<KnowledgeEngineData> {
  const client = ensureSupabase();

  const { data: knowledgeRows, error: knowledgeError } = await client
    .from('os_canonical_knowledge')
    .select('id,slug,title,summary,status,current_approved_version_id,updated_at')
    .eq('status', 'active')
    .not('current_approved_version_id', 'is', null)
    .order('title', { ascending: true })
    .limit(1000);

  if (knowledgeError) throw knowledgeError;

  const canonicalRows = (knowledgeRows ?? []) as CanonicalKnowledgeRow[];
  const currentVersionIds = canonicalRows.flatMap((row) => (row.current_approved_version_id ? [row.current_approved_version_id] : []));

  const currentVersionRows = await selectByIds<KnowledgeVersionRow>(
    'os_knowledge_versions',
    currentVersionIds,
    'id,knowledge_id,version_number,body,status,approved_at,created_at,updated_at',
  );

  const currentVersions = new Map(
    currentVersionRows
      .filter((row) => row.status === 'approved')
      .map((row) => [row.id, row]),
  );

  const approvedKnowledge = canonicalRows.filter(
    (row) => row.current_approved_version_id && currentVersions.has(row.current_approved_version_id),
  );
  const approvedKnowledgeIds = approvedKnowledge.map((row) => row.id);

  const allVersionRows = await selectVersionsByKnowledgeIds(approvedKnowledgeIds);
  const ontologyLinks = await selectOntologyLinks(approvedKnowledgeIds);
  const { byKnowledgeId: ontologyByKnowledgeId, options: ontologyOptions } = await buildOntologyFromLinks(ontologyLinks);

  const { data: evidenceData, error: evidenceError } = await client
    .from('os_evidence_links')
    .select('id,object_id,source_section_id')
    .eq('object_type', 'canonical_knowledge')
    .in('object_id', approvedKnowledgeIds);

  if (evidenceError) throw evidenceError;

  const evidenceRows = (evidenceData ?? []) as EvidenceLinkRow[];
  const sectionRows = await selectByIds<SourceSectionRow>(
    'os_source_sections',
    evidenceRows.map((row) => row.source_section_id),
    'id,manual_id,heading,body,content_hash',
  );
  const sectionsById = new Map(sectionRows.map((row) => [row.id, row]));

  const manualRows = await selectByIds<SourceManualRow>(
    'os_source_manuals',
    sectionRows.map((row) => row.manual_id),
    'id,title,source_uri,content_hash,captured_at',
  );
  const manualsById = new Map(manualRows.map((row) => [row.id, row]));

  const evidenceByKnowledge = new Map<string, KnowledgeEvidence[]>();
  for (const evidence of evidenceRows) {
    const section = sectionsById.get(evidence.source_section_id);
    if (!section) continue;

    const manual = manualsById.get(section.manual_id);
    if (!manual) continue;

    const nextEvidence: KnowledgeEvidence = {
      id: evidence.id,
      sourceSectionId: section.id,
      sourceSectionHeading: section.heading,
      sourceSectionBody: section.body,
      sourceSectionHash: section.content_hash,
      sourceManualId: manual.id,
      sourceManualTitle: manual.title,
      sourceFileUri: manual.source_uri ?? '',
      manualCode: inferManualCode(manual.source_uri),
    };
    evidenceByKnowledge.set(evidence.object_id, [...(evidenceByKnowledge.get(evidence.object_id) ?? []), nextEvidence]);
  }

  const allVersionsByKnowledge = new Map<string, KnowledgeVersion[]>();
  const versionHistoryRows = allVersionRows.length > 0 ? allVersionRows : currentVersionRows;
  for (const row of versionHistoryRows) {
    const version: KnowledgeVersion = {
      id: row.id,
      knowledgeId: row.knowledge_id,
      versionNumber: row.version_number,
      body: row.body,
      status: row.status,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    allVersionsByKnowledge.set(row.knowledge_id, [...(allVersionsByKnowledge.get(row.knowledge_id) ?? []), version]);
  }

  const objects: KnowledgeObject[] = approvedKnowledge.flatMap((knowledge) => {
    const approvedVersionRow = knowledge.current_approved_version_id
      ? currentVersions.get(knowledge.current_approved_version_id)
      : null;
    const evidence = evidenceByKnowledge.get(knowledge.id) ?? [];
    const primaryEvidence = evidence[0];
    if (!approvedVersionRow || !primaryEvidence) return [];

    const approvedVersion: KnowledgeVersion = {
      id: approvedVersionRow.id,
      knowledgeId: approvedVersionRow.knowledge_id,
      versionNumber: approvedVersionRow.version_number,
      body: approvedVersionRow.body,
      status: approvedVersionRow.status,
      approvedAt: approvedVersionRow.approved_at,
      createdAt: approvedVersionRow.created_at,
      updatedAt: approvedVersionRow.updated_at,
    };
    const category = primaryEvidence.manualCode
      ? `${primaryEvidence.manualCode} - ${primaryEvidence.sourceManualTitle}`
      : primaryEvidence.sourceManualTitle;

    return [{
      id: knowledge.id,
      slug: knowledge.slug,
      title: knowledge.title,
      summary: knowledge.summary,
      status: knowledge.status,
      category,
      manualCode: primaryEvidence.manualCode,
      manualTitle: primaryEvidence.sourceManualTitle,
      sourceFileUri: primaryEvidence.sourceFileUri,
      sourceSectionHeading: primaryEvidence.sourceSectionHeading,
      currentApprovedVersionId: approvedVersion.id,
      approvedVersion,
      versions: (allVersionsByKnowledge.get(knowledge.id) ?? [approvedVersion]).sort(
        (a, b) => b.versionNumber - a.versionNumber,
      ),
      evidence,
      updatedAt: knowledge.updated_at,
      preview: previewText(approvedVersion.body),
      related: [],
      ontology: ontologyByKnowledgeId.get(knowledge.id) ?? emptyOntologyGroups(),
    }];
  });

  const sortedObjects = objects.sort((a, b) => a.title.localeCompare(b.title));
  const objectById = new Map(sortedObjects.map((object) => [object.id, object]));

  const { data: relationshipTypeData, error: relationshipTypeError } = await client
    .from('os_knowledge_relationship_types')
    .select('id,code,name,description')
    .order('code', { ascending: true });

  if (relationshipTypeError) throw relationshipTypeError;

  const relationshipTypes = (relationshipTypeData ?? []) as KnowledgeRelationshipType[];
  const relationshipTypeById = new Map(relationshipTypes.map((type) => [type.id, type]));

  const { data: relationshipData, error: relationshipError } = await client
    .from('os_knowledge_relationships')
    .select('id,source_knowledge_id,target_knowledge_id,relationship_type_id,strength,notes,created_at,updated_at')
    .order('updated_at', { ascending: false });

  if (relationshipError) throw relationshipError;

  const relationships = ((relationshipData ?? []) as RelationshipRow[])
    .map((row) => buildRelationship(row, relationshipTypeById, objectById))
    .filter((relationship): relationship is KnowledgeRelationship => relationship !== null);
  const objectsWithRelationships = attachRelationships(sortedObjects, relationships);
  const { groups: requiredKnowledgeGroups, items: requiredKnowledgeItems } = await selectRequiredKnowledge();
  const coverage = buildCoverageSummary(requiredKnowledgeItems, objectsWithRelationships);

  return {
    manuals: attachSectionsToManuals(manualRows, sectionRows, evidenceRows),
    objects: objectsWithRelationships,
    categories: buildCategories(objectsWithRelationships),
    relationships,
    relationshipTypes,
    ontologyOptions,
    ontologyStats: buildOntologyStats(objectsWithRelationships),
    requiredKnowledgeGroups,
    requiredKnowledgeItems,
    coverage,
    versions: objectsWithRelationships
      .flatMap((object) => object.versions)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  };
}

export async function searchKnowledge({
  query = '',
  manualCode = 'all',
  category = 'all',
  limit = DEFAULT_LIMIT,
}: KnowledgeSearchParams): Promise<KnowledgeObject[]> {
  const data = await getKnowledgeEngineData();
  return data.objects
    .filter((object) => manualCode === 'all' || object.manualCode === manualCode)
    .filter((object) => category === 'all' || object.category === category)
    .filter((object) => matchesText(object, query))
    .slice(0, limit);
}

export async function createKnowledgeRelationship({
  sourceKnowledgeId,
  targetKnowledgeId,
  relationshipTypeId,
  notes = '',
  strength = 1,
}: CreateKnowledgeRelationshipInput): Promise<void> {
  const client = ensureSupabase();

  if (!sourceKnowledgeId || !targetKnowledgeId || !relationshipTypeId) {
    throw new Error('Source, relationship type, and target are required.');
  }

  if (sourceKnowledgeId === targetKnowledgeId) {
    throw new Error('Knowledge objects cannot be related to themselves.');
  }

  const { data: existing, error: existingError } = await client
    .from('os_knowledge_relationships')
    .select('id')
    .eq('source_knowledge_id', sourceKnowledgeId)
    .eq('target_knowledge_id', targetKnowledgeId)
    .eq('relationship_type_id', relationshipTypeId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) throw new Error('That relationship already exists.');

  const { error } = await client.from('os_knowledge_relationships').insert({
    source_knowledge_id: sourceKnowledgeId,
    target_knowledge_id: targetKnowledgeId,
    relationship_type_id: relationshipTypeId,
    strength,
    notes: notes.trim() || null,
  });

  if (error) throw error;
}
