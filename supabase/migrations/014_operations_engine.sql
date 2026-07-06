-- Operations Engine foundation for Delikat OS.
-- This extends the existing canonical operational schema instead of creating
-- a parallel model. No AI, automation, or generated process data is added here.

alter table public.os_processes
  add column if not exists description text,
  add column if not exists area_id uuid,
  add column if not exists frequency text,
  add column if not exists estimated_duration_minutes integer,
  add column if not exists priority integer not null default 3,
  add column if not exists criticality text not null default 'medium',
  add column if not exists trigger_type text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_processes_area_org_fk'
  ) then
    alter table public.os_processes
      add constraint os_processes_area_org_fk
      foreign key (area_id, organization_id)
      references public.os_areas(id, organization_id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_processes_priority_range'
  ) then
    alter table public.os_processes
      add constraint os_processes_priority_range
      check (priority between 1 and 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_processes_criticality_check'
  ) then
    alter table public.os_processes
      add constraint os_processes_criticality_check
      check (criticality in ('low', 'medium', 'high', 'critical'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_processes_trigger_type_check'
  ) then
    alter table public.os_processes
      add constraint os_processes_trigger_type_check
      check (trigger_type in ('opening', 'closing', 'scheduled', 'event', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_processes_estimated_duration_positive'
  ) then
    alter table public.os_processes
      add constraint os_processes_estimated_duration_positive
      check (estimated_duration_minutes is null or estimated_duration_minutes > 0);
  end if;
end;
$$;

create table if not exists public.os_process_steps (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null,
  sequence integer not null,
  title text not null,
  description text,
  expected_duration_minutes integer,
  required_knowledge_id uuid,
  required_equipment_id uuid,
  required_checklist_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, sequence),
  unique (id, organization_id),
  constraint os_process_steps_sequence_positive check (sequence > 0),
  constraint os_process_steps_expected_duration_positive check (expected_duration_minutes is null or expected_duration_minutes > 0),
  constraint os_process_steps_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete cascade,
  constraint os_process_steps_required_knowledge_org_fk
    foreign key (required_knowledge_id, organization_id)
    references public.os_canonical_knowledge(id, organization_id)
    on delete set null,
  constraint os_process_steps_required_equipment_org_fk
    foreign key (required_equipment_id, organization_id)
    references public.os_equipment(id, organization_id)
    on delete set null,
  constraint os_process_steps_required_checklist_item_org_fk
    foreign key (required_checklist_item_id, organization_id)
    references public.os_checklist_items(id, organization_id)
    on delete set null
);

create table if not exists public.os_process_dependencies (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null,
  depends_on_process_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, depends_on_process_id),
  unique (id, organization_id),
  constraint os_process_dependencies_no_self_link check (process_id <> depends_on_process_id),
  constraint os_process_dependencies_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete cascade,
  constraint os_process_dependencies_depends_on_process_org_fk
    foreign key (depends_on_process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete cascade
);

create table if not exists public.os_process_inputs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null,
  sequence integer not null default 1,
  title text not null,
  description text,
  knowledge_id uuid,
  checklist_id uuid,
  checklist_item_id uuid,
  equipment_id uuid,
  business_process_id uuid,
  department_id uuid,
  role_id uuid,
  area_id uuid,
  document_type_id uuid,
  tag_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, sequence, title),
  unique (id, organization_id),
  constraint os_process_inputs_sequence_positive check (sequence > 0),
  constraint os_process_inputs_single_reference check (
    num_nonnulls(
      knowledge_id,
      checklist_id,
      checklist_item_id,
      equipment_id,
      business_process_id,
      department_id,
      role_id,
      area_id,
      document_type_id,
      tag_id
    ) = 1
  ),
  constraint os_process_inputs_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete cascade,
  constraint os_process_inputs_knowledge_org_fk
    foreign key (knowledge_id, organization_id)
    references public.os_canonical_knowledge(id, organization_id)
    on delete set null,
  constraint os_process_inputs_checklist_org_fk
    foreign key (checklist_id, organization_id)
    references public.os_checklists(id, organization_id)
    on delete set null,
  constraint os_process_inputs_checklist_item_org_fk
    foreign key (checklist_item_id, organization_id)
    references public.os_checklist_items(id, organization_id)
    on delete set null,
  constraint os_process_inputs_equipment_org_fk
    foreign key (equipment_id, organization_id)
    references public.os_equipment(id, organization_id)
    on delete set null,
  constraint os_process_inputs_business_process_org_fk
    foreign key (business_process_id, organization_id)
    references public.os_business_processes(id, organization_id)
    on delete set null,
  constraint os_process_inputs_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete set null,
  constraint os_process_inputs_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete set null,
  constraint os_process_inputs_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete set null,
  constraint os_process_inputs_document_type_org_fk
    foreign key (document_type_id, organization_id)
    references public.os_document_types(id, organization_id)
    on delete set null,
  constraint os_process_inputs_tag_org_fk
    foreign key (tag_id, organization_id)
    references public.os_tags(id, organization_id)
    on delete set null
);

