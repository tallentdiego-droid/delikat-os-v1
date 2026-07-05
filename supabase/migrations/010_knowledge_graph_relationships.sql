-- Knowledge Graph foundation for Delikat OS.
-- This is a manual relationship layer only: no AI, embeddings, or generated links.

create table if not exists public.os_knowledge_relationship_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

insert into public.os_knowledge_relationship_types (code, name, description)
values
  ('supports', 'Supports', 'Source knowledge supports or strengthens the target knowledge.'),
  ('depends_on', 'Depends on', 'Source knowledge depends on the target knowledge.'),
  ('references', 'References', 'Source knowledge references the target knowledge.'),
  ('supersedes', 'Supersedes', 'Source knowledge supersedes the target knowledge.'),
  ('duplicates', 'Duplicates', 'Source knowledge duplicates the target knowledge.'),
  ('requires', 'Requires', 'Source knowledge requires the target knowledge.'),
  ('generated_from', 'Generated from', 'Source knowledge was generated from the target knowledge.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

create table if not exists public.os_knowledge_relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  source_knowledge_id uuid not null references public.os_canonical_knowledge(id) on delete cascade,
  target_knowledge_id uuid not null references public.os_canonical_knowledge(id) on delete cascade,
  relationship_type_id uuid not null references public.os_knowledge_relationship_types(id) on delete restrict,
  strength numeric(4,3) not null default 1.000,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint os_knowledge_relationships_no_self_link check (source_knowledge_id <> target_knowledge_id),
  constraint os_knowledge_relationships_strength_range check (strength >= 0 and strength <= 1),
  unique (source_knowledge_id, target_knowledge_id, relationship_type_id)
);

create index if not exists os_knowledge_relationships_source_idx
  on public.os_knowledge_relationships (source_knowledge_id);

create index if not exists os_knowledge_relationships_target_idx
  on public.os_knowledge_relationships (target_knowledge_id);

create index if not exists os_knowledge_relationships_type_idx
  on public.os_knowledge_relationships (relationship_type_id);

drop trigger if exists os_knowledge_relationships_set_updated_at on public.os_knowledge_relationships;
create trigger os_knowledge_relationships_set_updated_at
before update on public.os_knowledge_relationships
for each row
execute function public.os_set_updated_at();

alter table public.os_knowledge_relationship_types enable row level security;
alter table public.os_knowledge_relationships enable row level security;

grant select on table public.os_knowledge_relationship_types to anon, authenticated;
grant select on table public.os_knowledge_relationships to anon, authenticated;
grant insert on table public.os_knowledge_relationships to authenticated;

create policy os_knowledge_relationship_types_public_select
on public.os_knowledge_relationship_types
for select
to anon, authenticated
using (true);

-- Relationships are visible only when both ends are active canonical knowledge
-- objects with current approved versions.
create policy os_knowledge_relationships_public_select
on public.os_knowledge_relationships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.os_canonical_knowledge source
    join public.os_knowledge_versions source_version
      on source_version.id = source.current_approved_version_id
      and source_version.knowledge_id = source.id
      and source_version.status = 'approved'
    join public.os_canonical_knowledge target
      on target.id = os_knowledge_relationships.target_knowledge_id
    join public.os_knowledge_versions target_version
      on target_version.id = target.current_approved_version_id
      and target_version.knowledge_id = target.id
      and target_version.status = 'approved'
    where source.id = os_knowledge_relationships.source_knowledge_id
      and source.status = 'active'
      and target.status = 'active'
  )
);

-- Manual browser-created relationships require an authenticated Supabase
-- session. They can only be inserted between two different active/current
-- approved knowledge objects and a known type.
create policy os_knowledge_relationships_authenticated_insert
on public.os_knowledge_relationships
for insert
to authenticated
with check (
  source_knowledge_id <> target_knowledge_id
  and exists (
    select 1
    from public.os_knowledge_relationship_types relationship_type
    where relationship_type.id = relationship_type_id
  )
  and exists (
    select 1
    from public.os_canonical_knowledge source
    join public.os_knowledge_versions source_version
      on source_version.id = source.current_approved_version_id
      and source_version.knowledge_id = source.id
      and source_version.status = 'approved'
    where source.id = source_knowledge_id
      and source.status = 'active'
  )
  and exists (
    select 1
    from public.os_canonical_knowledge target
    join public.os_knowledge_versions target_version
      on target_version.id = target.current_approved_version_id
      and target_version.knowledge_id = target.id
      and target_version.status = 'approved'
    where target.id = target_knowledge_id
      and target.status = 'active'
  )
);
