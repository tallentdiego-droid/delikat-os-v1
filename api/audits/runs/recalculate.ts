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

async function recalculateRun(client: ReturnType<typeof getAdminClient>, auditRunId: string): Promise<void> {
  const { data: run, error: runError } = await client
    .from('os_audit_runs')
    .select('id,started_at,completed_at,status,total_score')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', auditRunId)
    .maybeSingle();

  if (runError) throw runError;
  if (!run) throw new Error('Audit run not found.');

  const { data: items, error: itemsError } = await client
    .from('os_audit_run_items')
    .select(
      `
        id,
        status,
        score,
        os_audit_template_items!inner (
          id,
          max_score,
          scoring_type
        )
      `,
    )
    .eq('organization_id', ORGANIZATION_ID)
    .eq('audit_run_id', auditRunId);

  if (itemsError) throw itemsError;

  const rows = items ?? [];
  const anyStarted = rows.some((item: any) => item.status !== 'pending');
  const anyPending = rows.some((item: any) => item.status === 'pending' || item.status === 'blocked');
  const anyFailed = rows.some((item: any) => item.status === 'failed');

  const scoredRows = rows.filter((item: any) => item.os_audit_template_items?.max_score != null && Number(item.os_audit_template_items.max_score) > 0);
  let totalScore: number | null = null;
  if (scoredRows.length > 0) {
    const denominator = scoredRows.reduce((sum: number, item: any) => sum + Number(item.os_audit_template_items.max_score ?? 0), 0);
    const numerator = scoredRows.reduce((sum: number, item: any) => {
      const maxScore = Number(item.os_audit_template_items.max_score ?? 0);
      if (item.status === 'failed') return sum + Math.max(0, Number(item.score ?? 0));
      if (item.status === 'passed') return sum + Number(item.score ?? maxScore);
      if (item.status === 'not_applicable') return sum;
      if (item.score != null) return sum + Math.max(0, Number(item.score));
      return sum;
    }, 0);
    totalScore = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
  }

  let status: 'planned' | 'in_progress' | 'passed' | 'failed' | 'cancelled' = 'planned';
  let startedAt = run.started_at ?? null;
  let completedAt = null;

  if (anyPending) {
    status = anyStarted ? 'in_progress' : 'planned';
    startedAt = anyStarted ? (startedAt ?? new Date().toISOString()) : startedAt;
  } else if (anyFailed) {
    status = 'failed';
    startedAt = startedAt ?? new Date().toISOString();
    completedAt = run.completed_at ?? new Date().toISOString();
  } else if (rows.length > 0) {
    status = 'passed';
    startedAt = startedAt ?? new Date().toISOString();
    completedAt = run.completed_at ?? new Date().toISOString();
  }

  const { error: updateError } = await client
    .from('os_audit_runs')
    .update({
      status,
      started_at: startedAt,
      completed_at: completedAt,
      total_score: totalScore,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', ORGANIZATION_ID)
    .eq('id', auditRunId);

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
    const auditRunId = typeof payload.auditRunId === 'string' ? payload.auditRunId : '';

    if (!auditRunId) {
      res.status(400).json({ error: 'An audit run id is required.' });
      return;
    }

    const client = getAdminClient();
    await recalculateRun(client, auditRunId);

    res.status(200).json({ runId: auditRunId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit run recalculation failed.';
    res.status(500).json({ error: message });
  }
}
