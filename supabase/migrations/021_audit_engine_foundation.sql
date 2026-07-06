-- Audit Engine foundation for Delikat OS.
-- This adds a read-only operational audit layer on top of existing checklists,
-- processes, and approved knowledge. It does not generate new SOP content.

create table if not exists public.os_audit_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  department_id uuid,
  role_id uuid,
  area_id uuid,
  process_id uuid,
  checklist_template_id uuid,
  audit_type text not null,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint os_audit_templates_department_org_fk
    foreign key (department_id, organization_id)
    references public.os_departments(id, organization_id)
    on delete set null,
  constraint os_audit_templates_role_org_fk
    foreign key (role_id, organization_id)
    references public.os_roles(id, organization_id)
    on delete set null,
  constraint os_audit_templates_area_org_fk
    foreign key (area_id, organization_id)
    references public.os_areas(id, organization_id)
    on delete set null,
  constraint os_audit_templates_process_org_fk
    foreign key (process_id, organization_id)
    references public.os_processes(id, organization_id)
    on delete set null,
  constraint os_audit_templates_checklist_org_fk
    foreign key (checklist_template_id, organization_id)
    references public.os_checklist_templates(id, organization_id)
    on delete set null
);

create table if not exists public.os_audit_template_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  audit_template_id uuid not null,
  checklist_template_item_id uuid,
  process_step_id uuid,
  required_knowledge_item_id uuid,
  title text not null,
  description text,
  sort_order integer not null,
  evidence_required boolean not null default false,
  scoring_type text not null default 'pass_fail',
  max_score numeric(10,2),
  weight numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_template_id, sort_order),
  unique (id, organization_id),
  constraint os_audit_template_items_sort_order_positive check (sort_order > 0),
  constraint os_audit_template_items_template_org_fk
    foreign key (audit_template_id, organization_id)
    references public.os_audit_templates(id, organization_id)
    on delete cascade,
  constraint os_audit_template_items_checklist_item_org_fk
    foreign key (checklist_template_item_id, organization_id)
    references public.os_checklist_template_items(id, organization_id)
    on delete set null,
  constraint os_audit_template_items_process_step_org_fk
    foreign key (process_step_id, organization_id)
    references public.os_process_steps(id, organization_id)
    on delete set null,
  constraint os_audit_template_items_required_knowledge_org_fk
    foreign key (required_knowledge_item_id, organization_id)
    references public.os_required_knowledge_items(id, organization_id)
    on delete set null
);

create table if not exists public.os_audit_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  audit_template_id uuid not null,
  business_date date not null default current_date,
  location_id uuid,
  status public.os_audit_status not null default 'planned',
  auditor_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  total_score numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_audit_runs_template_org_fk
    foreign key (audit_template_id, organization_id)
    references public.os_audit_templates(id, organization_id)
    on delete cascade,
  constraint os_audit_runs_location_org_fk
    foreign key (location_id, organization_id)
    references public.os_locations(id, organization_id)
    on delete set null,
  constraint os_audit_runs_completed_after_started check (completed_at is null or started_at is null or completed_at >= started_at),
  constraint os_audit_runs_total_score_nonnegative check (total_score is null or total_score >= 0)
);

create table if not exists public.os_audit_run_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  audit_run_id uuid not null,
  audit_template_item_id uuid not null,
  status public.os_result_status not null default 'not_applicable',
  score numeric(10,2),
  notes text,
  evidence_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_run_id, audit_template_item_id),
  unique (id, organization_id),
  constraint os_audit_run_items_run_org_fk
    foreign key (audit_run_id, organization_id)
    references public.os_audit_runs(id, organization_id)
    on delete cascade,
  constraint os_audit_run_items_template_item_org_fk
    foreign key (audit_template_item_id, organization_id)
    references public.os_audit_template_items(id, organization_id)
    on delete cascade,
  constraint os_audit_run_items_completed_after_started check (completed_at is null or completed_at >= created_at)
);

