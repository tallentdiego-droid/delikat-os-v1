-- Authenticated users need the same approved knowledge read path as anon users
-- so manual Knowledge Graph creation can validate source and target objects
-- without requiring tenant membership rows.

grant select on table public.os_canonical_knowledge to authenticated;
grant select on table public.os_knowledge_versions to authenticated;
grant select on table public.os_evidence_links to authenticated;
grant select on table public.os_source_sections to authenticated;
grant select on table public.os_source_manuals to authenticated;

create policy os_canonical_knowledge_authenticated_active_select
on public.os_canonical_knowledge
for select
to authenticated
using (
  status = 'active'
  and current_approved_version_id is not null
);

create policy os_knowledge_versions_authenticated_current_approved_select
on public.os_knowledge_versions
for select
to authenticated
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

create policy os_evidence_links_authenticated_approved_knowledge_select
on public.os_evidence_links
for select
to authenticated
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

create policy os_source_sections_authenticated_approved_knowledge_select
on public.os_source_sections
for select
to authenticated
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

create policy os_source_manuals_authenticated_approved_knowledge_select
on public.os_source_manuals
for select
to authenticated
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
