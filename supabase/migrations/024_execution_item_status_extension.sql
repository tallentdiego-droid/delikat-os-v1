-- Extend the shared result-status enum so checklist and audit run items can
-- represent live execution states without inventing parallel enums.

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'pending'
  ) then
    alter type public.os_result_status add value 'pending';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'completed'
  ) then
    alter type public.os_result_status add value 'completed';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'skipped'
  ) then
    alter type public.os_result_status add value 'skipped';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'passed'
  ) then
    alter type public.os_result_status add value 'passed';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'failed'
  ) then
    alter type public.os_result_status add value 'failed';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'os_result_status' and e.enumlabel = 'blocked'
  ) then
    alter type public.os_result_status add value 'blocked';
  end if;
end;
$$;