create index if not exists os_audit_templates_status_idx
  on public.os_audit_templates (organization_id, status);

create index if not exists os_audit_templates_process_id_idx
  on public.os_audit_templates (process_id)
  where process_id is not null;

create index if not exists os_audit_templates_checklist_template_id_idx
  on public.os_audit_templates (checklist_template_id)
  where checklist_template_id is not null;

create index if not exists os_audit_template_items_template_id_idx
  on public.os_audit_template_items (audit_template_id);

create index if not exists os_audit_template_items_process_step_id_idx
  on public.os_audit_template_items (process_step_id)
  where process_step_id is not null;

create index if not exists os_audit_template_items_required_knowledge_item_id_idx
  on public.os_audit_template_items (required_knowledge_item_id)
  where required_knowledge_item_id is not null;

create index if not exists os_audit_runs_template_id_idx
  on public.os_audit_runs (audit_template_id);

create index if not exists os_audit_runs_business_date_idx
  on public.os_audit_runs (business_date);

create index if not exists os_audit_runs_status_idx
  on public.os_audit_runs (organization_id, status);

create index if not exists os_audit_run_items_run_id_idx
  on public.os_audit_run_items (audit_run_id);

create index if not exists os_audit_run_items_template_item_id_idx
  on public.os_audit_run_items (audit_template_item_id);

create index if not exists os_audit_run_items_status_idx
  on public.os_audit_run_items (organization_id, status);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_audit_templates_set_updated_at'
  ) then
    create trigger os_audit_templates_set_updated_at
      before update on public.os_audit_templates
      for each row execute function public.os_set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_audit_template_items_set_updated_at'
  ) then
    create trigger os_audit_template_items_set_updated_at
      before update on public.os_audit_template_items
      for each row execute function public.os_set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_audit_runs_set_updated_at'
  ) then
    create trigger os_audit_runs_set_updated_at
      before update on public.os_audit_runs
      for each row execute function public.os_set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'os_audit_run_items_set_updated_at'
  ) then
    create trigger os_audit_run_items_set_updated_at
      before update on public.os_audit_run_items
      for each row execute function public.os_set_updated_at();
  end if;
end;
$$;

