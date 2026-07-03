create type public.os_execution_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.os_result_status as enum ('pass', 'fail', 'not_applicable', 'blocked');
create type public.os_training_progress_status as enum ('assigned', 'in_progress', 'completed', 'expired', 'cancelled');

alter type public.os_operational_object_type add value if not exists 'station_role_assignment';
alter type public.os_operational_object_type add value if not exists 'process_role_assignment';
alter type public.os_operational_object_type add value if not exists 'sop_role_assignment';
alter type public.os_operational_object_type add value if not exists 'checklist_run';
alter type public.os_operational_object_type add value if not exists 'checklist_item_result';
alter type public.os_operational_object_type add value if not exists 'training_enrollment';
alter type public.os_operational_object_type add value if not exists 'lesson_completion';
alter type public.os_operational_object_type add value if not exists 'quiz_attempt';
alter type public.os_operational_object_type add value if not exists 'ai_agent_knowledge_scope';

alter table public.os_departments
  add constraint os_departments_location_org_fk
  foreign key (location_id, organization_id)
  references public.os_locations(id, organization_id);

alter table public.os_stations
  add constraint os_stations_location_org_fk
  foreign key (location_id, organization_id)
  references public.os_locations(id, organization_id);

alter table public.os_stations
  add constraint os_stations_department_org_fk
  foreign key (department_id, organization_id)
  references public.os_departments(id, organization_id);

alter table public.os_processes
  add constraint os_processes_department_org_fk
  foreign key (department_id, organization_id)
  references public.os_departments(id, organization_id);

alter table public.os_processes
  add constraint os_processes_owner_role_org_fk
  foreign key (owner_role_id, organization_id)
  references public.os_roles(id, organization_id);

alter table public.os_sops
  add constraint os_sops_canonical_knowledge_org_fk
  foreign key (canonical_knowledge_id, organization_id)
  references public.os_canonical_knowledge(id, organization_id);

alter table public.os_sops
  add constraint os_sops_owner_role_org_fk
  foreign key (owner_role_id, organization_id)
  references public.os_roles(id, organization_id);

alter table public.os_checklists
  add constraint os_checklists_process_org_fk
  foreign key (process_id, organization_id)
  references public.os_processes(id, organization_id);

alter table public.os_checklists
  add constraint os_checklists_sop_org_fk
  foreign key (sop_id, organization_id)
  references public.os_sops(id, organization_id);

alter table public.os_checklists
  add constraint os_checklists_station_org_fk
  foreign key (station_id, organization_id)
  references public.os_stations(id, organization_id);

alter table public.os_lessons
  add constraint os_lessons_canonical_knowledge_org_fk
  foreign key (canonical_knowledge_id, organization_id)
  references public.os_canonical_knowledge(id, organization_id);

alter table public.os_training_paths
  add constraint os_training_paths_role_org_fk
  foreign key (role_id, organization_id)
  references public.os_roles(id, organization_id);

alter table public.os_certifications
  add constraint os_certifications_role_org_fk
  foreign key (role_id, organization_id)
  references public.os_roles(id, organization_id);

alter table public.os_certifications
  add constraint os_certifications_training_path_org_fk
  foreign key (training_path_id, organization_id)
  references public.os_training_paths(id, organization_id);

alter table public.os_audits
  add constraint os_audits_location_org_fk
  foreign key (location_id, organization_id)
  references public.os_locations(id, organization_id);

alter table public.os_audits
  add constraint os_audits_checklist_org_fk
  foreign key (checklist_id, organization_id)
  references public.os_checklists(id, organization_id);

alter table public.os_audit_findings
  add constraint os_audit_findings_checklist_item_org_fk
  foreign key (checklist_item_id, organization_id)
  references public.os_checklist_items(id, organization_id);

alter table public.os_incidents
  add constraint os_incidents_location_org_fk
  foreign key (location_id, organization_id)
  references public.os_locations(id, organization_id);

alter table public.os_incidents
  add constraint os_incidents_station_org_fk
  foreign key (station_id, organization_id)
  references public.os_stations(id, organization_id);

alter table public.os_incidents
  add constraint os_incidents_process_org_fk
  foreign key (process_id, organization_id)
  references public.os_processes(id, organization_id);

