-- Checklist Engine foundation for Delikat OS.
-- This extends the existing operational checklist model instead of creating a
-- parallel knowledge layer. No AI, no generated SOP content, and no invented
-- checklist steps are introduced here.

create table if not exists public.os_checklist_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  department_id uuid,
  role_id uuid,
  area_id uuid,
  process_id uuid,
  frequency text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint os_checklist_templates_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete set null,
  constraint os_checklist_templates_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete set null,
  constraint os_checklist_templates_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete set null,
  constraint os_checklist_templates_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete set null
);

create table if not exists public.os_checklist_template_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  checklist_template_id uuid not null,
  process_step_id uuid,
  required_knowledge_item_id uuid,
  title text not null,
  description text,
  sort_order integer not null,
  evidence_required boolean not null default false,
  completion_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_template_id, sort_order),
  unique (id, organization_id),
  constraint os_checklist_template_items_sort_order_positive check (sort_order > 0),
  constraint os_checklist_template_items_template_org_fk
    foreign key (checklist_template_id, organization_id)
    references public.os_checklist_templates(id, organization_id)
    on delete cascade,
  constraint os_checklist_template_items_process_step_org_fk
    foreign key (process_step_id, organization_id)
    references public.os_process_steps(id, organization_id)
    on delete set null,
  constraint os_checklist_template_items_required_knowledge_org_fk
    foreign key (required_knowledge_item_id, organization_id)
    references public.os_required_knowledge_items(id, organization_id)
    on delete set null
);

create table if not exists public.os_checklist_run_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  checklist_run_id uuid not null,
  checklist_template_item_id uuid not null,
  status public.os_result_status not null default 'not_applicable',
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_run_id, checklist_template_item_id),
  unique (id, organization_id),
  constraint os_checklist_run_items_run_org_fk
    foreign key (checklist_run_id, organization_id)
    references public.os_checklist_runs(id, organization_id)
    on delete cascade,
  constraint os_checklist_run_items_template_item_org_fk
    foreign key (checklist_template_item_id, organization_id)
    references public.os_checklist_template_items(id, organization_id)
    on delete cascade,
  constraint os_checklist_run_items_completed_after_started check (
    completed_at is null or completed_at >= created_at
  )
);

alter table public.os_checklist_runs
  add column if not exists checklist_template_id uuid,
  add column if not exists business_date date default current_date,
  add column if not exists assigned_role_id uuid,
  add column if not exists assigned_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_checklist_runs_template_org_fk'
  ) then
    alter table public.os_checklist_runs
      add constraint os_checklist_runs_template_org_fk
      foreign key (checklist_template_id, organization_id)
      references public.os_checklist_templates(id, organization_id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'os_checklist_runs_assigned_role_org_fk'
  ) then
    alter table public.os_checklist_runs
      add constraint os_checklist_runs_assigned_role_org_fk
      foreign key (assigned_role_id, organization_id)
      references public.os_roles(id, organization_id)
      on delete set null;
  end if;
end;
$$;

create index if not exists os_checklist_templates_process_id_idx
  on public.os_checklist_templates (process_id)
  where process_id is not null;

create index if not exists os_checklist_templates_status_idx
  on public.os_checklist_templates (organization_id, status);

create index if not exists os_checklist_template_items_template_id_idx
  on public.os_checklist_template_items (checklist_template_id);

create index if not exists os_checklist_template_items_process_step_id_idx
  on public.os_checklist_template_items (process_step_id)
  where process_step_id is not null;

create index if not exists os_checklist_template_items_required_knowledge_item_id_idx
  on public.os_checklist_template_items (required_knowledge_item_id)
  where required_knowledge_item_id is not null;

create index if not exists os_checklist_runs_template_id_idx
  on public.os_checklist_runs (checklist_template_id)
  where checklist_template_id is not null;

create index if not exists os_checklist_runs_business_date_idx
  on public.os_checklist_runs (business_date)
  where business_date is not null;

create index if not exists os_checklist_runs_assigned_role_id_idx
  on public.os_checklist_runs (assigned_role_id)
  where assigned_role_id is not null;

create index if not exists os_checklist_run_items_run_id_idx
  on public.os_checklist_run_items (checklist_run_id);

create index if not exists os_checklist_run_items_template_item_id_idx
  on public.os_checklist_run_items (checklist_template_item_id);

create index if not exists os_checklist_run_items_status_idx
  on public.os_checklist_run_items (organization_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_checklist_templates_set_updated_at'
  ) then
    create trigger os_checklist_templates_set_updated_at
      before update on public.os_checklist_templates
      for each row execute function public.os_set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_checklist_template_items_set_updated_at'
  ) then
    create trigger os_checklist_template_items_set_updated_at
      before update on public.os_checklist_template_items
      for each row execute function public.os_set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_checklist_run_items_set_updated_at'
  ) then
    create trigger os_checklist_run_items_set_updated_at
      before update on public.os_checklist_run_items
      for each row execute function public.os_set_updated_at();
  end if;
end;
$$;

