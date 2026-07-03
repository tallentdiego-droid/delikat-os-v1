create type public.os_membership_role as enum ('owner', 'admin', 'manager', 'trainer', 'operator', 'auditor');
create type public.os_record_status as enum ('draft', 'active', 'archived');
create type public.os_knowledge_version_status as enum ('draft', 'in_review', 'approved', 'deprecated');
create type public.os_approval_status as enum ('requested', 'approved', 'rejected', 'cancelled');
create type public.os_audit_status as enum ('planned', 'in_progress', 'passed', 'failed', 'cancelled');
create type public.os_incident_severity as enum ('low', 'medium', 'high', 'critical');
create type public.os_incident_status as enum ('open', 'investigating', 'resolved', 'closed');
create type public.os_coverage_status as enum ('missing', 'partial', 'covered', 'stale');
create type public.os_source_manual_type as enum ('manual', 'policy', 'recipe', 'vendor_document', 'regulatory', 'other');
create type public.os_operational_object_type as enum (
  'organization', 'location', 'department', 'station', 'role', 'process', 'sop',
  'checklist', 'checklist_item', 'training_path', 'lesson', 'quiz',
  'certification', 'audit', 'incident', 'ai_agent', 'approval',
  'coverage_item', 'canonical_knowledge', 'knowledge_version'
);
