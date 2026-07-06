import { createClient } from '@supabase/supabase-js';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';

function todayBusinessDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

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

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const auditTemplateId = typeof payload.auditTemplateId === 'string' ? payload.auditTemplateId : '';
    const businessDate = typeof payload.businessDate === 'string' && payload.businessDate ? payload.businessDate : todayBusinessDate();

    if (!auditTemplateId) {
      res.status(400).json({ error: 'An audit template id is required.' });
      return;
    }

    const client = getAdminClient();

    const { data: template, error: templateError } = await client
      .from('os_audit_templates')
      .select('id,title,code,status')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('id', auditTemplateId)
      .maybeSingle();

    if (templateError) throw templateError;
    if (!template || template.status !== 'active') {
      res.status(404).json({ error: 'Audit template not found or inactive.' });
      return;
    }

    const { data: existingRun, error: existingError } = await client
      .from('os_audit_runs')
      .select('id,audit_template_id,business_date,status,created_at,updated_at')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('audit_template_id', auditTemplateId)
      .eq('business_date', businessDate)
      .maybeSingle();

    if (existingError) throw existingError;

    let run = existingRun;
    let created = false;

    if (!run) {
      const { data: insertedRun, error: insertError } = await client
        .from('os_audit_runs')
        .insert({
          organization_id: ORGANIZATION_ID,
          audit_template_id: auditTemplateId,
          business_date: businessDate,
          status: 'planned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id,audit_template_id,business_date,status,created_at,updated_at')
        .single();

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
        const { data: conflictedRun, error: conflictError } = await client
          .from('os_audit_runs')
          .select('id,audit_template_id,business_date,status,created_at,updated_at')
          .eq('organization_id', ORGANIZATION_ID)
          .eq('audit_template_id', auditTemplateId)
          .eq('business_date', businessDate)
          .maybeSingle();
        if (conflictError) throw conflictError;
        run = conflictedRun;
      } else {
        run = insertedRun;
        created = true;
      }
    }

    if (!run) {
      res.status(500).json({ error: 'Audit run could not be created.' });
      return;
    }

    const { data: templateItems, error: templateItemsError } = await client
      .from('os_audit_template_items')
      .select('id')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('audit_template_id', auditTemplateId)
      .order('sort_order', { ascending: true });

    if (templateItemsError) throw templateItemsError;

    const rows = (templateItems ?? []).map((item) => ({
      organization_id: ORGANIZATION_ID,
      audit_run_id: run.id,
      audit_template_item_id: item.id,
      status: 'not_applicable',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error: runItemsError } = await client.from('os_audit_run_items').upsert(rows, {
        onConflict: 'audit_run_id,audit_template_item_id',
        ignoreDuplicates: true,
      });
      if (runItemsError) throw runItemsError;
    }

    const { data: runItems, error: runItemsLoadError } = await client
      .from('os_audit_run_items')
      .select('id,completed_at')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('audit_run_id', run.id);

    if (runItemsLoadError) throw runItemsLoadError;

    res.status(200).json({
      created,
      run: {
        id: run.id,
        auditTemplateId: run.audit_template_id,
        auditTemplateTitle: template.title,
        auditTemplateCode: template.code,
        businessDate: run.business_date,
        status: run.status,
        itemCount: rows.length,
        completedCount: (runItems ?? []).filter((item) => item.completed_at !== null).length,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit run creation failed.';
    res.status(500).json({ error: message });
  }
}