alter table public.os_checklist_templates enable row level security;
alter table public.os_checklist_template_items enable row level security;
alter table public.os_checklist_run_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_templates'
      and policyname = 'os_checklist_templates_public_select'
  ) then
    create policy os_checklist_templates_public_select
      on public.os_checklist_templates
      for select
      to anon, authenticated
      using (status = 'active');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_templates'
      and policyname = 'os_checklist_templates_member_write'
  ) then
    create policy os_checklist_templates_member_write
      on public.os_checklist_templates
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_templates.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_templates.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_template_items'
      and policyname = 'os_checklist_template_items_public_select'
  ) then
    create policy os_checklist_template_items_public_select
      on public.os_checklist_template_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_checklist_templates template
          where template.id = os_checklist_template_items.checklist_template_id
            and template.organization_id = os_checklist_template_items.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_template_items'
      and policyname = 'os_checklist_template_items_member_write'
  ) then
    create policy os_checklist_template_items_member_write
      on public.os_checklist_template_items
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_template_items.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_template_items.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_runs'
      and policyname = 'os_checklist_runs_public_select'
  ) then
    create policy os_checklist_runs_public_select
      on public.os_checklist_runs
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_checklist_templates template
          where template.id = os_checklist_runs.checklist_template_id
            and template.organization_id = os_checklist_runs.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_runs'
      and policyname = 'os_checklist_runs_member_write'
  ) then
    create policy os_checklist_runs_member_write
      on public.os_checklist_runs
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_runs.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_runs.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_run_items'
      and policyname = 'os_checklist_run_items_public_select'
  ) then
    create policy os_checklist_run_items_public_select
      on public.os_checklist_run_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_checklist_runs run
          join public.os_checklist_templates template
            on template.id = run.checklist_template_id
           and template.organization_id = run.organization_id
          where run.id = os_checklist_run_items.checklist_run_id
            and run.organization_id = os_checklist_run_items.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_checklist_run_items'
      and policyname = 'os_checklist_run_items_member_write'
  ) then
    create policy os_checklist_run_items_member_write
      on public.os_checklist_run_items
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_run_items.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_checklist_run_items.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;
end;
$$;

with org as (
  select '00000000-0000-4000-8000-000000000001'::uuid as organization_id
),
template_seed as (
  insert into public.os_checklist_templates (
    organization_id,
    code,
    title,
    description,
    department_id,
    role_id,
    area_id,
    process_id,
    frequency,
    status
  )
  select
    org.organization_id,
    v.code,
    v.title,
    v.description,
    process.department_id,
    process.owner_role_id,
    process.area_id,
    process.id,
    process.frequency,
    'active'::public.os_record_status
  from org
  join (
    values
      ('daily-opening', 'Daily Opening Checklist', 'Checklist scaffold derived from the Daily Opening process.', 'daily-opening'),
      ('daily-closing', 'Daily Closing Checklist', 'Checklist scaffold derived from the Daily Closing process.', 'daily-closing'),
      ('cash-closing', 'Cash Closing Checklist', 'Checklist scaffold derived from the Cash Closing process.', 'cash-closing'),
      ('customer-complaint-handling', 'Customer Complaint Handling Checklist', 'Checklist scaffold derived from the Customer Complaint Handling process.', 'customer-complaint-handling'),
      ('franchise-audit-visit', 'Franchise Audit Visit Checklist', 'Checklist scaffold derived from the Franchise Audit Visit process.', 'franchise-audit-visit')
  ) as v(code, title, description, process_code) on true
  join public.os_processes process
    on process.organization_id = org.organization_id
   and process.code = v.process_code
  on conflict (organization_id, code) do update
    set title = excluded.title,
        description = excluded.description,
        department_id = excluded.department_id,
        role_id = excluded.role_id,
        area_id = excluded.area_id,
        process_id = excluded.process_id,
        frequency = excluded.frequency,
        status = excluded.status
  returning id, organization_id, code, process_id
),
required_knowledge_lookup as (
  select id, code
  from public.os_required_knowledge_items
  where organization_id = (select organization_id from org)
),
process_step_seed as (
  insert into public.os_checklist_template_items (
    organization_id,
    checklist_template_id,
    process_step_id,
    required_knowledge_item_id,
    title,
    description,
    sort_order,
    evidence_required,
    completion_required
  )
  select
    template.organization_id,
    template.id,
    step.id,
    required_knowledge.id,
    step.title,
    step.description,
    step.sequence,
    false,
    true
  from template_seed template
  join public.os_process_steps step
    on step.organization_id = template.organization_id
   and step.process_id = template.process_id
  left join (
    values
      ('daily-opening', 3, 'opening-checklist'),
      ('daily-closing', 3, 'closing-checklist'),
      ('cash-closing', 2, 'cash-closing-procedure'),
      ('customer-complaint-handling', 2, 'customer-complaint-procedure'),
      ('franchise-audit-visit', 2, 'franchise-audit-procedure')
  ) as v(process_code, sequence, required_knowledge_code)
    on v.process_code = template.code
   and v.sequence = step.sequence
  left join required_knowledge_lookup required_knowledge
    on required_knowledge.code = v.required_knowledge_code
  on conflict (checklist_template_id, sort_order) do update
    set process_step_id = excluded.process_step_id,
        required_knowledge_item_id = excluded.required_knowledge_item_id,
        title = excluded.title,
        description = excluded.description,
        evidence_required = excluded.evidence_required,
        completion_required = excluded.completion_required
  returning id
)
select 1;