create table if not exists public.os_process_outputs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null,
  sequence integer not null default 1,
  title text not null,
  description text,
  knowledge_id uuid,
  checklist_id uuid,
  checklist_item_id uuid,
  equipment_id uuid,
  business_process_id uuid,
  department_id uuid,
  role_id uuid,
  area_id uuid,
  document_type_id uuid,
  tag_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (process_id, sequence, title),
  unique (id, organization_id),
  constraint os_process_outputs_sequence_positive check (sequence > 0),
  constraint os_process_outputs_single_reference check (
    num_nonnulls(
      knowledge_id,
      checklist_id,
      checklist_item_id,
      equipment_id,
      business_process_id,
      department_id,
      role_id,
      area_id,
      document_type_id,
      tag_id
    ) = 1
  ),
  constraint os_process_outputs_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete cascade,
  constraint os_process_outputs_knowledge_org_fk
    foreign key (knowledge_id, organization_id)
    references public.os_canonical_knowledge(id, organization_id)
    on delete set null,
  constraint os_process_outputs_checklist_org_fk
    foreign key (checklist_id, organization_id)
    references public.os_checklists(id, organization_id)
    on delete set null,
  constraint os_process_outputs_checklist_item_org_fk
    foreign key (checklist_item_id, organization_id)
    references public.os_checklist_items(id, organization_id)
    on delete set null,
  constraint os_process_outputs_equipment_org_fk
    foreign key (equipment_id, organization_id)
    references public.os_equipment(id, organization_id)
    on delete set null,
  constraint os_process_outputs_business_process_org_fk
    foreign key (business_process_id, organization_id)
    references public.os_business_processes(id, organization_id)
    on delete set null,
  constraint os_process_outputs_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete set null,
  constraint os_process_outputs_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete set null,
  constraint os_process_outputs_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete set null,
  constraint os_process_outputs_document_type_org_fk
    foreign key (document_type_id, organization_id)
    references public.os_document_types(id, organization_id)
    on delete set null,
  constraint os_process_outputs_tag_org_fk
    foreign key (tag_id, organization_id)
    references public.os_tags(id, organization_id)
    on delete set null
);

create index if not exists os_processes_organization_id_idx on public.os_processes (organization_id);
create index if not exists os_processes_department_id_idx on public.os_processes (department_id);
create index if not exists os_processes_owner_role_id_idx on public.os_processes (owner_role_id);
create index if not exists os_processes_area_id_idx on public.os_processes (area_id) where area_id is not null;
create index if not exists os_processes_status_idx on public.os_processes (organization_id, status);
create index if not exists os_processes_trigger_type_idx on public.os_processes (organization_id, trigger_type);
create index if not exists os_processes_active_idx on public.os_processes (organization_id, code) where status = 'active';

