import { createClient } from '@supabase/supabase-js';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';

type KnowledgeVersionAction = 'draft' | 'publish' | 'archive' | 'restore';

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

async function loadCurrentKnowledge(client: ReturnType<typeof getAdminClient>, knowledgeId: string) {
  const { data: knowledge, error: knowledgeError } = await client
    .from('os_canonical_knowledge')
    .select('id,organization_id,slug,title,summary,status,current_approved_version_id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', knowledgeId)
    .maybeSingle();

  if (knowledgeError) throw knowledgeError;
  if (!knowledge) throw new Error('Knowledge object not found.');

  const { data: versions, error: versionsError } = await client
    .from('os_knowledge_versions')
    .select('id,knowledge_id,version_number,title,summary,notes,body,status,authored_by,author_label,approved_at,published_at,archived_at,restored_from_version_id,created_at,updated_at')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('knowledge_id', knowledgeId)
    .order('version_number', { ascending: false });

  if (versionsError) throw versionsError;

  return {
    knowledge,
    versions: (versions ?? []) as Array<{
      id: string;
      knowledge_id: string;
      version_number: number;
      title: string | null;
      summary: string | null;
      notes: string | null;
      body: string;
      status: string;
      authored_by: string | null;
      author_label: string | null;
      approved_at: string | null;
      published_at: string | null;
      archived_at: string | null;
      restored_from_version_id: string | null;
      created_at: string;
      updated_at: string;
    }>,
  };
}

function normaliseText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nextVersionNumber(versions: Array<{ version_number: number }>): number {
  return versions.length > 0 ? versions[0].version_number + 1 : 1;
}

async function createVersion({
  client,
  knowledgeId,
  action,
  title,
  summary,
  body,
  notes,
  sourceVersionId,
}: {
  client: ReturnType<typeof getAdminClient>;
  knowledgeId: string;
  action: Exclude<KnowledgeVersionAction, 'archive'>;
  title: string;
  summary: string;
  body: string;
  notes: string | null;
  sourceVersionId: string | null;
}): Promise<{ versionId: string; knowledgeId: string; status: string; currentApprovedVersionId: string | null }> {
  const { knowledge, versions } = await loadCurrentKnowledge(client, knowledgeId);
  const versionNumber = nextVersionNumber(versions);
  const timestamp = nowIso();
  const versionStatus = action === 'publish' ? 'approved' : 'draft';

  const { data: inserted, error: insertError } = await client
    .from('os_knowledge_versions')
    .insert({
      organization_id: ORGANIZATION_ID,
      knowledge_id: knowledge.id,
      version_number: versionNumber,
      title,
      summary,
      notes,
      body,
      status: versionStatus,
      author_label: 'System',
      approved_at: action === 'publish' ? timestamp : null,
      published_at: action === 'publish' ? timestamp : null,
      archived_at: null,
      restored_from_version_id: sourceVersionId,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  if (action === 'publish') {
    const { error: updateError } = await client
      .from('os_canonical_knowledge')
      .update({
        current_approved_version_id: inserted.id,
        status: 'active',
        updated_at: timestamp,
      })
      .eq('organization_id', ORGANIZATION_ID)
      .eq('id', knowledge.id);

    if (updateError) throw updateError;
  }

  return {
    versionId: inserted.id,
    knowledgeId: knowledge.id,
    status: versionStatus,
    currentApprovedVersionId: action === 'publish' ? inserted.id : knowledge.current_approved_version_id,
  };
}

async function archiveKnowledge({
  client,
  knowledgeId,
}: {
  client: ReturnType<typeof getAdminClient>;
  knowledgeId: string;
}): Promise<{ versionId: string; knowledgeId: string; status: string; currentApprovedVersionId: string | null }> {
  const { knowledge, versions } = await loadCurrentKnowledge(client, knowledgeId);
  if (knowledge.status === 'archived') {
    return {
      versionId: knowledge.current_approved_version_id ?? versions[0]?.id ?? knowledge.id,
      knowledgeId: knowledge.id,
      status: 'archived',
      currentApprovedVersionId: knowledge.current_approved_version_id,
    };
  }

  const { error: updateError } = await client
    .from('os_canonical_knowledge')
    .update({
      status: 'archived',
      updated_at: nowIso(),
    })
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', knowledge.id);

  if (updateError) throw updateError;

  const currentVersionId = knowledge.current_approved_version_id ?? versions[0]?.id ?? knowledge.id;
  const { error: versionUpdateError } = await client
    .from('os_knowledge_versions')
    .update({
      archived_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', currentVersionId);

  if (versionUpdateError) throw versionUpdateError;

  return {
    versionId: currentVersionId,
    knowledgeId: knowledge.id,
    status: 'archived',
    currentApprovedVersionId: knowledge.current_approved_version_id,
  };
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const action = normaliseText(payload.action) as KnowledgeVersionAction;
    const knowledgeId = normaliseText(payload.knowledgeId);
    const sourceVersionId = typeof payload.sourceVersionId === 'string' ? payload.sourceVersionId : null;
    const title = normaliseText(payload.title);
    const summary = normaliseText(payload.summary);
    const body = normaliseText(payload.body);
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() || null : null;

    if (!knowledgeId) {
      res.status(400).json({ error: 'A knowledge id is required.' });
      return;
    }

    if (!['draft', 'publish', 'archive', 'restore'].includes(action)) {
      res.status(400).json({ error: 'A valid version action is required.' });
      return;
    }

    const client = getAdminClient();

    if (action === 'archive') {
      const result = await archiveKnowledge({ client, knowledgeId });
      res.status(200).json(result);
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'A title and body are required.' });
      return;
    }

    const result = await createVersion({
      client,
      knowledgeId,
      action,
      title,
      summary,
      body,
      notes,
      sourceVersionId,
    });

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Knowledge version update failed.';
    res.status(500).json({ error: message });
  }
}
