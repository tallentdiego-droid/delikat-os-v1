import { supabase, supabaseConfigError } from './supabase';

export type ManualCode = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9';

export interface KnowledgeSearchParams {
  query?: string;
  manualCode?: ManualCode | 'all';
  limit?: number;
}

export interface KnowledgeRecord {
  knowledgeId: string;
  title: string;
  summary: string | null;
  approvedBody: string;
  manualCode: ManualCode | null;
  sourceManualTitle: string;
  sourceFileUri: string;
  sourceSectionHeading: string;
  sourceSectionBody: string;
  sourceSectionHash: string;
  evidenceLinkId: string;
}

export interface KnowledgeStats {
  manuals: number;
  sourceSections: number;
  canonicalKnowledge: number;
}

interface CanonicalKnowledgeRow {
  id: string;
  title: string;
  summary: string | null;
  current_approved_version_id: string;
}

interface KnowledgeVersionRow {
  id: string;
  body: string;
  status: string;
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
}

const MANUAL_CODE_PATTERN = /(?:^|\/)(M[1-9])[-_]/i;

function inferManualCode(sourceUri: string | null): ManualCode | null {
  const match = sourceUri?.match(MANUAL_CODE_PATTERN);
  return match ? (match[1].toUpperCase() as ManualCode) : null;
}

function containsQuery(record: KnowledgeRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    record.title,
    record.summary ?? '',
    record.approvedBody,
    record.sourceSectionHeading,
  ].some((value) => value.toLowerCase().includes(needle));
}

async function selectByIds<T extends { id: string }>(
  table: string,
  ids: string[],
  columns: string,
): Promise<T[]> {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from(table).select(columns).in('id', ids);
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');

  const [manuals, sourceSections, canonicalKnowledge] = await Promise.all([
    supabase.from('os_source_manuals').select('id', { count: 'exact', head: true }),
    supabase.from('os_source_sections').select('id', { count: 'exact', head: true }),
    supabase.from('os_canonical_knowledge').select('id', { count: 'exact', head: true }).eq('status', 'active'),
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

export async function searchKnowledge({
  query = '',
  manualCode = 'all',
  limit = 50,
}: KnowledgeSearchParams): Promise<KnowledgeRecord[]> {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase client is not configured.');

  const { data: knowledgeRows, error: knowledgeError } = await supabase
    .from('os_canonical_knowledge')
    .select('id,title,summary,current_approved_version_id')
    .eq('status', 'active')
    .not('current_approved_version_id', 'is', null)
    .order('title', { ascending: true })
    .limit(1000);

  if (knowledgeError) throw knowledgeError;

  const canonicalRows = (knowledgeRows ?? []) as CanonicalKnowledgeRow[];
  const versionIds = canonicalRows.map((row) => row.current_approved_version_id);
  const versionRows = await selectByIds<KnowledgeVersionRow>(
    'os_knowledge_versions',
    versionIds,
    'id,body,status',
  );
  const approvedVersions = new Map(
    versionRows.filter((row) => row.status === 'approved').map((row) => [row.id, row]),
  );

  const approvedKnowledge = canonicalRows.filter((row) => approvedVersions.has(row.current_approved_version_id));
  const knowledgeIds = approvedKnowledge.map((row) => row.id);

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from('os_evidence_links')
    .select('id,object_id,source_section_id')
    .eq('object_type', 'canonical_knowledge')
    .in('object_id', knowledgeIds);

  if (evidenceError) throw evidenceError;

  const evidenceByKnowledge = new Map<string, EvidenceLinkRow[]>();
  for (const evidence of (evidenceRows ?? []) as EvidenceLinkRow[]) {
    const existing = evidenceByKnowledge.get(evidence.object_id) ?? [];
    existing.push(evidence);
    evidenceByKnowledge.set(evidence.object_id, existing);
  }

  const sectionIds = Array.from(new Set(((evidenceRows ?? []) as EvidenceLinkRow[]).map((row) => row.source_section_id)));
  const sectionRows = await selectByIds<SourceSectionRow>(
    'os_source_sections',
    sectionIds,
    'id,manual_id,heading,body,content_hash',
  );
  const sectionsById = new Map(sectionRows.map((row) => [row.id, row]));

  const manualIds = Array.from(new Set(sectionRows.map((row) => row.manual_id)));
  const manualRows = await selectByIds<SourceManualRow>('os_source_manuals', manualIds, 'id,title,source_uri');
  const manualsById = new Map(manualRows.map((row) => [row.id, row]));

  const results: KnowledgeRecord[] = [];
  for (const knowledge of approvedKnowledge) {
    const version = approvedVersions.get(knowledge.current_approved_version_id);
    if (!version) continue;

    for (const evidence of evidenceByKnowledge.get(knowledge.id) ?? []) {
      const section = sectionsById.get(evidence.source_section_id);
      if (!section) continue;

      const manual = manualsById.get(section.manual_id);
      if (!manual) continue;

      const inferredManualCode = inferManualCode(manual.source_uri);
      if (manualCode !== 'all' && inferredManualCode !== manualCode) continue;

      const record: KnowledgeRecord = {
        knowledgeId: knowledge.id,
        title: knowledge.title,
        summary: knowledge.summary,
        approvedBody: version.body,
        manualCode: inferredManualCode,
        sourceManualTitle: manual.title,
        sourceFileUri: manual.source_uri ?? '',
        sourceSectionHeading: section.heading,
        sourceSectionBody: section.body,
        sourceSectionHash: section.content_hash,
        evidenceLinkId: evidence.id,
      };

      if (containsQuery(record, query)) {
        results.push(record);
      }

      if (results.length >= limit) return results;
    }
  }

  return results;
}