create index if not exists os_process_steps_organization_id_idx on public.os_process_steps (organization_id);
create index if not exists os_process_steps_process_id_idx on public.os_process_steps (process_id);
create index if not exists os_process_steps_knowledge_id_idx on public.os_process_steps (required_knowledge_id) where required_knowledge_id is not null;
create index if not exists os_process_steps_equipment_id_idx on public.os_process_steps (required_equipment_id) where required_equipment_id is not null;
create index if not exists os_process_steps_checklist_item_id_idx on public.os_process_steps (required_checklist_item_id) where required_checklist_item_id is not null;

create index if not exists os_process_dependencies_organization_id_idx on public.os_process_dependencies (organization_id);
create index if not exists os_process_dependencies_process_id_idx on public.os_process_dependencies (process_id);
create index if not exists os_process_dependencies_depends_on_process_id_idx on public.os_process_dependencies (depends_on_process_id);

create index if not exists os_process_inputs_organization_id_idx on public.os_process_inputs (organization_id);
create index if not exists os_process_inputs_process_id_idx on public.os_process_inputs (process_id);
create index if not exists os_process_inputs_knowledge_id_idx on public.os_process_inputs (knowledge_id) where knowledge_id is not null;
create index if not exists os_process_inputs_checklist_id_idx on public.os_process_inputs (checklist_id) where checklist_id is not null;
create index if not exists os_process_inputs_checklist_item_id_idx on public.os_process_inputs (checklist_item_id) where checklist_item_id is not null;

create index if not exists os_process_outputs_organization_id_idx on public.os_process_outputs (organization_id);
create index if not exists os_process_outputs_process_id_idx on public.os_process_outputs (process_id);
create index if not exists os_process_outputs_knowledge_id_idx on public.os_process_outputs (knowledge_id) where knowledge_id is not null;
create index if not exists os_process_outputs_checklist_id_idx on public.os_process_outputs (checklist_id) where checklist_id is not null;
create index if not exists os_process_outputs_checklist_item_id_idx on public.os_process_outputs (checklist_item_id) where checklist_item_id is not null;

drop trigger if exists os_process_steps_set_updated_at on public.os_process_steps;
create trigger os_process_steps_set_updated_at
before update on public.os_process_steps
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_process_dependencies_set_updated_at on public.os_process_dependencies;
create trigger os_process_dependencies_set_updated_at
before update on public.os_process_dependencies
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_process_inputs_set_updated_at on public.os_process_inputs;
create trigger os_process_inputs_set_updated_at
before update on public.os_process_inputs
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_process_outputs_set_updated_at on public.os_process_outputs;
create trigger os_process_outputs_set_updated_at
before update on public.os_process_outputs
for each row
execute function public.os_set_updated_at();

alter table public.os_processes enable row level security;
alter table public.os_process_steps enable row level security;
alter table public.os_process_dependencies enable row level security;
alter table public.os_process_inputs enable row level security;
alter table public.os_process_outputs enable row level security;

create or replace view public.os_processes_public as
select
  id,
  organization_id,
  code,
  name,
  description,
  department_id,
  owner_role_id,
  area_id,
  frequency,
  estimated_duration_minutes,
  priority,
  criticality,
  trigger_type,
  status,
  created_at,
  updated_at
from public.os_processes
where status = 'active';

create or replace view public.os_process_steps_public as
select
  step.id,
  step.organization_id,
  step.process_id,
  step.sequence,
  step.title,
  step.description,
  step.expected_duration_minutes,
  step.required_knowledge_id,
  step.required_equipment_id,
  step.required_checklist_item_id,
  step.created_at,
  step.updated_at
from public.os_process_steps step
join public.os_processes process
  on process.id = step.process_id
  and process.organization_id = step.organization_id
where process.status = 'active';

create or replace view public.os_process_dependencies_public as
select
  dependency.id,
  dependency.organization_id,
  dependency.process_id,
  dependency.depends_on_process_id,
  dependency.notes,
  dependency.created_at,
  dependency.updated_at
from public.os_process_dependencies dependency
join public.os_processes process
  on process.id = dependency.process_id
  and process.organization_id = dependency.organization_id
join public.os_processes prerequisite
  on prerequisite.id = dependency.depends_on_process_id
  and prerequisite.organization_id = dependency.organization_id
