create extension if not exists pgcrypto with schema extensions;

create or replace function public.os_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.os_prevent_immutable_evidence_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'source manuals and source sections are immutable evidence';
end;
$$;
