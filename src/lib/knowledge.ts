import { supabase, supabaseConfigError } from './supabase';

export type ManualCode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9';
export type ManualFilter = ManualCode | 'all';
export type RelationshipKind = 'supports' | 'depends_on' | 'supersedes' | 'duplicates' | 'references';

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
  related: KnowledgeRelationship[];
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
}

export interface KnowledgeEngineData {
  manuals: KnowledgeManual[];
  objects: KnowledgeObject[];
  categories: KnowledgeCategory[];
  relationships: KnowledgeRelationship[];
  versions: KnowledgeVersion[];
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

const MANUAL_CODE_PATTERN = /(?:^|\/)(M[1-9])[-_]/i;
const DEFAULT_LIMIT = 80;

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
  const knowledgeIds = canonicalRows.map((row) => row.id);
  const currentVersionIds = canonicalRows.flatMap((row) => (row.current_approved_version_id ? [row.current_approved_version_id] : []));

  const versionRows = await selectByIds<KnowledgeVersionRow>(
    'os_knowledge_versions',
    currentVersionIds,
    'id,knowledge_id,version_number,body,status,approved_at,created_at,updated_at',
  );

  const currentVersions = new Map(
    versionRows
      .filter((row) => row.status === 'approved')
      .map((row) => [row.id, row]),
  );

  const approvedKnowledge = canonicalRows.filter(
    (row) => row.current_approved_version_id && currentVersions.has(row.current_approved_version_id),
  );

  const { data: evidenceData, error: evidenceError } = await client
    .from('os_evidence_links')
    .select('id,object_id,source_section_id')
    .eq('object_type', 'canonical_knowledge')
    .in('object_id', knowledgeIds);

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
  for (const row of versionRows) {
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
    }];
  });

  const sortedObjects = objects.sort((a, b) => a.title.localeCompare(b.title));

  return {
    manuals: attachSectionsToManuals(manualRows, sectionRows, evidenceRows),
    objects: sortedObjects,
    categories: buildCategories(sortedObjects),
    relationships: [],
    versions: sortedObjects
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
