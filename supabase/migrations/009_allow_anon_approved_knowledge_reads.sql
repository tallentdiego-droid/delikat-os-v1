-- Allow the public browser client to read the approved Delikat knowledge graph.
-- These policies grant SELECT only to anon and rely on existing RLS for row limits.
-- No INSERT, UPDATE, DELETE, or service-role access is added here.

grant select on table public.os_canonical_knowledge to anon;
grant select on table public.os_knowledge_versions to anon;
grant select on table public.os_evidence_links to anon;
grant select on table public.os_source_sections to anon;
grant select on table public.os_source_manuals to anon;

-- Canonical knowledge is visible only when it is active and points at a current
-- version. The linked version policy below restricts readable bodies to the
-- approved version that is currently attached to this active knowledge row.
create policy os_canonical_knowledge_anon_active_select
on public.os_canonical_knowledge
for select
to anon
using (
  status = 'active'
  and current_approved_version_id is not null
);

-- Expose only approved versions that are the current approved version of an
-- active canonical knowledge object in the same organization.
create policy os_knowledge_versions_anon_current_approved_select
on public.os_knowledge_versions
for select
to anon
using (
  status = 'approved'
  and exists (
    select 1
    from public.os_canonical_knowledge k
    where k.id = os_knowledge_versions.knowledge_id
      and k.organization_id = os_knowledge_versions.organization_id
      and k.status = 'active'
      and k.current_approved_version_id = os_knowledge_versions.id
  )
);

-- Evidence links are readable only when they point from active canonical
-- knowledge to its current approved version path.
create policy os_evidence_links_anon_approved_knowledge_select
on public.os_evidence_links
for select
to anon
using (
  object_type = 'canonical_knowledge'
  and exists (
    select 1
    from public.os_canonical_knowledge k
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where k.id = os_evidence_links.object_id
      and k.organization_id = os_evidence_links.organization_id
      and k.status = 'active'
      and v.status = 'approved'
  )
);

-- Source sections are readable only when cited by evidence attached to active
-- canonical knowledge with a current approved version.
create policy os_source_sections_anon_approved_knowledge_select
on public.os_source_sections
for select
to anon
using (
  exists (
    select 1
    from public.os_evidence_links e
    join public.os_canonical_knowledge k
      on k.id = e.object_id
      and k.organization_id = e.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where e.source_section_id = os_source_sections.id
      and e.organization_id = os_source_sections.organization_id
      and e.object_type = 'canonical_knowledge'
      and k.status = 'active'
      and v.status = 'approved'
  )
);

-- Source manuals are readable only when they contain a source section that is
-- cited by evidence attached to active canonical knowledge with a current
-- approved version.
create policy os_source_manuals_anon_approved_knowledge_select
on public.os_source_manuals
for select
to anon
using (
  exists (
    select 1
    from public.os_source_sections s
    join public.os_evidence_links e
      on e.source_section_id = s.id
      and e.organization_id = s.organization_id
    join public.os_canonical_knowledge k
      on k.id = e.object_id
      and k.organization_id = e.organization_id
    join public.os_knowledge_versions v
      on v.id = k.current_approved_version_id
      and v.knowledge_id = k.id
      and v.organization_id = k.organization_id
    where s.manual_id = os_source_manuals.id
      and s.organization_id = os_source_manuals.organization_id
      and e.object_type = 'canonical_knowledge'
      and k.status = 'active'
      and v.status = 'approved'
  )
);
