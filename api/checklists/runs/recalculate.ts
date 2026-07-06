import { createClient } from '@supabase/supabase-js';

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

async function recalculateRun(client: ReturnType<typeof getAdminClient>, checklistRunId: string): Promise<void> {
  const { data: run, error: runError } = await client
    .from('os_checklist_runs')
    .select('id,started_at,completed_at,status')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', checklistRunId)
    .maybeSingle();

  if (runError) throw runError;
  if (!run) throw new Error('Checklist run not found.');

  const { data: items, error: itemsError } = await client
    .from('os_checklist_run_items')
    .select(
      `
        id,
        status,
        checklist_template_item_id,
        os_checklist_template_items!inner (
          id,
          completion_required
        )
      `,
    )
    .eq('organization_id', ORGANIZATION_ID)
    .eq('checklist_run_id', checklistRunId);

  if (itemsError) throw itemsError;

  const rows = items ?? [];
  const requiredItems = rows.filter((item: any) => item.os_checklist_template_items?.completion_required !== false);
  const allRequiredCompleted = requiredItems.every((item: any) => item.status === 'completed');
  const anyStarted = rows.some((item: any) => item.status !== 'pending');

  let status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' = 'scheduled';
  let startedAt = run.started_at ?? null;
  let completedAt = null;

  if (allRequiredCompleted && requiredItems.length > 0) {
    status = 'completed';
    startedAt = startedAt ?? new Date().toISOString();
    completedAt = run.completed_at ?? new Date().toISOString();
  } else if (anyStarted) {
    status = 'in_progress';
    startedAt = startedAt ?? new Date().toISOString();
  }

  const { error: updateError } = await client
    .from('os_checklist_runs')
    .update({
      status,
      started_at: startedAt,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', checklistRunId);

  if (updateError) throw updateError;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const checklistRunId = typeof payload.checklistRunId === 'string' ? payload.checklistRunId : '';

    if (!checklistRunId) {
      res.status(400).json({ error: 'A checklist run id is required.' });
      return;
    }

    const client = getAdminClient();
    await recalculateRun(client, checklistRunId);

    res.status(200).json({ runId: checklistRunId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checklist run recalculation failed.';
    res.status(500).json({ error: message });
  }
}
