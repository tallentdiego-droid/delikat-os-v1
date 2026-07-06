-- Training Engine foundation for Delikat OS.
-- Training is built from existing knowledge, required knowledge items,
-- operations processes, and coverage gaps. No fake training content is added.

alter table public.os_training_paths
  add column if not exists description text,
  add column if not exists department_id uuid,
  add column if not exists area_id uuid,
  add column if not exists source_type text not null default 'starter';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_training_paths_department_org_fk'
  ) then
    alter table public.os_training_paths
      add constraint os_training_paths_department_org_fk
      foreign key (department_id, organization_id)
      references public.os_departments(id, organization_id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_training_paths_area_org_fk'
  ) then
    alter table public.os_training_paths
      add constraint os_training_paths_area_org_fk
      foreign key (area_id, organization_id)
      references public.os_areas(id, organization_id)
      on delete set null;
  end if;
end;
$$;

create index if not exists os_training_paths_department_id_idx on public.os_training_paths (department_id);
create index if not exists os_training_paths_area_id_idx on public.os_training_paths (area_id);
create index if not exists os_training_paths_status_idx on public.os_training_paths (organization_id, status);
create index if not exists os_training_paths_source_type_idx on public.os_training_paths (organization_id, source_type);

create table if not exists public.os_training_path_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  training_path_id uuid not null,
  required_knowledge_item_id uuid not null,
  knowledge_object_id uuid,
  process_id uuid,
  process_step_id uuid,
  sort_order integer not null default 0,
  item_type text not null default 'knowledge',
  completion_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_path_id, required_knowledge_item_id),
  unique (training_path_id, sort_order),
  unique (id, organization_id),
  constraint os_training_path_items_sort_order_positive check (sort_order > 0),
  constraint os_training_path_items_type_check check (item_type in ('knowledge', 'process', 'process_step')),
  constraint os_training_path_items_path_org_fk
    foreign key (training_path_id, organization_id)
    references public.os_training_paths(id, organization_id)
    on delete cascade,
  constraint os_training_path_items_required_item_org_fk
    foreign key (required_knowledge_item_id, organization_id)
    references public.os_required_knowledge_items(id, organization_id)
    on delete restrict,
  constraint os_training_path_items_knowledge_org_fk
    foreign key (knowledge_object_id, organization_id)
    references public.os_canonical_knowledge(id, organization_id)
    on delete set null,
  constraint os_training_path_items_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete set null,
  constraint os_training_path_items_process_step_org_fk
    foreign key (process_step_id, organization_id)
    references public.os_process_steps(id, organization_id)
    on delete set null
);

create table if not exists public.os_training_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  training_path_id uuid not null,
  role_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  status public.os_training_progress_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_path_id, role_id, user_id),
  unique (id, organization_id),
  constraint os_training_assignments_due_after_assigned check (due_at is null or due_at >= assigned_at),
  constraint os_training_assignments_path_org_fk
    foreign key (training_path_id, organization_id)
    references public.os_training_paths(id, organization_id)
    on delete cascade,
  constraint os_training_assignments_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete set null
);

create table if not exists public.os_training_progress (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  assignment_id uuid not null,
  training_path_item_id uuid not null,
  status public.os_training_progress_status not null default 'assigned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, training_path_item_id),
  unique (id, organization_id),
  constraint os_training_progress_completed_after_created check (completed_at is null or completed_at >= created_at),
  constraint os_training_progress_assignment_org_fk
    foreign key (assignment_id, organization_id)
    references public.os_training_assignments(id, organization_id)
    on delete cascade,
  constraint os_training_progress_item_org_fk
    foreign key (training_path_item_id, organization_id)
    references public.os_training_path_items(id, organization_id)
    on delete cascade
);

create index if not exists os_training_path_items_path_idx on public.os_training_path_items (training_path_id);
create index if not exists os_training_path_items_required_item_idx on public.os_training_path_items (required_knowledge_item_id);
create index if not exists os_training_path_items_knowledge_idx on public.os_training_path_items (knowledge_object_id) where knowledge_object_id is not null;
create index if not exists os_training_path_items_process_idx on public.os_training_path_items (process_id) where process_id is not null;
create index if not exists os_training_path_items_process_step_idx on public.os_training_path_items (process_step_id) where process_step_id is not null;
create index if not exists os_training_path_items_sort_order_idx on public.os_training_path_items (training_path_id, sort_order);