create table public.os_station_role_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  station_id uuid not null references public.os_stations(id) on delete cascade,
  role_id uuid not null references public.os_roles(id) on delete cascade,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, station_id, role_id),
  unique (id, organization_id),
  constraint os_station_role_assignments_station_org_fk foreign key (station_id, organization_id) references public.os_stations(id, organization_id) on delete cascade,
  constraint os_station_role_assignments_role_org_fk foreign key (role_id, organization_id) references public.os_roles(id, organization_id) on delete cascade
);

create table public.os_process_role_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null references public.os_processes(id) on delete cascade,
  role_id uuid not null references public.os_roles(id) on delete cascade,
  responsibility text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, process_id, role_id),
  unique (id, organization_id),
  constraint os_process_role_assignments_process_org_fk foreign key (process_id, organization_id) references public.os_processes(id, organization_id) on delete cascade,
  constraint os_process_role_assignments_role_org_fk foreign key (role_id, organization_id) references public.os_roles(id, organization_id) on delete cascade
);

create table public.os_sop_role_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  sop_id uuid not null references public.os_sops(id) on delete cascade,
  role_id uuid not null references public.os_roles(id) on delete cascade,
  responsibility text,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sop_id, role_id),
  unique (id, organization_id),
  constraint os_sop_role_assignments_sop_org_fk foreign key (sop_id, organization_id) references public.os_sops(id, organization_id) on delete cascade,
  constraint os_sop_role_assignments_role_org_fk foreign key (role_id, organization_id) references public.os_roles(id, organization_id) on delete cascade
);

create table public.os_checklist_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  checklist_id uuid not null references public.os_checklists(id) on delete restrict,
  location_id uuid references public.os_locations(id),
  station_id uuid references public.os_stations(id),
  audit_id uuid references public.os_audits(id),
  performed_by uuid references auth.users(id) on delete set null,
  status public.os_execution_status not null default 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_checklist_runs_checklist_org_fk foreign key (checklist_id, organization_id) references public.os_checklists(id, organization_id),
  constraint os_checklist_runs_location_org_fk foreign key (location_id, organization_id) references public.os_locations(id, organization_id),
  constraint os_checklist_runs_station_org_fk foreign key (station_id, organization_id) references public.os_stations(id, organization_id),
  constraint os_checklist_runs_audit_org_fk foreign key (audit_id, organization_id) references public.os_audits(id, organization_id),
  constraint os_checklist_runs_completed_after_started check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.os_checklist_item_results (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  checklist_run_id uuid not null references public.os_checklist_runs(id) on delete cascade,
  checklist_item_id uuid not null references public.os_checklist_items(id) on delete restrict,
  result public.os_result_status not null,
  note text,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_run_id, checklist_item_id),
  unique (id, organization_id),
  constraint os_checklist_item_results_run_org_fk foreign key (checklist_run_id, organization_id) references public.os_checklist_runs(id, organization_id) on delete cascade,
  constraint os_checklist_item_results_item_org_fk foreign key (checklist_item_id, organization_id) references public.os_checklist_items(id, organization_id)
);

create table public.os_training_enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  training_path_id uuid not null references public.os_training_paths(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  status public.os_training_progress_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, training_path_id, user_id),
  unique (id, organization_id),
  constraint os_training_enrollments_training_path_org_fk foreign key (training_path_id, organization_id) references public.os_training_paths(id, organization_id),
  constraint os_training_enrollments_completed_after_assigned check (completed_at is null or completed_at >= assigned_at)
);

create table public.os_lesson_completions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  training_enrollment_id uuid not null references public.os_training_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.os_lessons(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  status public.os_training_progress_status not null default 'assigned',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_enrollment_id, lesson_id),
  unique (id, organization_id),
  constraint os_lesson_completions_enrollment_org_fk foreign key (training_enrollment_id, organization_id) references public.os_training_enrollments(id, organization_id) on delete cascade,
  constraint os_lesson_completions_lesson_org_fk foreign key (lesson_id, organization_id) references public.os_lessons(id, organization_id),
  constraint os_lesson_completions_completed_after_started check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.os_quiz_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  quiz_id uuid not null references public.os_quizzes(id) on delete restrict,
  lesson_completion_id uuid references public.os_lesson_completions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  score_percent integer,
  passed boolean,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_quiz_attempts_quiz_org_fk foreign key (quiz_id, organization_id) references public.os_quizzes(id, organization_id),
  constraint os_quiz_attempts_lesson_completion_org_fk foreign key (lesson_completion_id, organization_id) references public.os_lesson_completions(id, organization_id) on delete cascade,
  constraint os_quiz_attempts_score_range check (score_percent is null or score_percent between 0 and 100)
);