alter table public.os_audit_templates enable row level security;
alter table public.os_audit_template_items enable row level security;
alter table public.os_audit_runs enable row level security;
alter table public.os_audit_run_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_templates'
      and policyname = 'os_audit_templates_public_select'
  ) then
    create policy os_audit_templates_public_select
      on public.os_audit_templates
      for select
      to anon, authenticated
      using (status = 'active');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_templates'
      and policyname = 'os_audit_templates_member_write'
  ) then
    create policy os_audit_templates_member_write
      on public.os_audit_templates
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_templates.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_templates.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_template_items'
      and policyname = 'os_audit_template_items_public_select'
  ) then
    create policy os_audit_template_items_public_select
      on public.os_audit_template_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_audit_templates template
          where template.id = os_audit_template_items.audit_template_id
            and template.organization_id = os_audit_template_items.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_template_items'
      and policyname = 'os_audit_template_items_member_write'
  ) then
    create policy os_audit_template_items_member_write
      on public.os_audit_template_items
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_template_items.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_template_items.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_runs'
      and policyname = 'os_audit_runs_public_select'
  ) then
    create policy os_audit_runs_public_select
      on public.os_audit_runs
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_audit_templates template
          where template.id = os_audit_runs.audit_template_id
            and template.organization_id = os_audit_runs.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_runs'
      and policyname = 'os_audit_runs_member_write'
  ) then
    create policy os_audit_runs_member_write
      on public.os_audit_runs
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_runs.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_runs.organization_id
            and m.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_run_items'
      and policyname = 'os_audit_run_items_public_select'
  ) then
    create policy os_audit_run_items_public_select
      on public.os_audit_run_items
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.os_audit_runs run
          join public.os_audit_templates template
            on template.id = run.audit_template_id
           and template.organization_id = run.organization_id
          where run.id = os_audit_run_items.audit_run_id
            and run.organization_id = os_audit_run_items.organization_id
            and template.status = 'active'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'os_audit_run_items'
      and policyname = 'os_audit_run_items_member_write'
  ) then
    create policy os_audit_run_items_member_write
      on public.os_audit_run_items
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_run_items.organization_id
            and m.user_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1
          from public.os_memberships m
          where m.organization_id = os_audit_run_items.organization_id
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
  insert into public.os_audit_templates (
    organization_id,
    code,
    title,
    description,
    department_id,
    role_id,
    area_id,
    process_id,
    checklist_template_id,
    audit_type,
    status
  )
  select
    org.organization_id,
    seed.code,
    seed.title,
    seed.description,
    process.department_id,
    process.owner_role_id,
    process.area_id,
    process.id,
    checklist_template.id,
    seed.audit_type,
    'active'::public.os_record_status
  from org
  join (
    values
      ('opening-readiness-audit', 'Opening Readiness Audit', 'Structural audit scaffold derived from the Daily Opening checklist.', 'opening_readiness', 'daily-opening'),
      ('closing-compliance-audit', 'Closing Compliance Audit', 'Structural audit scaffold derived from the Daily Closing checklist.', 'closing_compliance', 'daily-closing'),
      ('cash-closing-audit', 'Cash Closing Audit', 'Structural audit scaffold derived from the Cash Closing checklist.', 'cash_closing', 'cash-closing'),
      ('service-recovery-audit', 'Service Recovery Audit', 'Structural audit scaffold derived from the Customer Complaint Handling checklist.', 'service_recovery', 'customer-complaint-handling'),
      ('franchise-visit-audit', 'Franchise Visit Audit', 'Structural audit scaffold derived from the Franchise Audit Visit checklist.', 'franchise_visit', 'franchise-audit-visit')
  ) as seed(code, title, description, audit_type, checklist_code) on true
  join public.os_checklist_templates checklist_template
    on checklist_template.organization_id = org.organization_id
   and checklist_template.code = seed.checklist_code
  join public.os_processes process
    on process.organization_id = org.organization_id
   and process.id = checklist_template.process_id
  on conflict (organization_id, code) do update
    set title = excluded.title,
        description = excluded.description,
        department_id = excluded.department_id,
        role_id = excluded.role_id,
        area_id = excluded.area_id,
        process_id = excluded.process_id,
        checklist_template_id = excluded.checklist_template_id,
        audit_type = excluded.audit_type,
        status = excluded.status
  returning id, organization_id, code, checklist_template_id
),
template_item_seed as (
  insert into public.os_audit_template_items (
    organization_id,
    audit_template_id,
    checklist_template_item_id,
    process_step_id,
    required_knowledge_item_id,
    title,
    description,
    sort_order,
    evidence_required,
    scoring_type,
    max_score,
    weight
  )
  select
    template.organization_id,
    template.id,
    checklist_item.id,
    checklist_item.process_step_id,
    checklist_item.required_knowledge_item_id,
    checklist_item.title,
    checklist_item.description,
    checklist_item.sort_order,
    checklist_item.evidence_required,
    'pass_fail',
    1::numeric(10,2),
    1::numeric(10,2)
  from template_seed template
  join public.os_checklist_template_items checklist_item
    on checklist_item.organization_id = template.organization_id
   and checklist_item.checklist_template_id = template.checklist_template_id
  on conflict (audit_template_id, sort_order) do update
    set checklist_template_item_id = excluded.checklist_template_item_id,
        process_step_id = excluded.process_step_id,
        required_knowledge_item_id = excluded.required_knowledge_item_id,
        title = excluded.title,
        description = excluded.description,
        evidence_required = excluded.evidence_required,
        scoring_type = excluded.scoring_type,
        max_score = excluded.max_score,
        weight = excluded.weight
  returning id
)
select 1;

