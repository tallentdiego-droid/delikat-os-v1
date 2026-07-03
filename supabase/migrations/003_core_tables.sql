create table public.os_organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint os_organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.os_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.os_membership_role not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.os_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  status public.os_record_status not null default 'active',
  address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_departments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  location_id uuid references public.os_locations(id) on delete cascade,
  name text not null,
  code text not null,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_stations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  location_id uuid not null references public.os_locations(id) on delete cascade,
  department_id uuid references public.os_departments(id) on delete set null,
  name text not null,
  code text not null,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_id, code),
  unique (id, organization_id)
);

create table public.os_roles (
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

create table public.os_processes (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  department_id uuid references public.os_departments(id) on delete set null,
  owner_role_id uuid references public.os_roles(id) on delete set null,
  name text not null,
  code text not null,
  purpose text,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_source_manuals (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  title text not null,
  manual_type public.os_source_manual_type not null default 'manual',
  source_uri text,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, content_hash),
  unique (id, organization_id)
);

create table public.os_source_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  manual_id uuid not null,
  section_key text not null,
  heading text not null,
  body text not null,
  content_hash text not null,
  page_start integer,
  page_end integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manual_id, section_key),
  unique (organization_id, content_hash),
  unique (id, organization_id),
  constraint os_source_sections_manual_org_fk foreign key (manual_id, organization_id) references public.os_source_manuals(id, organization_id) on delete cascade,
  constraint os_source_sections_page_range check (page_start is null or page_end is null or page_end >= page_start)
);

create table public.os_canonical_knowledge (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  status public.os_record_status not null default 'draft',
  current_approved_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create table public.os_knowledge_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  knowledge_id uuid not null,
  version_number integer not null,
  body text not null,
  status public.os_knowledge_version_status not null default 'draft',
  authored_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (knowledge_id, version_number),
  unique (id, organization_id),
  constraint os_knowledge_versions_knowledge_org_fk foreign key (knowledge_id, organization_id) references public.os_canonical_knowledge(id, organization_id) on delete cascade,
  constraint os_knowledge_versions_approval_consistency check ((status = 'approved' and approved_at is not null) or status <> 'approved')
);

create table public.os_sops (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid not null references public.os_processes(id) on delete cascade,
  canonical_knowledge_id uuid references public.os_canonical_knowledge(id) on delete set null,
  owner_role_id uuid references public.os_roles(id) on delete set null,
  title text not null,
  code text not null,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_checklists (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  process_id uuid references public.os_processes(id) on delete cascade,
  sop_id uuid references public.os_sops(id) on delete set null,
  station_id uuid references public.os_stations(id) on delete set null,
  title text not null,
  code text not null,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_checklist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  checklist_id uuid not null references public.os_checklists(id) on delete cascade,
  position integer not null,
  prompt text not null,
  is_required boolean not null default true,
  expected_evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, position),
  unique (id, organization_id),
  constraint os_checklist_items_position_positive check (position > 0)
);

create table public.os_training_paths (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  role_id uuid references public.os_roles(id) on delete set null,
  title text not null,
  code text not null,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  canonical_knowledge_id uuid references public.os_canonical_knowledge(id) on delete set null,
  title text not null,
  code text not null,
  estimated_minutes integer,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint os_lessons_estimated_minutes_positive check (estimated_minutes is null or estimated_minutes > 0)
);

create table public.os_training_path_lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  training_path_id uuid not null references public.os_training_paths(id) on delete cascade,
  lesson_id uuid not null references public.os_lessons(id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_path_id, lesson_id),
  unique (training_path_id, position),
  unique (id, organization_id),
  constraint os_training_path_lessons_position_positive check (position > 0)
);

create table public.os_quizzes (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  lesson_id uuid references public.os_lessons(id) on delete cascade,
  title text not null,
  passing_score_percent integer not null default 80,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_quizzes_passing_score_range check (passing_score_percent between 0 and 100)
);

create table public.os_quiz_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  quiz_id uuid not null references public.os_quizzes(id) on delete cascade,
  position integer not null,
  question text not null,
  options jsonb not null,
  correct_option_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quiz_id, position),
  unique (id, organization_id),
  constraint os_quiz_questions_position_positive check (position > 0),
  constraint os_quiz_questions_options_array check (jsonb_typeof(options) = 'array')
);

create table public.os_certifications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role_id uuid references public.os_roles(id) on delete set null,
  training_path_id uuid references public.os_training_paths(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status public.os_record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_certifications_expiry_after_issue check (expires_at is null or expires_at > issued_at)
);

create table public.os_audits (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  location_id uuid references public.os_locations(id) on delete set null,
  checklist_id uuid references public.os_checklists(id) on delete set null,
  auditor_id uuid references auth.users(id) on delete set null,
  title text not null,
  status public.os_audit_status not null default 'planned',
  scheduled_at timestamptz,
  completed_at timestamptz,
  score_percent integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint os_audits_score_range check (score_percent is null or score_percent between 0 and 100)
);

create table public.os_audit_findings (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  audit_id uuid not null references public.os_audits(id) on delete cascade,
  checklist_item_id uuid references public.os_checklist_items(id) on delete set null,
  finding text not null,
  severity public.os_incident_severity not null default 'low',
  corrective_action text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.os_incidents (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  location_id uuid references public.os_locations(id) on delete set null,
  station_id uuid references public.os_stations(id) on delete set null,
  process_id uuid references public.os_processes(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null,
  severity public.os_incident_severity not null default 'medium',
  status public.os_incident_status not null default 'open',
  occurred_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.os_ai_agents (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  purpose text not null,
  can_read_approved_knowledge boolean not null default true,
  status public.os_record_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.os_approvals (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  object_type public.os_operational_object_type not null,
  object_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  status public.os_approval_status not null default 'requested',
  reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.os_evidence_links (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  object_type public.os_operational_object_type not null,
  object_id uuid not null,
  source_section_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_type, object_id, source_section_id),
  unique (id, organization_id),
  constraint os_evidence_links_section_org_fk foreign key (source_section_id, organization_id) references public.os_source_sections(id, organization_id) on delete restrict
);

create table public.os_coverage_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.os_organizations(id) on delete cascade,
  object_type public.os_operational_object_type not null,
  object_id uuid not null,
  required_evidence_count integer not null default 1,
  linked_evidence_count integer not null default 0,
  status public.os_coverage_status not null default 'missing',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, object_type, object_id),
  unique (id, organization_id),
  constraint os_coverage_items_counts_non_negative check (required_evidence_count >= 0 and linked_evidence_count >= 0)
);

create view public.os_ai_approved_knowledge
with (security_invoker = true) as
select
  k.organization_id,
  k.id as knowledge_id,
  k.slug,
  k.title,
  k.summary,
  v.id as version_id,
  v.version_number,
  v.body,
  v.approved_at
from public.os_canonical_knowledge k
join public.os_knowledge_versions v on v.id = k.current_approved_version_id
where k.status = 'active' and v.status = 'approved';