create table public.os_ai_agent_knowledge_scopes (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  ai_agent_id uuid not null references public.os_ai_agents(id) on delete cascade,
  canonical_knowledge_id uuid not null references public.os_canonical_knowledge(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ai_agent_id, canonical_knowledge_id),
  unique (id, organization_id),
  constraint os_ai_agent_knowledge_scopes_agent_org_fk foreign key (ai_agent_id, organization_id) references public.os_ai_agents(id, organization_id) on delete cascade,
  constraint os_ai_agent_knowledge_scopes_knowledge_org_fk foreign key (canonical_knowledge_id, organization_id) references public.os_canonical_knowledge(id, organization_id) on delete cascade
);

create index os_station_role_assignments_organization_id_idx on public.os_station_role_assignments (organization_id);
create index os_station_role_assignments_station_id_idx on public.os_station_role_assignments (station_id);
create index os_station_role_assignments_role_id_idx on public.os_station_role_assignments (role_id);
create index os_process_role_assignments_organization_id_idx on public.os_process_role_assignments (organization_id);
create index os_process_role_assignments_process_id_idx on public.os_process_role_assignments (process_id);
create index os_process_role_assignments_role_id_idx on public.os_process_role_assignments (role_id);
create index os_sop_role_assignments_organization_id_idx on public.os_sop_role_assignments (organization_id);
create index os_sop_role_assignments_sop_id_idx on public.os_sop_role_assignments (sop_id);
create index os_sop_role_assignments_role_id_idx on public.os_sop_role_assignments (role_id);
create index os_checklist_runs_organization_id_idx on public.os_checklist_runs (organization_id);
create index os_checklist_runs_checklist_id_idx on public.os_checklist_runs (checklist_id);
create index os_checklist_runs_location_id_idx on public.os_checklist_runs (location_id);
create index os_checklist_runs_station_id_idx on public.os_checklist_runs (station_id);
create index os_checklist_runs_audit_id_idx on public.os_checklist_runs (audit_id);
create index os_checklist_runs_open_idx on public.os_checklist_runs (organization_id, status, created_at desc) where status in ('scheduled', 'in_progress');
create index os_checklist_item_results_organization_id_idx on public.os_checklist_item_results (organization_id);
create index os_checklist_item_results_run_id_idx on public.os_checklist_item_results (checklist_run_id);
create index os_checklist_item_results_item_id_idx on public.os_checklist_item_results (checklist_item_id);
create index os_training_enrollments_organization_id_idx on public.os_training_enrollments (organization_id);
create index os_training_enrollments_training_path_id_idx on public.os_training_enrollments (training_path_id);
create index os_training_enrollments_user_id_idx on public.os_training_enrollments (user_id);
create index os_training_enrollments_open_idx on public.os_training_enrollments (organization_id, status, due_at) where status in ('assigned', 'in_progress');
create index os_lesson_completions_organization_id_idx on public.os_lesson_completions (organization_id);
create index os_lesson_completions_enrollment_id_idx on public.os_lesson_completions (training_enrollment_id);
create index os_lesson_completions_lesson_id_idx on public.os_lesson_completions (lesson_id);
create index os_lesson_completions_user_id_idx on public.os_lesson_completions (user_id);
create index os_quiz_attempts_organization_id_idx on public.os_quiz_attempts (organization_id);
create index os_quiz_attempts_quiz_id_idx on public.os_quiz_attempts (quiz_id);
create index os_quiz_attempts_lesson_completion_id_idx on public.os_quiz_attempts (lesson_completion_id);
create index os_quiz_attempts_user_id_idx on public.os_quiz_attempts (user_id);
create index os_ai_agent_knowledge_scopes_organization_id_idx on public.os_ai_agent_knowledge_scopes (organization_id);
create index os_ai_agent_knowledge_scopes_agent_id_idx on public.os_ai_agent_knowledge_scopes (ai_agent_id);
create index os_ai_agent_knowledge_scopes_knowledge_id_idx on public.os_ai_agent_knowledge_scopes (canonical_knowledge_id);
create index os_approvals_organization_object_idx on public.os_approvals (organization_id, object_type, object_id);
create index os_evidence_links_organization_object_idx on public.os_evidence_links (organization_id, object_type, object_id);