create or replace view public.os_audit_templates_public as
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
  template.checklist_template_id,
  template.audit_type,
  template.status,
  template.created_at,
  template.updated_at,
  coalesce(item_counts.item_count, 0) as item_count,
  coalesce(item_counts.linked_knowledge_count, 0) as linked_knowledge_count,
  coalesce(item_counts.missing_knowledge_count, 0) as missing_knowledge_count,
  coalesce(run_counts.run_count, 0) as run_count,
  run_counts.latest_run_at,
  coalesce(run_counts.open_run_count, 0) as open_run_count
from public.os_audit_templates template
left join lateral (
  select
    count(*)::int as item_count,
    count(*) filter (where item.required_knowledge_item_id is not null)::int as linked_knowledge_count,
    count(*) filter (where item.required_knowledge_item_id is null)::int as missing_knowledge_count
  from public.os_audit_template_items item
  where item.audit_template_id = template.id
    and item.organization_id = template.organization_id
) item_counts on true
left join lateral (
  select
    count(*)::int as run_count,
    max(run.created_at) as latest_run_at,
    count(*) filter (where run.status in ('planned', 'in_progress'))::int as open_run_count
  from public.os_audit_runs run
  where run.audit_template_id = template.id
    and run.organization_id = template.organization_id
) run_counts on true
where template.status = 'active';

create or replace view public.os_audit_template_items_public as
select
  item.id,
  item.organization_id,
  item.audit_template_id,
  item.checklist_template_item_id,
  item.process_step_id,
  item.required_knowledge_item_id,
  item.title,
  item.description,
  item.sort_order,
  item.evidence_required,
  item.scoring_type,
  item.max_score,
  item.weight,
  item.created_at,
  item.updated_at
from public.os_audit_template_items item
join public.os_audit_templates template
  on template.id = item.audit_template_id
 and template.organization_id = item.organization_id
where template.status = 'active';

create or replace view public.os_audit_runs_public as
select
  run.id,
  run.organization_id,
  run.audit_template_id,
  run.business_date,
  run.location_id,
  run.status,
  run.auditor_user_id,
  run.started_at,
  run.completed_at,
  run.total_score,
  run.created_at,
  run.updated_at,
  coalesce(item_counts.item_count, 0) as item_count,
  coalesce(item_counts.completed_count, 0) as completed_count
from public.os_audit_runs run
left join lateral (
  select
    count(*)::int as item_count,
    count(*) filter (where item.completed_at is not null)::int as completed_count
  from public.os_audit_run_items item
  where item.audit_run_id = run.id
    and item.organization_id = run.organization_id
) item_counts on true;

create or replace view public.os_audit_run_items_public as
select
  item.id,
  item.organization_id,
  item.audit_run_id,
  item.audit_template_item_id,
  item.status,
  item.score,
  item.notes,
  item.evidence_url,
  item.completed_at,
  item.created_at,
  item.updated_at,
  template_item.title as audit_template_item_title,
  template_item.sort_order as audit_template_item_sort_order,
  template_item.checklist_template_item_id,
  template_item.process_step_id,
  template_item.required_knowledge_item_id
from public.os_audit_run_items item
join public.os_audit_runs run
  on run.id = item.audit_run_id
 and run.organization_id = item.organization_id
join public.os_audit_templates template
  on template.id = run.audit_template_id
 and template.organization_id = run.organization_id
left join public.os_audit_template_items template_item
  on template_item.id = item.audit_template_item_id
 and template_item.organization_id = item.organization_id
where template.status = 'active';

grant select on public.os_audit_templates_public to anon, authenticated;
grant select on public.os_audit_template_items_public to anon, authenticated;
grant select on public.os_audit_runs_public to anon, authenticated;
grant select on public.os_audit_run_items_public to anon, authenticated;
