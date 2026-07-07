import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function uniqueSlug(title: string): string {
  const base = slugify(title) || 'new-sop';
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function buildSourceType(sourceType?: string | null): 'imported' | 'user_created' {
  return sourceType === 'user_created' ? 'user_created' : 'imported';
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const client = getAdminClient();

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const title = asString(payload.title).trim();
    const summary = asString(payload.summary).trim();
    const body = asString(payload.body).trim();
    const notes = asString(payload.notes).trim();
    const departmentId = asString(payload.ontology?.departmentId).trim() || null;
    const roleId = asString(payload.ontology?.roleId).trim() || null;
    const tagIds = Array.from(new Set(asStringArray(payload.ontology?.tagIds).map((value) => value.trim()).filter(Boolean)));

    if (!title || !body) {
      res.status(400).json({ error: 'A title and body are required.' });
      return;
    }

    const timestamp = nowIso();
    const slug = uniqueSlug(title);
    const canonicalInsert = {
      organization_id: ORGANIZATION_ID,
      slug,
      title,
      summary: summary || null,
      status: 'draft',
      source_type: 'user_created',
      current_approved_version_id: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const { data: canonical, error: canonicalError } = await client
      .from('os_canonical_knowledge')
      .insert(canonicalInsert)
      .select('id,slug,title,summary,status,current_approved_version_id,source_type,updated_at')
      .single();

    if (canonicalError) throw canonicalError;
    if (!canonical) throw new Error('Knowledge draft could not be created.');

    const { data: version, error: versionError } = await client
      .from('os_knowledge_versions')
      .insert({
        organization_id: ORGANIZATION_ID,
        knowledge_id: canonical.id,
        version_number: 1,
        title,
        summary: summary || null,
        notes: notes || null,
        body,
        status: 'draft',
        author_label: 'User-created SOP',
        authored_by: null,
        approved_at: null,
        published_at: null,
        archived_at: null,
        restored_from_version_id: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('id,knowledge_id,version_number,title,summary,notes,body,status,approved_at,published_at,archived_at,authored_by,author_label,restored_from_version_id,created_at,updated_at')
      .single();

    if (versionError) {
      await client.from('os_canonical_knowledge').delete().eq('organization_id', ORGANIZATION_ID).eq('id', canonical.id);
      throw versionError;
    }

    const ontologyRows: Array<Record<string, unknown>> = [];
    if (departmentId) {
      ontologyRows.push({ organization_id: ORGANIZATION_ID, knowledge_id: canonical.id, department_id: departmentId });
    }
    if (roleId) {
      ontologyRows.push({ organization_id: ORGANIZATION_ID, knowledge_id: canonical.id, role_id: roleId });
    }
    for (const tagId of tagIds) {
      ontologyRows.push({ organization_id: ORGANIZATION_ID, knowledge_id: canonical.id, tag_id: tagId });
    }

    if (ontologyRows.length > 0) {
      const { error: ontologyError } = await client.from('os_knowledge_ontology_links').insert(ontologyRows);
      if (ontologyError) {
        await client.from('os_knowledge_versions').delete().eq('organization_id', ORGANIZATION_ID).eq('id', version.id);
        await client.from('os_canonical_knowledge').delete().eq('organization_id', ORGANIZATION_ID).eq('id', canonical.id);
        throw ontologyError;
      }
    }

    const knowledge = {
      id: canonical.id,
      slug: canonical.slug,
      title: canonical.title,
      summary: canonical.summary,
      status: canonical.status,
      category: 'User-created SOP',
      sourceType: buildSourceType(canonical.source_type),
      manualCode: null,
      manualTitle: 'Knowledge Workspace',
      sourceFileUri: `workspace://knowledge/${canonical.slug}`,
      sourceSectionHeading: 'Created in Knowledge Workspace',
      currentApprovedVersionId: null,
      approvedVersion: {
        id: version.id,
        knowledgeId: version.knowledge_id,
        versionNumber: version.version_number,
        title: version.title,
        summary: version.summary,
        notes: version.notes,
        body: version.body,
        status: version.status,
        approvedAt: version.approved_at,
        publishedAt: version.published_at,
        archivedAt: version.archived_at,
        authoredBy: version.authored_by,
        authorLabel: version.author_label,
        restoredFromVersionId: version.restored_from_version_id,
        createdAt: version.created_at,
        updatedAt: version.updated_at,
      },
      versions: [
        {
          id: version.id,
          knowledgeId: version.knowledge_id,
          versionNumber: version.version_number,
          title: version.title,
          summary: version.summary,
          notes: version.notes,
          body: version.body,
          status: version.status,
          approvedAt: version.approved_at,
          publishedAt: version.published_at,
          archivedAt: version.archived_at,
          authoredBy: version.authored_by,
          authorLabel: version.author_label,
          restoredFromVersionId: version.restored_from_version_id,
          createdAt: version.created_at,
          updatedAt: version.updated_at,
        },
      ],
      evidence: [],
      updatedAt: canonical.updated_at,
      preview: body.slice(0, 220),
      related: [],
      ontology: {
        departments: [],
        roles: [],
        areas: [],
        equipment: [],
        businessProcesses: [],
        documentTypes: [],
        tags: [],
      },
    };

    const ontologyIds = {
      departmentIds: ontologyRows.flatMap((row) => (typeof row.department_id === 'string' ? [row.department_id] : [])),
      roleIds: ontologyRows.flatMap((row) => (typeof row.role_id === 'string' ? [row.role_id] : [])),
      tagIds: ontologyRows.flatMap((row) => (typeof row.tag_id === 'string' ? [row.tag_id] : [])),
    };

    const [activeDepartments, activeRoles, activeTags] = await Promise.all([
      ontologyIds.departmentIds.length > 0
        ? client.from('os_departments').select('id,name,code,description,status').eq('status', 'active').in('id', ontologyIds.departmentIds)
        : Promise.resolve({ data: [], error: null }),
      ontologyIds.roleIds.length > 0
        ? client.from('os_roles').select('id,name,code,description,status').eq('status', 'active').in('id', ontologyIds.roleIds)
        : Promise.resolve({ data: [], error: null }),
      ontologyIds.tagIds.length > 0
        ? client.from('os_tags').select('id,name,code,description,status').eq('status', 'active').in('id', ontologyIds.tagIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (activeDepartments.error) throw activeDepartments.error;
    if (activeRoles.error) throw activeRoles.error;
    if (activeTags.error) throw activeTags.error;

    knowledge.ontology = {
      departments: (activeDepartments.data ?? []).map((row: any) => ({
        id: row.id,
        type: 'department',
        name: row.name,
        code: row.code,
        description: row.description ?? null,
        status: row.status,
      })),
      roles: (activeRoles.data ?? []).map((row: any) => ({
        id: row.id,
        type: 'role',
        name: row.name,
        code: row.code,
        description: row.description ?? null,
        status: row.status,
      })),
      areas: [],
      equipment: [],
      businessProcesses: [],
      documentTypes: [],
      tags: (activeTags.data ?? []).map((row: any) => ({
        id: row.id,
        type: 'tag',
        name: row.name,
        code: row.code,
        description: row.description ?? null,
        status: row.status,
      })),
    };

    res.status(200).json({
      knowledge,
      versionId: version.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Knowledge draft creation failed.';
    res.status(500).json({ error: message });
  }
}