create trigger os_station_role_assignments_set_updated_at before update on public.os_station_role_assignments for each row execute function public.os_set_updated_at();
create trigger os_process_role_assignments_set_updated_at before update on public.os_process_role_assignments for each row execute function public.os_set_updated_at();
create trigger os_sop_role_assignments_set_updated_at before update on public.os_sop_role_assignments for each row execute function public.os_set_updated_at();
create trigger os_checklist_runs_set_updated_at before update on public.os_checklist_runs for each row execute function public.os_set_updated_at();
create trigger os_checklist_item_results_set_updated_at before update on public.os_checklist_item_results for each row execute function public.os_set_updated_at();
create trigger os_training_enrollments_set_updated_at before update on public.os_training_enrollments for each row execute function public.os_set_updated_at();
create trigger os_lesson_completions_set_updated_at before update on public.os_lesson_completions for each row execute function public.os_set_updated_at();
create trigger os_quiz_attempts_set_updated_at before update on public.os_quiz_attempts for each row execute function public.os_set_updated_at();
create trigger os_ai_agent_knowledge_scopes_set_updated_at before update on public.os_ai_agent_knowledge_scopes for each row execute function public.os_set_updated_at();

alter table public.os_station_role_assignments enable row level security;
alter table public.os_process_role_assignments enable row level security;
alter table public.os_sop_role_assignments enable row level security;
alter table public.os_checklist_runs enable row level security;
alter table public.os_checklist_item_results enable row level security;
alter table public.os_training_enrollments enable row level security;
alter table public.os_lesson_completions enable row level security;
alter table public.os_quiz_attempts enable row level security;
alter table public.os_ai_agent_knowledge_scopes enable row level security;

create policy os_station_role_assignments_member_select on public.os_station_role_assignments for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_station_role_assignments.organization_id and m.user_id = (select auth.uid())));
create policy os_station_role_assignments_manager_write on public.os_station_role_assignments for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_station_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager'))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_station_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager')));

create policy os_process_role_assignments_member_select on public.os_process_role_assignments for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_process_role_assignments.organization_id and m.user_id = (select auth.uid())));
create policy os_process_role_assignments_manager_write on public.os_process_role_assignments for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_process_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager'))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_process_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager')));

create policy os_sop_role_assignments_member_select on public.os_sop_role_assignments for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_sop_role_assignments.organization_id and m.user_id = (select auth.uid())));
create policy os_sop_role_assignments_manager_write on public.os_sop_role_assignments for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_sop_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer'))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_sop_role_assignments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer')));

create policy os_checklist_runs_member_select on public.os_checklist_runs for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_runs.organization_id and m.user_id = (select auth.uid())));
create policy os_checklist_runs_member_write on public.os_checklist_runs for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_runs.organization_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_runs.organization_id and m.user_id = (select auth.uid())));

create policy os_checklist_item_results_member_select on public.os_checklist_item_results for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_item_results.organization_id and m.user_id = (select auth.uid())));
create policy os_checklist_item_results_member_write on public.os_checklist_item_results for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_item_results.organization_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_checklist_item_results.organization_id and m.user_id = (select auth.uid())));

create policy os_training_enrollments_member_select on public.os_training_enrollments for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.os_memberships m where m.organization_id = os_training_enrollments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer', 'auditor')));
create policy os_training_enrollments_trainer_write on public.os_training_enrollments for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_training_enrollments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer'))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_training_enrollments.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer')));

create policy os_lesson_completions_member_select on public.os_lesson_completions for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.os_memberships m where m.organization_id = os_lesson_completions.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer', 'auditor')));
create policy os_lesson_completions_member_write on public.os_lesson_completions for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_lesson_completions.organization_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_lesson_completions.organization_id and m.user_id = (select auth.uid())));

create policy os_quiz_attempts_member_select on public.os_quiz_attempts for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.os_memberships m where m.organization_id = os_quiz_attempts.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager', 'trainer', 'auditor')));
create policy os_quiz_attempts_member_write on public.os_quiz_attempts for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_quiz_attempts.organization_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_quiz_attempts.organization_id and m.user_id = (select auth.uid())));

create policy os_ai_agent_knowledge_scopes_member_select on public.os_ai_agent_knowledge_scopes for select to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_ai_agent_knowledge_scopes.organization_id and m.user_id = (select auth.uid())));
create policy os_ai_agent_knowledge_scopes_admin_write on public.os_ai_agent_knowledge_scopes for all to authenticated using (exists (select 1 from public.os_memberships m where m.organization_id = os_ai_agent_knowledge_scopes.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin'))) with check (exists (select 1 from public.os_memberships m where m.organization_id = os_ai_agent_knowledge_scopes.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));
