-- Execution run item duplicate guards.
-- These support idempotent run seeding from the server-side execution endpoints.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'os_checklist_run_items_checklist_run_id_checklist_template_item_id_key'
  ) then
    alter table public.os_checklist_run_items
      add constraint os_checklist_run_items_checklist_run_id_checklist_template_item_id_key
      unique (checklist_run_id, checklist_template_item_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'os_audit_run_items_audit_run_id_audit_template_item_id_key'
  ) then
    alter table public.os_audit_run_items
      add constraint os_audit_run_items_audit_run_id_audit_template_item_id_key
      unique (audit_run_id, audit_template_item_id);
  end if;
end;
$$;