create index if not exists os_training_assignments_path_idx on public.os_training_assignments (training_path_id);
create index if not exists os_training_assignments_role_idx on public.os_training_assignments (role_id) where role_id is not null;
create index if not exists os_training_assignments_user_idx on public.os_training_assignments (user_id) where user_id is not null;
create index if not exists os_training_assignments_status_idx on public.os_training_assignments (organization_id, status);
create index if not exists os_training_assignments_due_idx on public.os_training_assignments (organization_id, status, due_at) where status in ('assigned', 'in_progress');

create index if not exists os_training_progress_assignment_idx on public.os_training_progress (assignment_id);
create index if not exists os_training_progress_item_idx on public.os_training_progress (training_path_item_id);
create index if not exists os_training_progress_status_idx on public.os_training_progress (organization_id, status);

drop trigger if exists os_training_path_items_set_updated_at on public.os_training_path_items;
create trigger os_training_path_items_set_updated_at
before update on public.os_training_path_items
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_training_assignments_set_updated_at on public.os_training_assignments;
create trigger os_training_assignments_set_updated_at
before update on public.os_training_assignments
for each row
execute function public.os_set_updated_at();

drop trigger if exists os_training_progress_set_updated_at on public.os_training_progress;
create trigger os_training_progress_set_updated_at
before update on public.os_training_progress
for each row
execute function public.os_set_updated_at();

alter table public.os_training_path_items enable row level security;
alter table public.os_training_assignments enable row level security;
alter table public.os_training_progress enable row level security;

create or replace view public.os_training_paths_public as
select
  id,
  organization_id,
  role_id,
  department_id,
  area_id,
  title,
  description,
  code,
  status,
  source_type,
  created_at,
  updated_at
from public.os_training_paths
where status = 'active';

create or replace view public.os_training_path_items_public as
select
  item.id,
  item.organization_id,
  item.training_path_id,
  item.required_knowledge_item_id,
  item.knowledge_object_id,
  item.process_id,
  item.process_step_id,
  item.sort_order,
  item.item_type,
  item.completion_required,
  item.created_at,
  item.updated_at
from public.os_training_path_items item
join public.os_training_paths path
  on path.id = item.training_path_id
  and path.organization_id = item.organization_id
where path.status = 'active';

create or replace view public.os_training_assignments_public as
select
  assignment.id,
  assignment.organization_id,
  assignment.training_path_id,
  assignment.role_id,
  assignment.status,
  assignment.assigned_at,
  assignment.due_at,
  assignment.created_at,
  assignment.updated_at
from public.os_training_assignments assignment
join public.os_training_paths path
  on path.id = assignment.training_path_id
  and path.organization_id = assignment.organization_id
where path.status = 'active';

create or replace view public.os_training_progress_public as
select
  progress.id,
  progress.organization_id,
  progress.assignment_id,
  progress.training_path_item_id,
  progress.status,
  progress.completed_at,
  progress.created_at,
  progress.updated_at
from public.os_training_progress progress;

grant select on public.os_training_paths_public to anon, authenticated;
grant select on public.os_training_path_items_public to anon, authenticated;
grant select on public.os_training_assignments_public to anon, authenticated;
grant select on public.os_training_progress_public to anon, authenticated;

drop policy if exists os_training_path_items_member_select on public.os_training_path_items;
create policy os_training_path_items_member_select on public.os_training_path_items
for select
to authenticated
using (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_path_items.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists os_training_path_items_trainer_write on public.os_training_path_items;
create policy os_training_path_items_trainer_write on public.os_training_path_items
for all
to authenticated
using (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_path_items.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_path_items.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
);

drop policy if exists os_training_assignments_member_select on public.os_training_assignments;
create policy os_training_assignments_member_select on public.os_training_assignments
for select
to authenticated
using (
  role_id is null
  or exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_assignments.organization_id
      and m.user_id = (select auth.uid())
  )
  or user_id = (select auth.uid())
);

drop policy if exists os_training_assignments_trainer_write on public.os_training_assignments;
create policy os_training_assignments_trainer_write on public.os_training_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_assignments.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_assignments.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
);

drop policy if exists os_training_progress_member_select on public.os_training_progress;
create policy os_training_progress_member_select on public.os_training_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_progress.organization_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists os_training_progress_trainer_write on public.os_training_progress;
create policy os_training_progress_trainer_write on public.os_training_progress
for all
to authenticated
using (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_progress.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
)
with check (
  exists (
    select 1
    from public.os_memberships m
    where m.organization_id = os_training_progress.organization_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'manager', 'trainer')
  )
);