where process.status = 'active'
  and prerequisite.status = 'active';

create or replace view public.os_process_inputs_public as
select
  input.id,
  input.organization_id,
  input.process_id,
  input.sequence,
  input.title,
  input.description,
  input.knowledge_id,
  input.checklist_id,
  input.checklist_item_id,
  input.equipment_id,
  input.business_process_id,
  input.department_id,
  input.role_id,
  input.area_id,
  input.document_type_id,
  input.tag_id,
  input.notes,
  input.created_at,
  input.updated_at
from public.os_process_inputs input
join public.os_processes process
  on process.id = input.process_id
  and process.organization_id = input.organization_id
where process.status = 'active';

create or replace view public.os_process_outputs_public as
select
  output.id,
  output.organization_id,
  output.process_id,
  output.sequence,
  output.title,
  output.description,
  output.knowledge_id,
  output.checklist_id,
  output.checklist_item_id,
  output.equipment_id,
  output.business_process_id,
  output.department_id,
  output.role_id,
  output.area_id,
  output.document_type_id,
  output.tag_id,
  output.notes,
  output.created_at,
  output.updated_at
from public.os_process_outputs output
join public.os_processes process
  on process.id = output.process_id
  and process.organization_id = output.organization_id
where process.status = 'active';

create or replace view public.os_checklists_public as
select distinct
  checklist.id,
  checklist.organization_id,
  checklist.title,
  checklist.code,
  checklist.status,
  checklist.created_at,
  checklist.updated_at
from public.os_checklists checklist
where checklist.status = 'active'
  and (
    exists (
      select 1
      from public.os_process_steps step
      join public.os_processes process
        on process.id = step.process_id
        and process.organization_id = step.organization_id
      join public.os_checklist_items item
        on item.id = step.required_checklist_item_id
        and item.organization_id = step.organization_id
      where item.checklist_id = checklist.id
        and item.organization_id = checklist.organization_id
        and process.status = 'active'
    )
    or exists (
      select 1
      from public.os_process_inputs input
      join public.os_processes process
        on process.id = input.process_id
        and process.organization_id = input.organization_id
      where input.checklist_id = checklist.id
        and input.organization_id = checklist.organization_id
        and process.status = 'active'
    )
    or exists (
      select 1
      from public.os_process_outputs output
      join public.os_processes process
        on process.id = output.process_id
        and process.organization_id = output.organization_id
      where output.checklist_id = checklist.id
        and output.organization_id = checklist.organization_id
        and process.status = 'active'
    )
  );

create or replace view public.os_checklist_items_public as
select distinct
  item.id,
  item.organization_id,
  item.checklist_id,
  item.position,
  item.prompt,
  item.expected_evidence,
  item.created_at,
  item.updated_at
from public.os_checklist_items item
where exists (
  select 1
  from public.os_process_steps step
  join public.os_processes process
    on process.id = step.process_id
    and process.organization_id = step.organization_id
  where step.required_checklist_item_id = item.id
    and step.organization_id = item.organization_id
    and process.status = 'active'
)
or exists (
  select 1
  from public.os_process_inputs input
  join public.os_processes process
    on process.id = input.process_id
    and process.organization_id = input.organization_id
  where input.checklist_item_id = item.id
    and input.organization_id = item.organization_id
    and process.status = 'active'
)
or exists (
  select 1
  from public.os_process_outputs output
  join public.os_processes process
    on process.id = output.process_id
    and process.organization_id = output.organization_id
  where output.checklist_item_id = item.id
    and output.organization_id = item.organization_id
    and process.status = 'active'
);

grant select on public.os_processes_public to anon, authenticated;
grant select on public.os_process_steps_public to anon, authenticated;
grant select on public.os_process_dependencies_public to anon, authenticated;
grant select on public.os_process_inputs_public to anon, authenticated;
grant select on public.os_process_outputs_public to anon, authenticated;
grant select on public.os_checklists_public to anon, authenticated;
grant select on public.os_checklist_items_public to anon, authenticated;
