-- Knowledge Ontology foundation for Delikat OS.
-- This is a human-controlled classification layer only: no AI, embeddings,
-- generated classifications, or manual content changes.
--
-- os_departments and os_roles already exist in the canonical OS schema.
-- This migration adds the missing ontology entity tables and one junction
-- model for many-to-many links between approved knowledge and ontology terms.

create table if not exists public.os_areas (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_equipment (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_business_processes (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_document_types (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_tags (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_knowledge_ontology_links (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  knowledge_id uuid not null,
  department_id uuid,
  role_id uuid,
  area_id uuid,
  equipment_id uuid,
  business_process_id uuid,
  document_type_id uuid,
  tag_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_knowledge_ontology_links_knowledge_org_fk
    foreign key (knowledge_id, organization_id)
    references public.os_canonical_knowledge(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_equipment_org_fk
    foreign key (equipment_id, organization_id)
    references public.os_equipment(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_business_process_org_fk
    foreign key (business_process_id, organization_id)
    references public.os_business_processes(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_document_type_org_fk
    foreign key (document_type_id, organization_id)
    references public.os_document_types(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_tag_org_fk
    foreign key (tag_id, organization_id)
    references public.os_tags(id, organization_id)
    on delete cascade,
  constraint os_knowledge_ontology_links_one_entity check (
    num_nonnulls(
      department_id,
      role_id,
      area_id,
      equipment_id,
      business_process_id,
      document_type_id,
      tag_id
    ) = 1
  )
);

create unique index if not exists os_knowledge_ontology_links_department_unique
  on public.os_knowledge_ontology_links (knowledge_id, department_id)
  where department_id is not null;

create unique index if not exists os_knowledge_ontology_links_role_unique
  on public.os_knowledge_ontology_links (knowledge_id, role_id)
  where role_id is not null;

create unique index if not exists os_knowledge_ontology_links_area_unique
  on public.os_knowledge_ontology_links (knowledge_id, area_id)
  where area_id is not null;

create unique index if not exists os_knowledge_ontology_links_equipment_unique
  on public.os_knowledge_ontology_links (knowledge_id, equipment_id)
  where equipment_id is not null;

create unique index if not exists os_knowledge_ontology_links_business_process_unique
  on public.os_knowledge_ontology_links (knowledge_id, business_process_id)
  where business_process_id is not null;

create unique index if not exists os_knowledge_ontology_links_document_type_unique
  on public.os_knowledge_ontology_links (knowledge_id, document_type_id)
  where document_type_id is not null;

create unique index if not exists os_knowledge_ontology_links_tag_unique
  on public.os_knowledge_ontology_links (knowledge_id, tag_id)
  where tag_id is not null;

create index if not exists os_knowledge_ontology_links_knowledge_idx
  on public.os_knowledge_ontology_links (knowledge_id);

create index if not exists os_knowledge_ontology_links_organization_idx
  on public.os_knowledge_ontology_links (organization_id);

drop trigger if exists os_areas_set_updated_at on public.os_areas;
create trigger os_areas_set_updated_at
before update on public.os_areas
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_equipment_set_updated_at on public.os_equipment;
create trigger os_equipment_set_updated_at
before update on public.os_equipment
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_business_processes_set_updated_at on public.os_business_processes;
create trigger os_business_processes_set_updated_at
before update on public.os_business_processes
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_document_types_set_updated_at on public.os_document_types;
create trigger os_document_types_set_updated_at
before update on public.os_document_types
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_tags_set_updated_at on public.os_tags;
create trigger os_tags_set_updated_at
before update on public.os_tags
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_knowledge_ontology_links_set_updated_at on public.os_knowledge_ontology_links;
create trigger os_knowledge_ontology_links_set_updated_at
before update on public.os_knowledge_ontology_links
for each row
execute function public.os_set_updated_at();

alter table public.os_areas enable row level security;
alter table public.os_equipment enable row level security;
alter table public.os_business_processes enable row level security;
alter table public.os_document_types enable row level security;
alter table public.os_tags enable row level security;
alter table public.os_knowledge_ontology_links enable row level security;

grant select on table public.os_departments to anon, authenticated;
grant select on table public.os_roles to anon, authenticated;
grant select on table public.os_areas to anon, authenticated;
grant select on table public.os_equipment to anon, authenticated;
grant select on table public.os_business_processes to anon, authenticated;
grant select on table public.os_document_types to anon, authenticated;
grant select on table public.os_tags to anon, authenticated;
grant select on table public.os_knowledge_ontology_links to anon, authenticated;

create policy os_departments_approved_knowledge_ontology_select
on public.os_departments
for select
to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.department_id = os_departments.id
      and link.organization_id = os_departments.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_roles_approved_knowledge_ontology_select
on public.os_roles
for select
to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.role_id = os_roles.id
      and link.organization_id = os_roles.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_areas_approved_knowledge_ontology_select
on public.os_areas
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.area_id = os_areas.id
      and link.organization_id = os_areas.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_equipment_approved_knowledge_ontology_select
on public.os_equipment
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.equipment_id = os_equipment.id
      and link.organization_id = os_equipment.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_business_processes_approved_knowledge_ontology_select
on public.os_business_processes
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.business_process_id = os_business_processes.id
      and link.organization_id = os_business_processes.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_document_types_approved_knowledge_ontology_select
on public.os_document_types
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.document_type_id = os_document_types.id
      and link.organization_id = os_document_types.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_tags_approved_knowledge_ontology_select
on public.os_tags
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.os_knowledge_ontology_links link
    join public.os_canonical_knowledge k
      on k.id = link.knowledge_id
      and k.organization_id = link.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where link.tag_id = os_tags.id
      and link.organization_id = os_tags.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

create policy os_knowledge_ontology_links_approved_knowledge_select
on public.os_knowledge_ontology_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.os_canonical_knowledge k
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where k.id = os_knowledge_ontology_links.knowledge_id
      and k.organization_id = os_knowledge_ontology_links.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);