with org as (
  select '00000000-0000-4000-8000-000000000001'::uuid as organization_id
),
role_seed as (
  select id, code, name
  from public.os_roles
  where organization_id = (select organization_id from org)
),
department_seed as (
  select id, code, name
  from public.os_departments
  where organization_id = (select organization_id from org)
),
area_seed as (
  select id, code, name
  from public.os_areas
  where organization_id = (select organization_id from org)
),
required_item_lookup as (
  select id, code, title
  from public.os_required_knowledge_items
  where organization_id = (select organization_id from org)
    and code in (
      'opening-checklist',
      'closing-checklist',
      'cleaning-and-sanitation-sop',
      'receiving-procedure',
      'inventory-count-procedure',
      'cash-closing-procedure',
      'pos-use-procedure',
      'customer-complaint-procedure',
      'staff-onboarding-procedure',
      'recipe-documentation-standard',
      'franchise-audit-procedure',
      'marketing-approval-policy',
      'financial-reporting-procedure',
      'equipment-maintenance-procedure',
      'food-safety-policy'
    )
),
knowledge_lookup as (
  select id, title
  from public.os_canonical_knowledge
  where title in (
    'Opening Checklists',
    'Closing Standards',
    'M4-003 --- Cleaning, Sanitation and Operational Controls',
    'Receiving',
    'Inventory Records',
    'Cash Closing Process',
    'POS Platform',
    'Complaint Handling',
    'Initial Training',
    'Recipe Documentation',
    'Franchise Supervision Checklist',
    'M7-001 --- Marketing and Advertising Governance',
    'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight',
    'M3-005 --- Equipment, Inventory and Store Readiness',
    'Food Safety',
    'Service Standards'
  )
),
process_lookup as (
  select id, code, name, area_id, department_id, owner_role_id
  from public.os_processes
  where organization_id = (select organization_id from org)
    and code in (
      'daily-opening',
      'daily-closing',
      'receiving-goods',
      'inventory-count',
      'service-shift-execution',
      'cash-closing',
      'customer-complaint-handling',
      'franchise-audit-visit'
    )
),
process_step_lookup as (
  select
    step.id,
    process.code as process_code,
    step.sequence,
    step.title
  from public.os_process_steps step
  join public.os_processes process
    on process.id = step.process_id
    and process.organization_id = step.organization_id
  where process.organization_id = (select organization_id from org)
),
path_seed as (
  insert into public.os_training_paths (
    organization_id,
    code,
    title,
    description,
    department_id,
    role_id,
    area_id,
    status,
    source_type
  )
  select
    org.organization_id,
    v.code,
    v.title,
    v.description,
    d.id,
    r.id,
    a.id,
    'active'::public.os_record_status,
    'starter'
  from org
  cross join (
    values
      ('waiter-mesero-onboarding', 'Waiter / Mesero onboarding path', 'Starter path for guest-facing service readiness.', 'service', 'waiter', 'dining-room'),
      ('cashier-caja-onboarding', 'Cashier / Caja onboarding path', 'Starter path for register handling and cash control.', 'finance', 'cashier', 'cashier-station'),
      ('kitchen-cocina-onboarding', 'Kitchen / Cocina onboarding path', 'Starter path for prep, food safety, and kitchen readiness.', 'kitchen', 'line-cook', 'kitchen-line'),
      ('bar-onboarding', 'Bar onboarding path', 'Starter path for beverage service readiness.', 'bar', 'bartender', 'bar'),
      ('supervisor-onboarding', 'Supervisor onboarding path', 'Starter path for shift leadership and oversight.', 'management', 'operations-manager', 'office')
  ) as v(code, title, description, department_code, role_code, area_code)
  left join department_seed d on d.code = v.department_code
  left join role_seed r on r.code = v.role_code
  left join area_seed a on a.code = v.area_code
  on conflict (organization_id, code) do update
    set title = excluded.title,
        description = excluded.description,
        department_id = excluded.department_id,
        role_id = excluded.role_id,
        area_id = excluded.area_id,
        status = excluded.status,
        source_type = excluded.source_type
  returning id, organization_id, code
),
training_path_item_cleanup as (
  delete from public.os_training_path_items item
  using path_seed p
  where item.training_path_id = p.id
  returning item.id
),
training_path_item_seed as (
  insert into public.os_training_path_items (
    organization_id,
    training_path_id,
    required_knowledge_item_id,
    knowledge_object_id,
    process_id,
    process_step_id,
    sort_order,
    item_type,
    completion_required
  )
  select
    org.organization_id,
    p.id,
    req.id,
    ko.id,
    proc.id,
    step.id,
    v.sort_order,
    v.item_type,
    true
  from org
  cross join (
    values
      ('waiter-mesero-onboarding', 'opening-checklist', 1, 'process_step', 'Opening Checklists', 'daily-opening', 1),
      ('waiter-mesero-onboarding', 'food-safety-policy', 2, 'knowledge', 'Food Safety', null::text, null::int),
      ('waiter-mesero-onboarding', 'customer-complaint-procedure', 3, 'process_step', 'Complaint Handling', 'customer-complaint-handling', 1),
      ('waiter-mesero-onboarding', 'closing-checklist', 4, 'process_step', 'Closing Standards', 'daily-closing', 1),

      ('cashier-caja-onboarding', 'opening-checklist', 1, 'process_step', 'Opening Checklists', 'daily-opening', 1),
      ('cashier-caja-onboarding', 'pos-use-procedure', 2, 'knowledge', 'POS Platform', null::text, null::int),
      ('cashier-caja-onboarding', 'cash-closing-procedure', 3, 'process_step', 'Cash Closing Process', 'cash-closing', 1),
      ('cashier-caja-onboarding', 'closing-checklist', 4, 'process_step', 'Closing Standards', 'daily-closing', 1),
      ('cashier-caja-onboarding', 'financial-reporting-procedure', 5, 'knowledge', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight', null::text, null::int),

      ('kitchen-cocina-onboarding', 'food-safety-policy', 1, 'knowledge', 'Food Safety', null::text, null::int),
      ('kitchen-cocina-onboarding', 'cleaning-and-sanitation-sop', 2, 'knowledge', 'M4-003 --- Cleaning, Sanitation and Operational Controls', null::text, null::int),
      ('kitchen-cocina-onboarding', 'receiving-procedure', 3, 'process_step', 'Receiving', 'receiving-goods', 1),
      ('kitchen-cocina-onboarding', 'inventory-count-procedure', 4, 'process_step', 'Inventory Records', 'inventory-count', 1),
      ('kitchen-cocina-onboarding', 'recipe-documentation-standard', 5, 'knowledge', 'Recipe Documentation', null::text, null::int),
      ('kitchen-cocina-onboarding', 'equipment-maintenance-procedure', 6, 'knowledge', 'M3-005 --- Equipment, Inventory and Store Readiness', null::text, null::int),

      ('bar-onboarding', 'opening-checklist', 1, 'process_step', 'Opening Checklists', 'daily-opening', 1),
      ('bar-onboarding', 'pos-use-procedure', 2, 'knowledge', 'POS Platform', null::text, null::int),
      ('bar-onboarding', 'cash-closing-procedure', 3, 'process_step', 'Cash Closing Process', 'cash-closing', 1),
      ('bar-onboarding', 'inventory-count-procedure', 4, 'process_step', 'Inventory Records', 'inventory-count', 1),
      ('bar-onboarding', 'food-safety-policy', 5, 'knowledge', 'Food Safety', null::text, null::int),

      ('supervisor-onboarding', 'opening-checklist', 1, 'process_step', 'Opening Checklists', 'daily-opening', 1),
      ('supervisor-onboarding', 'closing-checklist', 2, 'process_step', 'Closing Standards', 'daily-closing', 1),
      ('supervisor-onboarding', 'customer-complaint-procedure', 3, 'process_step', 'Complaint Handling', 'customer-complaint-handling', 1),
      ('supervisor-onboarding', 'franchise-audit-procedure', 4, 'process_step', 'Franchise Supervision Checklist', 'franchise-audit-visit', 2),
      ('supervisor-onboarding', 'marketing-approval-policy', 5, 'knowledge', 'M7-001 --- Marketing and Advertising Governance', null::text, null::int),
      ('supervisor-onboarding', 'financial-reporting-procedure', 6, 'knowledge', 'M9-001_Control_Management_Financial_Reporting_and_Franchise_Oversight', null::text, null::int)
  ) as v(path_code, required_item_code, sort_order, item_type, knowledge_title, process_code, process_step_sequence)
  join path_seed p on p.code = v.path_code
  join required_item_lookup req on req.code = v.required_item_code
  left join knowledge_lookup ko on ko.title = v.knowledge_title
  left join process_lookup proc on proc.code = v.process_code
  left join process_step_lookup step
    on step.process_code = v.process_code
    and step.sequence = v.process_step_sequence
  returning id
)
select 1;
