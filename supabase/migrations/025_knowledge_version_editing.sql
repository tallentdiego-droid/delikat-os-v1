-- Preserve imported SOP traceability while allowing safe editable version
-- snapshots. The imported canonical knowledge row remains the source of truth;
-- editable changes live on version rows instead of overwriting evidence.

alter table public.os_knowledge_versions
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists notes text,
  add column if not exists restored_from_version_id uuid,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists author_label text not null default 'System';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_knowledge_versions_restored_from_version_fk'
  ) then
    alter table public.os_knowledge_versions
      add constraint os_knowledge_versions_restored_from_version_fk
      foreign key (restored_from_version_id)
      references public.os_knowledge_versions(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists os_knowledge_versions_history_idx
  on public.os_knowledge_versions (knowledge_id, version_number desc);
