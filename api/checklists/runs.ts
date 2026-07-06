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
    const checklistTemplateId = typeof payload.checklistTemplateId === 'string' ? payload.checklistTemplateId : '';
    const businessDate = typeof payload.businessDate === 'string' && payload.businessDate ? payload.businessDate : todayBusinessDate();

    if (!checklistTemplateId) {
      res.status(400).json({ error: 'A checklist template id is required.' });
      return;
    }

    const client = getAdminClient();

    const { data: template, error: templateError } = await client
      .from('os_checklist_templates')
      .select('id,title,code,status,process_id')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('id', checklistTemplateId)
      .maybeSingle();

    if (templateError) throw templateError;
    if (!template || template.status !== 'active') {
      res.status(404).json({ error: 'Checklist template not found or inactive.' });
      return;
    }

    const { data: checklistRecord, error: checklistRecordError } = await client
      .from('os_checklists')
      .select('id')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('code', template.code)
      .maybeSingle();

    if (checklistRecordError) throw checklistRecordError;

    let checklistId = checklistRecord?.id ?? null;
    if (!checklistId) {
      const { data: insertedChecklist, error: checklistInsertError } = await client
        .from('os_checklists')
        .insert({
          organization_id: ORGANIZATION_ID,
          process_id: template.process_id ?? null,
          title: template.title,
          code: template.code,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (checklistInsertError) throw checklistInsertError;
      checklistId = insertedChecklist.id;
    }

    const { data: existingRun, error: existingError } = await client
      .from('os_checklist_runs')
      .select('id,checklist_template_id,business_date,status,created_at,updated_at')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('checklist_template_id', checklistTemplateId)
      .eq('business_date', businessDate)
      .maybeSingle();

    if (existingError) throw existingError;

    let run = existingRun;
    let created = false;

    if (!run) {
      const { data: insertedRun, error: insertError } = await client
        .from('os_checklist_runs')
        .insert({
          organization_id: ORGANIZATION_ID,
          checklist_id: checklistId,
          checklist_template_id: checklistTemplateId,
          location_id: null,
          station_id: null,
          audit_id: null,
          performed_by: null,
          business_date: businessDate,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id,checklist_template_id,business_date,status,created_at,updated_at')
        .single();

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
        const { data: conflictedRun, error: conflictError } = await client
          .from('os_checklist_runs')
          .select('id,checklist_template_id,business_date,status,created_at,updated_at')
          .eq('organization_id', ORGANIZATION_ID)
          .eq('checklist_template_id', checklistTemplateId)
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
      res.status(500).json({ error: 'Checklist run could not be created.' });
      return;
    }

    const { data: templateItems, error: templateItemsError } = await client
      .from('os_checklist_template_items')
      .select('id')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('checklist_template_id', checklistTemplateId)
      .order('sort_order', { ascending: true });

    if (templateItemsError) throw templateItemsError;

    const rows = (templateItems ?? []).map((item) => ({
      organization_id: ORGANIZATION_ID,
      checklist_run_id: run.id,
      checklist_template_item_id: item.id,
      status: 'not_applicable',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error: runItemsError } = await client.from('os_checklist_run_items').upsert(rows, {
        onConflict: 'checklist_run_id,checklist_template_item_id',
        ignoreDuplicates: true,
      });
      if (runItemsError) throw runItemsError;
    }

    const { data: runItems, error: runItemsLoadError } = await client
      .from('os_checklist_run_items')
      .select('id,completed_at')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('checklist_run_id', run.id);

    if (runItemsLoadError) throw runItemsLoadError;

    res.status(200).json({
      created,
      run: {
        id: run.id,
        checklistTemplateId: run.checklist_template_id,
        checklistTemplateTitle: template.title,
        checklistTemplateCode: template.code,
        businessDate: run.business_date,
        status: run.status,
        itemCount: rows.length,
        completedCount: (runItems ?? []).filter((item) => item.completed_at !== null).length,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checklist run creation failed.';
    res.status(500).json({ error: message });
  }
}