create or replace view public.os_checklist_templates_public as
select
  template.id,
  template.organization_id,
  template.code,
  template.title,
  template.description,
  template.department_id,
  template.role_id,
  template.area_id,
  template.process_id,
  template.frequency,
  template.status,
  template.created_at,
  template.updated_at,
  process.code as process_code,
  process.name as process_name,
  coalesce(item_counts.item_count, 0) as item_count,
  coalesce(item_counts.linked_knowledge_count, 0) as linked_knowledge_count,
  coalesce(item_counts.missing_knowledge_count, 0) as missing_knowledge_count,
  coalesce(run_counts.run_count, 0) as run_count,
  run_counts.latest_run_at,
  coalesce(run_counts.open_run_count, 0) as open_run_count
from public.os_checklist_templates template
left join public.os_processes process
  on process.id = template.process_id
 and process.organization_id = template.organization_id
left join lateral (
  select
    count(*)::int as item_count,
    count(*) filter (where item.required_knowledge_item_id is not null)::int as linked_knowledge_count,
    count(*) filter (where item.required_knowledge_item_id is null)::int as missing_knowledge_count
  from public.os_checklist_template_items item
  where item.checklist_template_id = template.id
    and item.organization_id = template.organization_id
) item_counts on true
left join lateral (
  select
    count(*)::int as run_count,
    max(run.created_at) as latest_run_at,
    count(*) filter (where run.status in ('scheduled', 'in_progress'))::int as open_run_count
  from public.os_checklist_runs run
  where run.checklist_template_id = template.id
    and run.organization_id = template.organization_id
) run_counts on true
where template.status = 'active';

create or replace view public.os_checklist_template_items_public as
select
  item.id,
  item.organization_id,
  item.checklist_template_id,
  item.process_step_id,
  item.required_knowledge_item_id,
  item.title,
  item.description,
  item.sort_order,
  item.evidence_required,
  item.completion_required,
  item.created_at,
  item.updated_at,
  step.sequence as process_step_sequence,
  step.title as process_step_title,
  step.description as process_step_description,
  knowledge_item.code as required_knowledge_code,
  knowledge_item.title as required_knowledge_title
from public.os_checklist_template_items item
join public.os_checklist_templates template
  on template.id = item.checklist_template_id
 and template.organization_id = item.organization_id
left join public.os_process_steps step
  on step.id = item.process_step_id
 and step.organization_id = item.organization_id
left join public.os_required_knowledge_items knowledge_item
  on knowledge_item.id = item.required_knowledge_item_id
 and knowledge_item.organization_id = item.organization_id
where template.status = 'active';

create or replace view public.os_checklist_runs_public as
select
  run.id,
  run.organization_id,
  run.checklist_id,
  run.checklist_template_id,
  run.business_date,
  run.assigned_role_id,
  run.assigned_user_id,
  run.location_id,
  run.station_id,
  run.audit_id,
  run.performed_by,
  run.status,
  run.started_at,
  run.completed_at,
  run.created_at,
  run.updated_at,
  template.code as checklist_template_code,
  template.title as checklist_template_title,
  coalesce(item_counts.item_count, 0) as item_count,
  coalesce(item_counts.completed_count, 0) as completed_count
from public.os_checklist_runs run
left join public.os_checklist_templates template
  on template.id = run.checklist_template_id
 and template.organization_id = run.organization_id
left join lateral (
  select
    count(*)::int as item_count,
    count(*) filter (where item.completed_at is not null)::int as completed_count
  from public.os_checklist_run_items item
  where item.checklist_run_id = run.id
    and item.organization_id = run.organization_id
) item_counts on true;

create or replace view public.os_checklist_run_items_public as
select
  item.id,
  item.organization_id,
  item.checklist_run_id,
  item.checklist_template_item_id,
  item.status,
  item.completed_at,
  item.completed_by,
  item.notes,
  item.evidence_url,
  item.created_at,
  item.updated_at,
  template_item.title as checklist_template_item_title,
  template_item.sort_order as checklist_template_item_sort_order,
  template_item.process_step_id,
  template_item.required_knowledge_item_id
from public.os_checklist_run_items item
join public.os_checklist_runs run
  on run.id = item.checklist_run_id
 and run.organization_id = item.organization_id
join public.os_checklist_templates template
  on template.id = run.checklist_template_id
 and template.organization_id = run.organization_id
left join public.os_checklist_template_items template_item
  on template_item.id = item.checklist_template_item_id
 and template_item.organization_id = item.organization_id
where template.status = 'active';

grant select on public.os_checklist_templates_public to anon, authenticated;
grant select on public.os_checklist_template_items_public to anon, authenticated;
grant select on public.os_checklist_runs_public to anon, authenticated;
grant select on public.os_checklist_run_items_public to anon, authenticated;
