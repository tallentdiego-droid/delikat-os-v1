-- Live Execution Layer for Delikat OS.
-- This adds duplicate guards for template-based runs.
-- Run creation is handled by server-side app endpoints so the browser does not
-- need public write access to Supabase.

alter table public.os_checklist_runs
  alter column business_date set default current_date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'os_checklist_runs_template_business_date_key'
  ) then
    alter table public.os_checklist_runs
      add constraint os_checklist_runs_template_business_date_key
      unique (organization_id, checklist_template_id, business_date);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'os_audit_runs_template_business_date_key'
  ) then
    alter table public.os_audit_runs
      add constraint os_audit_runs_template_business_date_key
      unique (organization_id, audit_template_id, business_date);
  end if;
end;
$$;
