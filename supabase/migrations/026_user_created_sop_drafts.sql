-- New SOP drafts are user-created records, not imported manuals.
-- This column lets the workspace distinguish imported SOPs from
-- edited imported SOPs and user-created drafts without changing evidence.

alter table public.os_canonical_knowledge
  add column if not exists source_type text not null default 'imported';

comment on column public.os_canonical_knowledge.source_type is
  'Origin of the SOP record: imported or user_created.';

