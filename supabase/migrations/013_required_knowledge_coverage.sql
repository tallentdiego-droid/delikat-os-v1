-- Required Knowledge Coverage foundation for Delikat OS.
-- Requirements define what should exist. Approved knowledge defines what does exist.
-- This migration creates definition tables only: no AI, embeddings, generated SOPs,
-- inferred requirements, or manual content changes.

create table if not exists public.os_required_knowledge_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.os_record_status not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table if not exists public.os_required_knowledge_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  group_id uuid,
  title text not null,
  code text not null,
  description text,
  priority integer not null default 3,
  status public.os_record_status not null default 'active',
  department_id uuid,
  role_id uuid,
  area_id uuid,
  equipment_id uuid,
  business_process_id uuid,
  document_type_id uuid,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint os_required_knowledge_items_priority_range check (priority >= 1 and priority <= 5),
  constraint os_required_knowledge_items_group_org_fk
    foreign key (group_id, organization_id)
    references public.os_required_knowledge_groups(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_equipment_org_fk
    foreign key (equipment_id, organization_id)
    references public.os_equipment(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_business_process_org_fk
    foreign key (business_process_id, organization_id)
    references public.os_business_processes(id, organization_id)
    on delete restrict,
  constraint os_required_knowledge_items_document_type_org_fk
    foreign key (document_type_id, organization_id)
    references public.os_document_types(id, organization_id)
    on delete restrict
);

create index if not exists os_required_knowledge_groups_organization_idx
  on public.os_required_knowledge_groups (organization_id);

create index if not exists os_required_knowledge_groups_status_idx
  on public.os_required_knowledge_groups (organization_id, status);

create index if not exists os_required_knowledge_items_group_idx
  on public.os_required_knowledge_items (group_id);

create index if not exists os_required_knowledge_items_organization_idx
  on public.os_required_knowledge_items (organization_id);

create index if not exists os_required_knowledge_items_status_idx
  on public.os_required_knowledge_items (organization_id, status);

create index if not exists os_required_knowledge_items_department_idx
  on public.os_required_knowledge_items (department_id)
  where department_id is not null;

create index if not exists os_required_knowledge_items_role_idx
  on public.os_required_knowledge_items (role_id)
  where role_id is not null;

create index if not exists os_required_knowledge_items_area_idx
  on public.os_required_knowledge_items (area_id)
  where area_id is not null;

create index if not exists os_required_knowledge_items_business_process_idx
  on public.os_required_knowledge_items (business_process_id)
  where business_process_id is not null;

drop trigger if exists os_required_knowledge_groups_set_updated_at on public.os_required_knowledge_groups;
create trigger os_required_knowledge_groups_set_updated_at
before update on public.os_required_knowledge_groups
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_required_knowledge_items_set_updated_at on public.os_required_knowledge_items;
create trigger os_required_knowledge_items_set_updated_at
before update on public.os_required_knowledge_items
for each row
execute function public.os_set_updated_at();

alter table public.os_required_knowledge_groups enable row level security;
alter table public.os_required_knowledge_items enable row level security;

grant select on table public.os_required_knowledge_groups to anon, authenticated;
grant select on table public.os_required_knowledge_items to anon, authenticated;

create policy os_required_knowledge_groups_public_select
on public.os_required_knowledge_groups
for select
to anon, authenticated
using (status = 'active');

create policy os_required_knowledge_items_public_select
on public.os_required_knowledge_items
for select
to anon, authenticated
using (status = 'active');
